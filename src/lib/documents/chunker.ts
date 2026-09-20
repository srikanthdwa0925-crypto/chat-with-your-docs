// src/lib/documents/chunker.ts
import { ExtractedPage } from './extractor';
import { cleanDocumentText } from './cleaner';

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
}

export interface GeneratedChunk {
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  metadata: {
    startChar: number;
    endChar: number;
    wordCount: number;
    pageNumber: number | null;
  };
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 150;
const MIN_CHUNK_SIZE = 50;

/**
 * Splits document pages into semantic chunks respecting paragraph and sentence boundaries.
 */
export function chunkDocumentPages(
  pages: ExtractedPage[],
  options: ChunkOptions = {}
): GeneratedChunk[] {
  const chunkSize = options.chunkSize || Number(process.env.RAG_CHUNK_SIZE) || DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap || Number(process.env.RAG_CHUNK_OVERLAP) || DEFAULT_CHUNK_OVERLAP;
  const minSize = options.minChunkSize || MIN_CHUNK_SIZE;

  const allChunks: GeneratedChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const cleanedText = cleanDocumentText(page.text);
    if (!cleanedText || cleanedText.length < minSize) {
      if (cleanedText && cleanedText.length > 0) {
        // Keep even small pages if they contain substantive words
        allChunks.push({
          chunkIndex: globalChunkIndex++,
          content: cleanedText,
          pageNumber: page.pageNumber,
          metadata: {
            startChar: 0,
            endChar: cleanedText.length,
            wordCount: cleanedText.split(/\s+/).filter(Boolean).length,
            pageNumber: page.pageNumber,
          },
        });
      }
      continue;
    }

    const pageChunks = recursiveSplitText(cleanedText, chunkSize, chunkOverlap);

    for (const chunkText of pageChunks) {
      if (chunkText.trim().length < minSize && allChunks.length > 0) {
        // If chunk is too small, try appending to previous chunk if within size
        const prev = allChunks[allChunks.length - 1];
        if (prev && (prev.content.length + chunkText.length) <= chunkSize * 1.3) {
          prev.content = `${prev.content}\n\n${chunkText}`;
          prev.metadata.endChar += chunkText.length;
          prev.metadata.wordCount = prev.content.split(/\s+/).filter(Boolean).length;
          continue;
        }
      }

      allChunks.push({
        chunkIndex: globalChunkIndex++,
        content: chunkText,
        pageNumber: page.pageNumber,
        metadata: {
          startChar: 0,
          endChar: chunkText.length,
          wordCount: chunkText.split(/\s+/).filter(Boolean).length,
          pageNumber: page.pageNumber,
        },
      });
    }
  }

  return allChunks;
}

/**
 * Recursively splits text using semantic boundaries (paragraphs -> sentences -> words).
 */
function recursiveSplitText(
  text: string,
  maxSize: number,
  overlap: number,
  separators: string[] = ['\n\n', '\n', '. ', '! ', '? ', '; ', ' ', '']
): string[] {
  const result: string[] = [];

  if (text.length <= maxSize) {
    return [text];
  }

  // Choose the most appropriate separator present in text
  let chosenSeparator = separators[separators.length - 1];
  for (const sep of separators) {
    if (text.includes(sep)) {
      chosenSeparator = sep;
      break;
    }
  }

  const splits = chosenSeparator ? text.split(chosenSeparator) : text.split('');
  let currentChunk = '';

  for (let i = 0; i < splits.length; i++) {
    const part = splits[i];
    const candidate = currentChunk
      ? currentChunk + (chosenSeparator || '') + part
      : part;

    if (candidate.length <= maxSize) {
      currentChunk = candidate;
    } else {
      if (currentChunk.trim().length > 0) {
        result.push(currentChunk.trim());
      }

      // Compute overlapping prefix from end of currentChunk
      if (overlap > 0 && currentChunk.length > overlap) {
        const overlapSlice = currentChunk.slice(-overlap);
        currentChunk = overlapSlice + (chosenSeparator || '') + part;
      } else {
        currentChunk = part;
      }

      // If a single segment is still larger than maxSize, break it down further
      if (currentChunk.length > maxSize) {
        const nextSeparators = separators.slice(separators.indexOf(chosenSeparator) + 1);
        if (nextSeparators.length > 0) {
          const subChunks = recursiveSplitText(currentChunk, maxSize, overlap, nextSeparators);
          result.push(...subChunks.slice(0, -1));
          currentChunk = subChunks[subChunks.length - 1] || '';
        }
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    result.push(currentChunk.trim());
  }

  return result;
}
