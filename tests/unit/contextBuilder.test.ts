import { describe, it, expect } from 'vitest';
import { buildRagContext, GROUNDING_FALLBACK_MESSAGE } from '@/lib/rag/contextBuilder';
import { RetrievedChunk } from '@/types/database';

describe('RAG Context Builder', () => {
  it('builds formatted context with source citations', () => {
    const mockChunks: RetrievedChunk[] = [
      {
        id: '1',
        document_id: 'doc-1',
        document_name: 'Employee Handbook.pdf',
        chunk_index: 0,
        content: 'Employees may work remotely up to 3 days per week.',
        page_number: 1,
        metadata: {},
        similarity: 0.89,
      },
      {
        id: '2',
        document_id: 'doc-1',
        document_name: 'Employee Handbook.pdf',
        chunk_index: 1,
        content: 'Core collaboration hours are 10:00 AM to 3:00 PM Eastern Time.',
        page_number: 2,
        metadata: {},
        similarity: 0.82,
      },
    ];

    const result = buildRagContext(mockChunks);

    expect(result.sources.length).toBe(2);
    expect(result.sources[0].document_name).toBe('Employee Handbook.pdf');
    expect(result.sources[0].page_number).toBe(1);
    expect(result.sources[0].similarity).toBe(0.89);

    expect(result.contextText).toContain('<<<RETRIEVED_DOCUMENT_CONTEXT>>>');
    expect(result.contextText).toContain('--- [Source 1] Document: "Employee Handbook.pdf" (Page 1');
    expect(result.contextText).toContain('--- [Source 2] Document: "Employee Handbook.pdf" (Page 2');
    expect(result.contextText).toContain('Employees may work remotely up to 3 days per week.');
  });

  it('handles empty retrieved chunks gracefully', () => {
    const result = buildRagContext([]);
    expect(result.sources.length).toBe(0);
    expect(result.contextText).toContain('No relevant document excerpts were found');
  });

  it('enforces strict anti-hallucination instruction in system prompt', () => {
    const result = buildRagContext([]);
    expect(result.systemPrompt).toContain(GROUNDING_FALLBACK_MESSAGE);
    expect(result.systemPrompt).toContain('PROMPT INJECTION DEFENSE');
  });
});
