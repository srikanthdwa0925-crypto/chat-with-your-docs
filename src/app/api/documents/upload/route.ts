// src/app/api/documents/upload/route.ts
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/api/response';
import { validateFileUpload } from '@/lib/validation/schemas';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', authError || 'Authentication required.', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('BAD_REQUEST', 'No file provided in form data.', 400);
    }

    const validation = validateFileUpload({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return errorResponse('INVALID_FILE', validation.error || 'Invalid file.', 400);
    }

    const documentId = crypto.randomUUID();
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${documentId}/${cleanFilename}`;

    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Auto-create 'documents' bucket if it doesn't exist yet
    try {
      const { data: buckets } = await adminSupabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.id === 'documents' || b.name === 'documents');
      if (!bucketExists) {
        await adminSupabase.storage.createBucket('documents', {
          public: false,
          fileSizeLimit: 26214400,
        });
      }
    } catch {
      // Bucket check error ignored, proceed to upload attempt
    }

    // Convert file to arrayBuffer and upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminSupabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return errorResponse('STORAGE_ERROR', `Failed to store file: ${uploadError.message}`, 500);
    }

    // Insert record into documents table
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: user.id,
        filename: cleanFilename,
        original_filename: file.name,
        file_type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
        file_size: file.size,
        storage_path: storagePath,
        status: 'UPLOADED',
        error_message: null,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage upload if DB insert fails
      await supabase.storage.from('documents').remove([storagePath]);
      return errorResponse('DATABASE_ERROR', `Failed to save document metadata: ${dbError.message}`, 500);
    }

    return successResponse(document, 201);
  } catch (err: any) {
    return errorResponse('INTERNAL_SERVER_ERROR', err.message || 'An unexpected error occurred.', 500);
  }
}
