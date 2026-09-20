import { describe, it, expect } from 'vitest';
import { chunkDocumentPages } from '@/lib/documents/chunker';
import { ExtractedPage } from '@/lib/documents/extractor';

describe('Document Chunker', () => {
  it('chunks multi-page documents and preserves page numbers', () => {
    const pages: ExtractedPage[] = [
      { pageNumber: 1, text: 'This is page one content with important introductory guidelines.' },
      { pageNumber: 2, text: 'This is page two content detailing technical specifications.' },
    ];

    const chunks = chunkDocumentPages(pages, { chunkSize: 200, chunkOverlap: 20 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].metadata.pageNumber).toBe(1);
    expect(chunks.some((c) => c.pageNumber === 2)).toBe(true);
  });

  it('splits long text paragraphs into overlapping segments', () => {
    const longText = 'Sentence number one. '.repeat(40);
    const pages: ExtractedPage[] = [{ pageNumber: 1, text: longText }];

    const chunks = chunkDocumentPages(pages, { chunkSize: 150, chunkOverlap: 30 });
    expect(chunks.length).toBeGreaterThan(1);

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
      expect(chunks[i].content.length).toBeGreaterThan(0);
    }
  });

  it('skips empty pages', () => {
    const pages: ExtractedPage[] = [
      { pageNumber: 1, text: '   ' },
      { pageNumber: 2, text: 'Valid page content.' },
    ];

    const chunks = chunkDocumentPages(pages);
    expect(chunks.length).toBe(1);
    expect(chunks[0].pageNumber).toBe(2);
  });
});
