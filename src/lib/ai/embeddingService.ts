// src/lib/ai/embeddingService.ts
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export interface EmbeddingOptions {
  provider?: 'gemini' | 'openai';
  model?: string;
  batchSize?: number;
}

export class EmbeddingService {
  private provider: 'gemini' | 'openai';
  private geminiClient: GoogleGenAI | null = null;
  private openaiClient: OpenAI | null = null;
  private modelName: string;

  constructor(options: EmbeddingOptions = {}) {
    this.provider = options.provider || 
      (process.env.LLM_PROVIDER?.toLowerCase() === 'openai' ? 'openai' : 'gemini');

    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey !== 'placeholder-key') {
        this.openaiClient = new OpenAI({ apiKey });
      }
      this.modelName = options.model || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'placeholder-gemini-key') {
        this.geminiClient = new GoogleGenAI({ apiKey });
      }
      this.modelName = options.model || process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
    }
  }

  /**
   * Generates embedding vector for a single text query.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    if (!embeddings || embeddings.length === 0) {
      throw new Error('Failed to generate embedding: empty response from provider.');
    }
    return embeddings[0];
  }

  /**
   * Generates embedding vectors for a batch of text chunks with rate-limit and retry handling.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    if (this.provider === 'openai') {
      return this.generateOpenAIEmbeddings(texts);
    } else {
      return this.generateGeminiEmbeddings(texts);
    }
  }

  private async generateGeminiEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.startsWith('placeholder')) {
        throw new Error('GEMINI_API_KEY is not configured. Please set your Gemini API key in environment variables.');
      }
      this.geminiClient = new GoogleGenAI({ apiKey });
    }

    const results: number[][] = [];
    const BATCH_SIZE = 5; // Process in small concurrent batches

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      let attempts = 0;
      let success = false;

      while (!success && attempts < 3) {
        try {
          attempts++;
          const promises = batch.map((text) =>
            this.geminiClient!.models.embedContent({
              model: this.modelName,
              contents: text.slice(0, 8000),
              config: {
                outputDimensionality: 768,
              },
            })
          );

          const responses = await Promise.all(promises);

          for (const res of responses) {
            const values = res.embeddings?.[0]?.values;

            if (!values) {
              throw new Error('Failed to generate Gemini embedding');
            }

            results.push(values);
          }
          success = true;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          if (attempts >= 3) {
            throw new Error(`Gemini embedding batch failed after 3 attempts: ${message}`);
          }
          await new Promise((res) => setTimeout(res, 1000 * attempts));
        }
      }
    }

    return results;
  }

  private async generateOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.startsWith('placeholder')) {
        throw new Error('OPENAI_API_KEY is not configured. Please set your OpenAI API key in environment variables.');
      }
      this.openaiClient = new OpenAI({ apiKey });
    }

    const results: number[][] = [];
    const BATCH_SIZE = 50;

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, 8000));

      let attempts = 0;
      let success = false;

      while (!success && attempts < 3) {
        try {
          attempts++;
          const response = await this.openaiClient.embeddings.create({
            model: this.modelName,
            input: batch,
          });

          for (const item of response.data) {
            results.push(item.embedding);
          }
          success = true;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          if (attempts >= 3) {
            throw new Error(`OpenAI embedding batch failed after 3 attempts: ${message}`);
          }
          await new Promise((res) => setTimeout(res, 1000 * attempts));
        }
      }
    }

    return results;
  }
}

export const defaultEmbeddingService = new EmbeddingService();
