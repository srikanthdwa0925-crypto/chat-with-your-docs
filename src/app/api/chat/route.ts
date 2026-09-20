// src/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/api/response';
import { chatRequestSchema } from '@/lib/validation/schemas';
import { defaultEmbeddingService } from '@/lib/ai/embeddingService';
import { performVectorSearch } from '@/lib/rag/vectorSearch';
import { buildRagContext } from '@/lib/rag/contextBuilder';
import { defaultLLMService, ChatMessageInput } from '@/lib/ai/llmService';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', authError || 'Authentication required.', 401);
    }

    const body = await request.json();
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', parseResult.error.errors[0].message, 400);
    }

    const { message: question, conversationId: reqConvId, documentId: reqDocId, stream = true } = parseResult.data;
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // 1. Resolve or create conversation
    let conversationId = reqConvId;
    let targetDocId = reqDocId;

    if (conversationId) {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (convError || !conv) {
        return errorResponse('NOT_FOUND', 'Conversation not found or access denied.', 404);
      }
      if (!targetDocId && conv.document_id) {
        targetDocId = conv.document_id;
      }
    } else {
      const title = question.slice(0, 40) + (question.length > 40 ? '...' : '');
      const { data: newConv, error: newConvError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          document_id: targetDocId || null,
          title,
        })
        .select()
        .single();

      if (newConvError || !newConv) {
        return errorResponse('DATABASE_ERROR', `Failed to create conversation: ${newConvError?.message}`, 500);
      }
      conversationId = newConv.id;
    }

    // 2. Fetch recent conversation history (last 6 messages) for multi-turn context
    const { data: pastMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(6);

    const history: ChatMessageInput[] = (pastMessages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. Generate Question Embedding
    let queryEmbedding: number[];
    try {
      queryEmbedding = await defaultEmbeddingService.generateEmbedding(question);
    } catch (embedError: any) {
      return errorResponse('EMBEDDING_ERROR', `Failed to embed question: ${embedError.message}`, 500);
    }

    // 4. Perform Vector Similarity Search
    let retrievedChunks;
    try {
      retrievedChunks = await performVectorSearch({
        supabase,
        queryEmbedding,
        userId: user.id,
        documentId: targetDocId,
      });
    } catch (searchError: any) {
      return errorResponse('SEARCH_ERROR', `Vector search failed: ${searchError.message}`, 500);
    }

    // 5. Build Context and System Prompt with Anti-Hallucination & Prompt Injection Defense
    const ragContext = buildRagContext(retrievedChunks);

    // 6. Persist the User's Message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'user',
      content: question,
      sources: [],
    });

    // Touch conversation updated_at
    await adminSupabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // 7. Generate Response (Streaming or JSON)
    if (!stream) {
      const fullAnswer = await defaultLLMService.generateText({
        systemPrompt: ragContext.systemPrompt,
        contextText: ragContext.contextText,
        question,
        history,
      });

      // Save assistant message
      const { data: assistantMsg } = await adminSupabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'assistant',
          content: fullAnswer,
          sources: ragContext.sources,
        })
        .select()
        .single();

      return successResponse({
        conversationId,
        message: assistantMsg,
        sources: ragContext.sources,
      });
    }

    // Streaming SSE Response
    const textStream = await defaultLLMService.generateStream({
      systemPrompt: ragContext.systemPrompt,
      contextText: ragContext.contextText,
      question,
      history,
    });

    const encoder = new TextEncoder();
    let accumulatedContent = '';

    const sseStream = new ReadableStream({
      async start(controller) {
        // First event: metadata with sources and conversationId
        const metaEvent = `data: ${JSON.stringify({
          type: 'meta',
          conversationId,
          sources: ragContext.sources,
        })}\n\n`;
        controller.enqueue(encoder.encode(metaEvent));

        const reader = textStream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            accumulatedContent += value;
            const chunkEvent = `data: ${JSON.stringify({
              type: 'token',
              content: value,
            })}\n\n`;
            controller.enqueue(encoder.encode(chunkEvent));
          }

          // Final event: done
          const doneEvent = `data: ${JSON.stringify({
            type: 'done',
            fullContent: accumulatedContent,
          })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));

          // Save assistant message to database
          if (accumulatedContent.trim().length > 0) {
            await adminSupabase.from('messages').insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: 'assistant',
              content: accumulatedContent,
              sources: ragContext.sources,
            });
          }

          controller.close();
        } catch (err: any) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: err.message || 'Stream generation failed',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return errorResponse('INTERNAL_SERVER_ERROR', err.message || 'An unexpected error occurred.', 500);
  }
}
