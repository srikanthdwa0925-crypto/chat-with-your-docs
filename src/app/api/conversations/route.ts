// src/app/api/conversations/route.ts
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';
import { createConversationSchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', authError || 'Authentication required.', 401);
    }

    const supabase = createClient();
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        document_id,
        created_at,
        updated_at,
        document:documents(id, filename, original_filename)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return errorResponse('DATABASE_ERROR', error.message, 500);
    }

    return successResponse(conversations || []);
  } catch (err: any) {
    return errorResponse('INTERNAL_SERVER_ERROR', err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', authError || 'Authentication required.', 401);
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = createConversationSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', parseResult.error.errors[0].message, 400);
    }

    const { title, documentId } = parseResult.data;
    const supabase = createClient();

    // If documentId provided, verify it belongs to user
    if (documentId) {
      const { data: doc } = await supabase
        .from('documents')
        .select('id')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (!doc) {
        return errorResponse('NOT_FOUND', 'Linked document does not exist or access denied.', 404);
      }
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        document_id: documentId || null,
        title: title || 'New Conversation',
      })
      .select(`
        id,
        title,
        document_id,
        created_at,
        updated_at,
        document:documents(id, filename, original_filename)
      `)
      .single();

    if (error) {
      return errorResponse('DATABASE_ERROR', error.message, 500);
    }

    return successResponse(conversation, 201);
  } catch (err: any) {
    return errorResponse('INTERNAL_SERVER_ERROR', err.message, 500);
  }
}
