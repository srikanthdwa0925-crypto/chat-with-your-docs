// src/app/api/conversations/[id]/route.ts
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', authError || 'Authentication required.', 401);
    }

    const supabase = createClient();
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        document_id,
        created_at,
        updated_at,
        document:documents(id, filename, original_filename)
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return errorResponse('NOT_FOUND', 'Conversation not found or access denied.', 404);
    }

    // Fetch messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', params.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      return errorResponse('DATABASE_ERROR', msgError.message, 500);
    }

    return successResponse({
      conversation,
      messages: messages || [],
    });
  } catch (err: any) {
    return errorResponse('INTERNAL_SERVER_ERROR', err.message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', authError || 'Authentication required.', 401);
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      return errorResponse('DATABASE_ERROR', error.message, 500);
    }

    return successResponse({ id: params.id, deleted: true });
  } catch (err: any) {
    return errorResponse('INTERNAL_SERVER_ERROR', err.message, 500);
  }
}
