import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractDocumentText } from '@/lib/documents/extractor';
import { chunkDocumentPages } from '@/lib/documents/chunker';
import { buildRagContext } from '@/lib/rag/contextBuilder';
import { RetrievedChunk } from '@/types/database';

describe('RAG Pipeline Integration', () => {
  it('processes sample handbook from raw text to chunks to formatted RAG context', async () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/sample-handbook.txt');
    const fileBuffer = fs.readFileSync(fixturePath);

    // 1. Extraction
    const extraction = await extractDocumentText(fileBuffer, 'sample-handbook.txt', 'text/plain');
    expect(extraction.totalPages).toBe(1);
    expect(extraction.rawText).toContain('Acme Corporation Employee Handbook');

    // 2. Chunking
    const chunks = chunkDocumentPages(extraction.pages, {
      chunkSize: 400,
      chunkOverlap: 50,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].pageNumber).toBe(1);

    // 3. Simulated Vector Retrieval
    const mockRetrieved: RetrievedChunk[] = chunks.slice(0, 2).map((c, i) => ({
      id: `chunk-${i}`,
      document_id: 'doc-handbook-1',
      document_name: 'sample-handbook.txt',
      chunk_index: c.chunkIndex,
      content: c.content,
      page_number: c.pageNumber,
      metadata: c.metadata,
      similarity: 0.85 - i * 0.05,
    }));

    // 4. Context Assembly
    const ragContext = buildRagContext(mockRetrieved);

    expect(ragContext.sources.length).toBe(2);
    expect(ragContext.sources[0].document_name).toBe('sample-handbook.txt');
    expect(ragContext.sources[0].page_number).toBe(1);
    expect(ragContext.contextText).toContain('<<<RETRIEVED_DOCUMENT_CONTEXT>>>');
    expect(ragContext.contextText).toContain('Remote Work and Flexible Hours Policy');
  });
});
