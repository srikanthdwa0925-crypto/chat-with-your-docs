'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  MessageSquare, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Layers,
  Plus
} from 'lucide-react';
import { Document, Conversation } from '@/types/database';

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [docsRes, convsRes] = await Promise.all([
        fetch('/api/documents?limit=5'),
        fetch('/api/conversations'),
      ]);

      const docsData = await docsRes.json();
      const convsData = await convsRes.json();

      if (docsData.success) {
        setDocuments(docsData.data.documents || []);
      }
      if (convsData.success) {
        setConversations(convsData.data || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const readyDocs = documents.filter((d) => d.status === 'READY').length;
  const processingDocs = documents.filter((d) => ['PROCESSING', 'EMBEDDING', 'UPLOADING'].includes(d.status)).length;
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  const startNewChat = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        router.push(`/chat/${data.data.id}`);
      } else {
        router.push('/chat');
      }
    } catch {
      router.push('/chat');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Overview of your uploaded documents and conversations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/documents"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </Link>
          <button
            onClick={startNewChat}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Documents</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {documents.length}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 inline-block font-semibold">
            {readyDocs} Ready for RAG
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Ready Chunks</span>
            <Layers className="w-4 h-4 text-violet-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalChunks}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">
            Indexed in pgvector
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Processing</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {processingDocs}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">
            In queue / embedding
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Conversations</span>
            <MessageSquare className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {conversations.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">
            Multi-turn sessions
          </span>
        </div>
      </div>

      {/* Main Content Grid: Recent Documents & Recent Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Documents Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Recent Documents
            </h2>
            <Link
              href="/documents"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {documents.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No documents yet</p>
                <Link
                  href="/documents"
                  className="mt-3 inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline"
                >
                  Upload your first document
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                          {doc.original_filename}
                        </p>
                        <p className="text-xs text-slate-400">
                          {doc.chunk_count} chunks • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        doc.status === 'READY'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                      }`}>
                        {doc.status}
                      </span>
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Recent Conversations
            </h2>
            <Link
              href="/chat"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>Open Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No active conversations</p>
                <button
                  onClick={startNewChat}
                  className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline"
                >
                  Start a new conversation
                </button>
              </div>
            ) : (
              conversations.slice(0, 5).map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="block p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {conv.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
