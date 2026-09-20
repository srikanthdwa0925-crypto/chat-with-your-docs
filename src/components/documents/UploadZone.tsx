'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { validateFileUpload } from '@/lib/validation/schemas';
import { Document } from '@/types/database';

interface UploadZoneProps {
  onSuccess?: (doc: Document) => void;
}

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setError(null);
    const validation = validateFileUpload({
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
    });

    if (!validation.valid) {
      setError(validation.error || 'Invalid file.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setError(null);
    setUploading(true);
    setProgress(15);
    setStatus('Uploading document to secure storage...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 1. Upload file
      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error?.message || 'Upload failed');
      }

      const uploadedDoc = uploadData.data;
      setProgress(50);
      setStatus('Extracting text & generating vector embeddings...');

      // 2. Trigger automatic processing
      const processRes = await fetch(`/api/documents/${uploadedDoc.id}/process`, {
        method: 'POST',
      });

      const processData = await processRes.json();

      if (!processRes.ok || !processData.success) {
        throw new Error(processData.error?.message || 'Processing failed');
      }

      setProgress(100);
      setStatus('Document is ready for conversation!');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';

      if (onSuccess) {
        onSuccess(processData.data.document);
      }

      setTimeout(() => {
        setUploading(false);
        setStatus(null);
        setProgress(0);
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload or processing.');
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50'
        } ${uploading ? 'pointer-events-none opacity-90' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {uploading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {file ? file.name : 'Click to browse or drag and drop your document'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supported formats: PDF, TXT, MD (Max 25MB)
            </p>
          </div>
        </div>

        {uploading && (
          <div className="mt-6 max-w-md mx-auto space-y-2">
            <div className="flex justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>{status}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start space-x-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {file && !uploading && (
        <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-indigo-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-xs">
                {file.name}
              </p>
              <p className="text-xs text-slate-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            Upload & Process
          </button>
        </div>
      )}
    </div>
  );
}
