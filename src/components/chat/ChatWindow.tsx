'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SourceCard } from './SourceCard';
import { Message, SourceCitation, Document } from '@/types/database';
import { 
  Send, 
  Sparkles, 
  User, 
  Copy, 
  Check, 
  Square, 
  RotateCcw, 
  AlertCircle, 
  FileText,
  Filter
} from 'lucide-react';

interface ChatWindowProps {
  conversationId?: string;
  initialMessages?: Message[];
  documents?: Document[];
  selectedDocumentId?: string | null;
  onConversationCreated?: (id: string) => void;
}

export function ChatWindow({
  conversationId: propConvId,
  initialMessages = [],
  documents = [],
  selectedDocumentId: propDocId = null,
  onConversationCreated,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<SourceCitation[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(propConvId);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(propDocId);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setConversationId(propConvId);
  }, [propConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStreaming(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, retryPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = retryPrompt || input.trim();
    if (!promptToSend || streaming) return;

    setError(null);
    setInput('');

    // Append user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId || '',
      user_id: '',
      role: 'user',
      content: promptToSend,
      sources: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreaming(true);
    setStreamingContent('');
    setStreamingSources([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          message: promptToSend,
          conversationId,
          documentId: selectedDocId || null,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Chat request failed');
      }

      if (!response.body) {
        throw new Error('Readable stream not supported by server response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentAssistantText = '';
      let currentSources: SourceCitation[] = [];
      let resolvedConvId = conversationId;

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.replace('data: ', '').trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'meta') {
              currentSources = event.sources || [];
              setStreamingSources(currentSources);
              if (event.conversationId && !resolvedConvId) {
                resolvedConvId = event.conversationId;
                setConversationId(resolvedConvId);
                if (onConversationCreated && typeof resolvedConvId === 'string') {
                  onConversationCreated(resolvedConvId);
                }
              }
            } else if (event.type === 'token') {
              currentAssistantText += event.content;
              setStreamingContent(currentAssistantText);
            } else if (event.type === 'done') {
              currentAssistantText = event.fullContent || currentAssistantText;
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (eventError) {
            if (eventError instanceof SyntaxError) {
              continue;
            }
            throw eventError;
          }
        }
      }

      // Finish streaming and append permanent assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversation_id: resolvedConvId || '',
          user_id: '',
          role: 'assistant',
          content: currentAssistantText,
          sources: currentSources,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const raw = err.message || 'An error occurred while generating response.';
        let display = raw;
        try {
          const parsed = JSON.parse(raw);
          display = parsed.error?.message || parsed.message || raw;
          if (typeof display === 'string' && display.trim().startsWith('{')) {
            const nested = JSON.parse(display);
            display = nested.error?.message || display;
          }
        } catch {
          const match = raw.match(/This model is currently experiencing high demand[^"]*/i);
          if (match) {
            display = 'Gemini is busy right now. Please try again in a moment.';
          }
        }
        setError(display);
      }
    } finally {
      setStreaming(false);
      setStreamingContent('');
      setStreamingSources([]);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Scope Filter Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-medium">
          <Filter className="w-3.5 h-3.5 text-indigo-500" />
          <span>Search Scope:</span>
          <select
            value={selectedDocId || ''}
            onChange={(e) => setSelectedDocId(e.target.value || null)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
          >
            <option value="">All Documents in Library</option>
            {documents
              .filter((d) => d.status === 'READY')
              .map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.original_filename}
                </option>
              ))}
          </select>
        </div>

        {selectedDocId && (
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
            Filtered to 1 Document
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && !streaming && (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Ask anything about your documents
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Answers are generated strictly from the contents of your uploaded documents with verifiable page citations.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full text-left">
              {[
                'What are the primary objectives outlined in this document?',
                'Summarize the key policies or terms mentioned.',
                'What are the eligibility requirements or exceptions?',
                'Provide a breakdown of the important deadlines or dates.',
              ].map((sample, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(undefined, sample)}
                  className="p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-indigo-500 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left"
                >
                  &ldquo;{sample}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id || index}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm ${
                  isUser
                    ? 'bg-indigo-600'
                    : 'bg-gradient-to-tr from-violet-600 to-indigo-600'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <SourceCard sources={msg.sources} />
                )}

                {!isUser && (
                  <div className="flex items-center space-x-2 pt-1 pl-1">
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs flex items-center space-x-1"
                      title="Copy response"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {index === messages.length - 1 && (
                      <button
                        onClick={() => {
                          const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                          if (lastUserMsg) handleSubmit(undefined, lastUserMsg.content);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs flex items-center space-x-1"
                        title="Retry query"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Streaming Assistant Message */}
        {streaming && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>

            <div className="max-w-[85%] sm:max-w-[75%] space-y-1.5">
              <div className="p-4 rounded-2xl rounded-tl-none bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 text-sm leading-relaxed">
                {streamingContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-slate-500 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                    <span>Searching vector database and generating grounded answer...</span>
                  </div>
                )}
              </div>

              {streamingSources.length > 0 && (
                <SourceCard sources={streamingSources} />
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start space-x-3 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form onSubmit={(e) => handleSubmit(e)} className="relative">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your uploaded documents... (Shift+Enter for new line)"
            disabled={streaming}
            className="w-full pl-4 pr-24 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm resize-none disabled:opacity-60 transition-all"
          />

          <div className="absolute right-3 bottom-3.5 flex items-center space-x-2">
            {streaming ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-40 transition-all"
                title="Send question"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
        <div className="mt-1.5 flex justify-between items-center text-[11px] text-slate-400">
          <span>Press Enter to send, Shift + Enter for newline</span>
          <span>{input.length} / 4000 characters</span>
        </div>
      </div>
    </div>
  );
}
