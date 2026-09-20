// src/lib/documents/extractor.ts
import { extractText } from 'unpdf';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  totalPages: number;
  pages: ExtractedPage[];
  rawText: string;
}

/**
 * Extracts text from a document buffer (PDF, TXT, MD) preserving page numbers where applicable.
 */
export async function extractDocumentText(
  buffer: Buffer | Uint8Array,
  filename: string,
  mimeType: string
): Promise<ExtractionResult> {
  const extension = '.' + filename.split('.').pop()?.toLowerCase();

  if (extension === '.pdf' || mimeType === 'application/pdf') {
    return extractFromPdf(buffer);
  } else if (
    extension === '.txt' || 
    extension === '.md' || 
    mimeType.startsWith('text/') || 
    mimeType === 'application/octet-stream'
  ) {
    return extractFromPlainText(buffer);
  } else {
    throw new Error(`Unsupported document format: ${filename} (${mimeType})`);
  }
}

async function extractFromPdf(buffer: Buffer | Uint8Array): Promise<ExtractionResult> {
  try {
    const byteOffset = buffer.byteOffset || 0;
    const byteLength = buffer.byteLength || buffer.length || 0;
    const uint8Array = new Uint8Array(
      buffer.buffer.slice(byteOffset, byteOffset + byteLength)
    );
    const result = await extractText(uint8Array, { mergePages: false });

    const pages: ExtractedPage[] = [];
    const textArray = Array.isArray(result.text) ? result.text : [result.text];

    for (let i = 0; i < textArray.length; i++) {
      const pageText = textArray[i] || '';
      pages.push({
        pageNumber: i + 1,
        text: pageText,
      });
    }

    const totalPages = result.totalPages || pages.length;
    const rawText = pages.map((p) => p.text).join('\n\n');

    if (rawText.trim().length === 0) {
      throw new Error('PDF file appears to be empty or contains scanned images without an OCR text layer.');
    }

    return {
      totalPages,
      pages,
      rawText,
    };
  } catch (error: any) {
    if (error.name === 'PasswordException') {
      throw new Error('PDF is encrypted or password-protected and cannot be processed.');
    }
    throw new Error(`PDF text extraction failed: ${error.message || 'Unknown parsing error'}`);
  }
}

function extractFromPlainText(buffer: Buffer | Uint8Array): ExtractionResult {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(buffer);

    if (text.trim().length === 0) {
      throw new Error('The text document is empty.');
    }

    return {
      totalPages: 1,
      pages: [
        {
          pageNumber: 1,
          text,
        },
      ],
      rawText: text,
    };
  } catch (error: any) {
    throw new Error(`Plain text extraction failed: ${error.message}`);
  }
}
