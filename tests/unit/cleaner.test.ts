import { describe, it, expect } from 'vitest';
import { cleanDocumentText } from '@/lib/documents/cleaner';

describe('Document Cleaner', () => {
  it('removes control characters and null bytes', () => {
    const raw = 'Hello\x00\x08World\x0B!';
    const cleaned = cleanDocumentText(raw);
    expect(cleaned).toBe('HelloWorld!');
  });

  it('normalizes excessive newlines to double newlines', () => {
    const raw = 'Header\n\n\n\n\nParagraph text\n\n\n\nFooter';
    const cleaned = cleanDocumentText(raw);
    expect(cleaned).toBe('Header\n\nParagraph text\n\nFooter');
  });

  it('handles carriage returns and form feeds', () => {
    const raw = 'Page 1\r\n\fPage 2\r\nContent';
    const cleaned = cleanDocumentText(raw);
    expect(cleaned).toBe('Page 1\n\nPage 2\nContent');
  });

  it('preserves markdown headers and bullet structures', () => {
    const raw = '# Title\n\n## Section 1\n- Item 1\n- Item 2';
    const cleaned = cleanDocumentText(raw);
    expect(cleaned).toContain('# Title');
    expect(cleaned).toContain('## Section 1');
    expect(cleaned).toContain('- Item 1');
  });

  it('handles empty or blank input gracefully', () => {
    expect(cleanDocumentText('')).toBe('');
    expect(cleanDocumentText('   \n\n   ')).toBe('');
  });
});
