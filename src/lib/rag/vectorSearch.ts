// src/lib/rag/vectorSearch.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { RetrievedChunk } from '@/types/database';

export interface VectorSearchParams {
  supabase: SupabaseClient;
  queryEmbedding: number[];
  userId: string;
  documentId?: string | null;
  topK?: number;
  similarityThreshold?: number;
}

/**
 * Executes cosine similarity search using pgvector via the match_document_chunks RPC function.
 * Strictly scopes results to the authenticated user's documents.
 */
export async function performVectorSearch({
  supabase,
  queryEmbedding,
  userId,
  documentId = null,
  topK = 5,
  similarityThreshold = 0.2,
}: VectorSearchParams): Promise<RetrievedChunk[]> {
  const threshold = similarityThreshold ?? Number(process.env.RAG_SIMILARITY_THRESHOLD) ?? 0.2;
  const count = topK ?? Number(process.env.RAG_TOP_K) ?? 5;

  const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    filter_user_id: userId,
    filter_document_id: documentId || null,
    match_threshold: threshold,
    match_count: count,
  });

  if (error) {
    throw new Error(`Vector similarity search failed: ${error.message}`);
  }

  if (!chunks || chunks.length === 0) {
    return [];
  }

  // Enrich chunks with document filenames if available
  const docIds = Array.from(new Set(chunks.map((c: any) => c.document_id)));
  const { data: docs } = await supabase
    .from('documents')
    .select('id, original_filename')
    .in('id', docIds);

  const docNameMap = new Map<string, string>();
  if (docs) {
    for (const doc of docs) {
      docNameMap.set(doc.id, doc.original_filename);
    }
  }

  return chunks.map((chunk: any) => ({
    id: chunk.id,
    document_id: chunk.document_id,
    document_name: docNameMap.get(chunk.document_id) || 'Document',
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    page_number: chunk.page_number,
    metadata: chunk.metadata || {},
    similarity: Math.round(chunk.similarity * 1000) / 1000,
  }));
}
