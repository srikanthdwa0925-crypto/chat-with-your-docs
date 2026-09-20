'use client';

import { useState, useEffect } from 'react';
import { UploadZone } from '@/components/documents/UploadZone';
import { DocumentList } from '@/components/documents/DocumentList';
import { Document } from '@/types/database';
import { FileText, RefreshCw, Plus, X } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents?limit=100');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data.documents || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentDeleted = (deletedId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
  };

  const handleUploadSuccess = (newDoc: Document) => {
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
    setShowUploadModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Document Library
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your knowledge base, upload new materials, and view indexing status
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDocuments}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh documents list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUploadModal(!showUploadModal)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            {showUploadModal ? (
              <>
                <X className="w-4 h-4" />
                <span>Close Upload</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Upload New File</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Zone Card */}
      {showUploadModal && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Upload Document to Knowledge Base
          </h3>
          <UploadZone onSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Documents List */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          All Documents ({documents.length})
        </h2>
        <DocumentList
          documents={documents}
          onDocumentDeleted={handleDocumentDeleted}
          onRefresh={fetchDocuments}
        />
      </div>
    </div>
  );
}
