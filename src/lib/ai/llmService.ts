// src/lib/ai/llmService.ts
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamGenerationOptions {
  systemPrompt: string;
  contextText: string;
  question: string;
  history?: ChatMessageInput[];
  provider?: 'gemini' | 'openai';
  model?: string;
  temperature?: number;
}

const GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatProviderError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  const unwrap = (value: unknown, depth = 0): string | null => {
    if (depth > 4 || value == null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('{')) {
        try {
          return unwrap(JSON.parse(trimmed), depth + 1);
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return unwrap(record.error ?? record.message, depth + 1);
    }
    return String(value);
  };

  return unwrap(raw) || raw;
}

function isRetryableProviderError(error: unknown): boolean {
  const text = `${formatProviderError(error)} ${String(error)}`.toLowerCase();
  return (
    text.includes('503') ||
    text.includes('429') ||
    text.includes('unavailable') ||
    text.includes('high demand') ||
    text.includes('overloaded') ||
    text.includes('resource_exhausted') ||
    text.includes('rate limit') ||
    text.includes('too many requests')
  );
}

export class LLMService {
  private provider: 'gemini' | 'openai';
  private geminiClient: GoogleGenAI | null = null;
  private openaiClient: OpenAI | null = null;
  private modelName: string;

  constructor(options: { provider?: 'gemini' | 'openai'; model?: string } = {}) {
    this.provider = options.provider || 
      (process.env.LLM_PROVIDER?.toLowerCase() === 'openai' ? 'openai' : 'gemini');

    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey !== 'placeholder-key') {
        this.openaiClient = new OpenAI({ apiKey });
      }
      this.modelName = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'placeholder-gemini-key') {
        this.geminiClient = new GoogleGenAI({ apiKey });
      }
      this.modelName = options.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    }
  }

  /**
   * Generates a streaming response from the configured LLM provider.
   * Returns a ReadableStream of text chunks.
   */
  async generateStream(options: StreamGenerationOptions): Promise<ReadableStream<string>> {
    if (this.provider === 'openai') {
      return this.streamOpenAI(options);
    } else {
      return this.streamGemini(options);
    }
  }

  /**
   * Generates a non-streaming response as a fallback.
   */
  async generateText(options: StreamGenerationOptions): Promise<string> {
    const stream = await this.generateStream(options);
    const reader = stream.getReader();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += value;
    }

    return result;
  }

  private async streamGemini(options: StreamGenerationOptions): Promise<ReadableStream<string>> {
    if (!this.geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.startsWith('placeholder')) {
        throw new Error('GEMINI_API_KEY is not configured. Please set your Gemini API key in environment variables.');
      }
      this.geminiClient = new GoogleGenAI({ apiKey });
    }

    // Format previous conversation context (keep up to last 6 turns to avoid context overflow)
    const history = (options.history || []).slice(-6).map((msg) => ({
      role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: msg.content }],
    }));

    const modelCandidates = [
      options.model || this.modelName,
      ...GEMINI_FALLBACK_MODELS,
    ].filter((model, index, list) => list.indexOf(model) === index);

    const userMessageWithContext = `${options.contextText}\n\nUSER QUESTION:\n${options.question}`;

    let responseStream: AsyncGenerator<{ text?: string }> | null = null;
    let lastError: unknown;

    for (const model of modelCandidates) {
      const chat = this.geminiClient.chats.create({
        model,
        history,
        config: {
          systemInstruction: options.systemPrompt,
          temperature: options.temperature ?? 0.2, // Low temperature for high factual adherence
        },
      });

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          responseStream = await chat.sendMessageStream({ message: userMessageWithContext });
          lastError = undefined;
          break;
        } catch (error: unknown) {
          lastError = error;
          if (!isRetryableProviderError(error) || attempt === 3) {
            break;
          }
          await sleep(500 * attempt);
        }
      }

      if (responseStream) {
        break;
      }
    }

    if (!responseStream) {
      const details = formatProviderError(lastError);
      throw new Error(
        `Gemini is temporarily unavailable (${details}). Please try again in a moment.`
      );
    }

    return new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
              controller.enqueue(chunkText);
            }
          }
          controller.close();
        } catch (err: unknown) {
          controller.error(new Error(`Gemini stream error: ${formatProviderError(err)}`));
        }
      },
    });
  }

  private async streamOpenAI(options: StreamGenerationOptions): Promise<ReadableStream<string>> {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.startsWith('placeholder')) {
        throw new Error('OPENAI_API_KEY is not configured. Please set your OpenAI API key in environment variables.');
      }
      this.openaiClient = new OpenAI({ apiKey });
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: options.systemPrompt },
    ];

    // Append history
    if (options.history && options.history.length > 0) {
      for (const msg of options.history.slice(-6)) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    const userMessageWithContext = `${options.contextText}\n\nUSER QUESTION:\n${options.question}`;
    messages.push({ role: 'user', content: userMessageWithContext });

    const completionStream = await this.openaiClient.chat.completions.create({
      model: this.modelName,
      messages,
      temperature: options.temperature ?? 0.2,
      stream: true,
    });

    return new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of completionStream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(content);
            }
          }
          controller.close();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          controller.error(new Error(`OpenAI stream error: ${message}`));
        }
      },
    });
  }
}

export const defaultLLMService = new LLMService();
