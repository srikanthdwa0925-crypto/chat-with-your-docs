// src/lib/documents/cleaner.ts

/**
 * Cleans raw extracted text by removing control characters, excessive whitespace,
 * and page break artifacts while preserving paragraph structure, headings, and code.
 */
export function cleanDocumentText(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Replace carriage returns with standard line feed
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace form feed characters (often inserted on page transitions) with linebreaks
    .replace(/\f/g, '\n\n')
    // Replace null bytes and non-printable control characters (except \t and \n)
    .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, '')
    // Normalize unicode non-breaking spaces
    .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    // Replace consecutive horizontal tabs/spaces with a single space
    .replace(/[ \t]{2,}/g, ' ')
    // Trim trailing whitespace from each line
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    // Reduce 3 or more consecutive newlines down to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}
