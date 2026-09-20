'use client';

import { useState } from 'react';
import { SourceCitation } from '@/types/database';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface SourceCardProps {
  sources: SourceCitation[];
}

export function SourceCard({ sources }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>
          {sources.length} {sources.length === 1 ? 'Source Citation' : 'Source Citations'}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sources.map((src, index) => {
            const similarityPct = Math.round(src.similarity * 100);
            return (
              <div
                key={index}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-medium">
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[160px] font-semibold">
                    {src.document_name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-mono">
                    {similarityPct}% match
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{src.page_number ? `Page ${src.page_number}` : 'Page unknown'}</span>
                  <span>•</span>
                  <span>Chunk #{src.chunk_index}</span>
                </div>

                <p className="text-slate-600 dark:text-slate-400 italic text-[11px] line-clamp-3 bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800/60">
                  &ldquo;{src.snippet}&rdquo;
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
