// src/app/api/documents/[id]/route.ts
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !document) {
      return errorResponse('NOT_FOUND', 'Document not found or access denied.', 404);
    }

    return successResponse(document);
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

    const documentId = params.id;
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // 1. Fetch document to ensure ownership and get storage path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, storage_path, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !document) {
      return errorResponse('NOT_FOUND', 'Document not found or access denied.', 404);
    }

    // 2. Delete storage object
    if (document.storage_path) {
      await supabase.storage.from('documents').remove([document.storage_path]);
    }

    // 3. Delete document chunks (explicit cleanup before deleting document)
    await adminSupabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    // 4. Update linked conversations to detach document_id
    await adminSupabase
      .from('conversations')
      .update({ document_id: null })
      .eq('document_id', documentId);

    // 5. Delete document record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id);

    if (deleteError) {
      return errorResponse('DATABASE_ERROR', `Failed to delete document: ${deleteError.message}`, 500);
    }

    return successResponse({ id: documentId, deleted: true });
  } catch (err: any) {
    return errorResponse('INTERNAL_SERVER_ERROR', err.message, 500);
  }
}
