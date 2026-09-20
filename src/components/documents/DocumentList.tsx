'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Document, DocumentStatus } from '@/types/database';
import { 
  FileText, 
  Trash2, 
  MessageSquare, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2,
  FileCode
} from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted?: (id: string) => void;
  onRefresh?: () => void;
}

export function DocumentList({ documents, onDocumentDeleted, onRefresh }: DocumentListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready</span>
          </span>
        );
      case 'PROCESSING':
      case 'EMBEDDING':
      case 'UPLOADING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{status.toLowerCase()}</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5" />
            <span>Uploaded</span>
          </span>
        );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? All associated vectors and chunks will be removed.`)) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete document');
      }

      if (onDocumentDeleted) {
        onDocumentDeleted(id);
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting document');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReprocess = async (id: string) => {
    setReprocessingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${id}/process`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to reprocess document');
      }

      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Error reprocessing document');
    } finally {
      setReprocessingId(null);
    }
  };

  const startChatWithDocument = async (docId: string, filename: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Chat with ${filename}`,
          documentId: docId,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        router.push(`/chat/${data.data.id}`);
      }
    } catch {
      router.push('/chat');
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No documents uploaded yet</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Upload your first PDF or TXT file using the dropzone above to start chatting with your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start space-x-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {documents.map((doc) => {
          const isDeleting = deletingId === doc.id;
          const isReprocessing = reprocessingId === doc.id;
          const isPdf = doc.filename.endsWith('.pdf');

          return (
            <div
              key={doc.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5 sm:mt-0">
                  {isPdf ? <FileText className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                      {doc.original_filename}
                    </h4>
                    {getStatusBadge(doc.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>•</span>
                    <span>{doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}</span>
                    <span>•</span>
                    <span>{doc.chunk_count} chunks indexed</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>

                  {doc.error_message && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                      {doc.error_message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                {doc.status === 'READY' && (
                  <button
                    onClick={() => startChatWithDocument(doc.id, doc.original_filename)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                )}

                {doc.status === 'FAILED' && (
                  <button
                    onClick={() => handleReprocess(doc.id)}
                    disabled={isReprocessing}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
                    <span>Retry</span>
                  </button>
                )}

                <Link
                  href={`/documents/${doc.id}`}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="View Details"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => handleDelete(doc.id, doc.original_filename)}
                  disabled={isDeleting}
                  className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
