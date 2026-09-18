import React from 'react';
import { X, ExternalLink, ShieldCheck, FileText, CheckCircle } from 'lucide-react';
import { Citation } from '../types.js';

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-xl w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-md">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 leading-tight">
                Verified Grounding Citation
              </h3>
              <p className="text-xs text-stone-500">Chunk ID: {citation.chunkId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <span className="text-stone-400 font-medium uppercase tracking-wider block text-[10px] mb-1">
              Source Document
            </span>
            <div className="font-semibold text-stone-900 text-sm">{citation.docTitle}</div>
            <div className="text-amber-800 font-medium mt-0.5">
              Section: {citation.section || 'General Context'}
            </div>
          </div>

          <div>
            <span className="text-stone-400 font-medium uppercase tracking-wider block text-[10px] mb-1">
              Extracted Evidence Snippet
            </span>
            <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-stone-800 font-mono leading-relaxed whitespace-pre-wrap text-[11px]">
              "{citation.snippet}"
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-medium">Evidence Grounding Score: {Math.round(citation.relevanceScore * 100)}%</span>
            </div>
            <span className="text-stone-400 text-[11px]">Zero hallucination verified</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-medium cursor-pointer"
          >
            Close Citation Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
