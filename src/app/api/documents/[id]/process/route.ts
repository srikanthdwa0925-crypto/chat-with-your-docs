// src/app/api/documents/[id]/process/route.ts
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/serverAuth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/api/response';
import { extractDocumentText } from '@/lib/documents/extractor';
import { chunkDocumentPages } from '@/lib/documents/chunker';
import { defaultEmbeddingService } from '@/lib/ai/embeddingService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id;

  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', authError || 'Authentication required.', 401);
    }

    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // 1. Fetch document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return errorResponse('NOT_FOUND', 'Document not found or access denied.', 404);
    }

    // 2. Mark status as PROCESSING
    await adminSupabase
      .from('documents')
      .update({ status: 'PROCESSING', error_message: null })
      .eq('id', documentId);

    // 3. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      const msg = `Failed to download file from storage: ${downloadError?.message}`;
      await adminSupabase
        .from('documents')
        .update({ status: 'FAILED', error_message: msg })
        .eq('id', documentId);
      return errorResponse('STORAGE_DOWNLOAD_ERROR', msg, 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Extract Text with Page Awareness
    let extraction;
    try {
      extraction = await extractDocumentText(buffer, document.original_filename, document.file_type);
    } catch (extractError: any) {
      const msg = extractError.message || 'Text extraction failed.';
      await adminSupabase
        .from('documents')
        .update({ status: 'FAILED', error_message: msg })
        .eq('id', documentId);
      return errorResponse('EXTRACTION_FAILED', msg, 422);
    }

    // 5. Chunk Document Pages
    const chunks = chunkDocumentPages(extraction.pages);
    if (chunks.length === 0) {
      const msg = 'No extractable text chunks could be generated from document.';
      await adminSupabase
        .from('documents')
        .update({ status: 'FAILED', error_message: msg })
        .eq('id', documentId);
      return errorResponse('CHUNKING_FAILED', msg, 422);
    }

    // 6. Generate Vector Embeddings
    await adminSupabase
      .from('documents')
      .update({ status: 'EMBEDDING' })
      .eq('id', documentId);

    const chunkTexts = chunks.map((c) => c.content);
    let embeddings: number[][];
    try {
      embeddings = await defaultEmbeddingService.generateEmbeddings(chunkTexts);
    } catch (embedError: any) {
      const msg = `Embedding generation failed: ${embedError.message}`;
      await adminSupabase
        .from('documents')
        .update({ status: 'FAILED', error_message: msg })
        .eq('id', documentId);
      return errorResponse('EMBEDDING_FAILED', msg, 500);
    }

    // 7. Clear old chunks (if re-processing) and insert new chunks
    await adminSupabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    const chunkRows = chunks.map((chunk, index) => ({
      document_id: documentId,
      user_id: user.id,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      page_number: chunk.pageNumber,
      metadata: chunk.metadata,
      embedding: embeddings[index] || null,
    }));

    // Insert in batches of 50 to avoid Postgres payload limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunkRows.length; i += BATCH_SIZE) {
      const batch = chunkRows.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await adminSupabase
        .from('document_chunks')
        .insert(batch);

      if (insertError) {
        throw new Error(`Failed to store chunks in database: ${insertError.message}`);
      }
    }

    // 8. Update document to READY
    const { data: updatedDoc, error: updateError } = await adminSupabase
      .from('documents')
      .update({
        status: 'READY',
        page_count: extraction.totalPages,
        chunk_count: chunks.length,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) {
      return errorResponse('DATABASE_ERROR', updateError.message, 500);
    }

    return successResponse({
      document: updatedDoc,
      chunksProcessed: chunks.length,
      pagesProcessed: extraction.totalPages,
    });
  } catch (err: any) {
    return errorResponse('PROCESSING_ERROR', err.message || 'An error occurred during processing.', 500);
  }
}
