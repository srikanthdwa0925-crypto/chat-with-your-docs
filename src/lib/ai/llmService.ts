// src/lib/ai/llmService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class LLMService {
  private provider: 'gemini' | 'openai';
  private geminiClient: GoogleGenerativeAI | null = null;
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
        this.geminiClient = new GoogleGenerativeAI(apiKey);
      }
      this.modelName = options.model || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
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
      this.geminiClient = new GoogleGenerativeAI(apiKey);
    }

    const model = this.geminiClient.getGenerativeModel({
      model: this.modelName,
      systemInstruction: options.systemPrompt,
      generationConfig: {
        temperature: options.temperature ?? 0.2, // Low temperature for high factual adherence
      },
    });

    // Format previous conversation context (keep up to last 6 turns to avoid context overflow)
    const history = (options.history || []).slice(-6).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history });

    const userMessageWithContext = `${options.contextText}\n\nUSER QUESTION:\n${options.question}`;

    const responseStream = await chat.sendMessageStream(userMessageWithContext);

    return new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of responseStream.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(chunkText);
            }
          }
          controller.close();
        } catch (err: any) {
          controller.error(new Error(`Gemini stream error: ${err.message}`));
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
        } catch (err: any) {
          controller.error(new Error(`OpenAI stream error: ${err.message}`));
        }
      },
    });
  }
}

export const defaultLLMService = new LLMService();
