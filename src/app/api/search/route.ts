// src/app/api/search/route.ts
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';
import { searchRequestSchema } from '@/lib/validation/schemas';
import { defaultEmbeddingService } from '@/lib/ai/embeddingService';
import { performVectorSearch } from '@/lib/rag/vectorSearch';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', authError || 'Authentication required.', 401);
    }

    const body = await request.json();
    const parseResult = searchRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', parseResult.error.errors[0].message, 400);
    }

    const { query, documentId, topK, similarityThreshold } = parseResult.data;

    // 1. Generate query embedding
    let queryEmbedding: number[];
    try {
      queryEmbedding = await defaultEmbeddingService.generateEmbedding(query);
    } catch (embedError: any) {
      return errorResponse('EMBEDDING_ERROR', `Failed to embed query: ${embedError.message}`, 500);
    }

    // 2. Perform vector search strictly scoped to this user
    const supabase = createClient();
    const chunks = await performVectorSearch({
      supabase,
      queryEmbedding,
      userId: user.id,
      documentId: documentId || null,
      topK,
      similarityThreshold,
    });

    return successResponse({
      query,
      resultsCount: chunks.length,
      chunks,
    });
  } catch (err: any) {
    return errorResponse('INTERNAL_SERVER_ERROR', err.message, 500);
  }
}
