'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  ArrowLeft, 
  MessageSquare, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layers,
  Calendar,
  HardDrive
} from 'lucide-react';
import { Document, DocumentChunk } from '@/types/database';

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    const fetchDocumentDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/documents/${params.id}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to load document');
        }

        setDocument(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentDetails();
  }, [params.id]);

  const handleDelete = async () => {
    if (!document) return;
    if (!confirm(`Are you sure you want to delete "${document.original_filename}"?`)) return;

    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/documents');
      } else {
        throw new Error(data.error?.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleReprocess = async () => {
    if (!document) return;
    setReprocessing(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/process`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDocument(data.data.document);
      } else {
        throw new Error(data.error?.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reprocess document');
    } finally {
      setReprocessing(false);
    }
  };

  const handleStartChat = async () => {
    if (!document) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Chat with ${document.original_filename}`,
          documentId: document.id,
        }),
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading document details...
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Document not found</h2>
        <p className="text-sm text-slate-500">{error || 'This document does not exist or has been deleted.'}</p>
        <Link
          href="/documents"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to documents</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex items-center space-x-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <Link href="/documents" className="flex items-center space-x-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Documents</span>
        </Link>
        <span>/</span>
        <span className="truncate max-w-xs text-slate-800 dark:text-slate-200 font-medium">
          {document.original_filename}
        </span>
      </div>

      {/* Header Bar */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {document.original_filename}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              ID: {document.id}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {document.status === 'READY' && (
            <button
              onClick={handleStartChat}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat With Doc</span>
            </button>
          )}

          <button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Reprocess Document"
          >
            <RefreshCw className={`w-4 h-4 ${reprocessing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleDelete}
            className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors"
            title="Delete Document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metadata Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 font-medium">Status</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {document.status}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 font-medium">Pages</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {document.page_count}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 font-medium">Chunks Indexed</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {document.chunk_count}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 font-medium">File Size</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {(document.file_size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      </div>

      {document.error_message && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start space-x-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Processing Error</p>
            <p className="text-xs mt-0.5">{document.error_message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
