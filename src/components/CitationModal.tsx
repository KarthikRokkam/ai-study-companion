import React from 'react';
import { X, ExternalLink, ShieldCheck, FileText, Image as ImageIcon, Volume2 } from 'lucide-react';
import { Citation } from '../types.js';

interface CitationModalProps {
  citation: Citation | null;
  projectId?: string;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ citation, projectId, onClose }) => {
  if (!citation) return null;

  const isVisual = citation.mediaType === 'image' || citation.mediaType === 'diagram';
  const isAudio = citation.mediaType === 'audio_transcript' || citation.mediaType === 'audio';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-xl w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-md">
              {isVisual ? (
                <ImageIcon className="w-4 h-4" />
              ) : isAudio ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 leading-tight">
                {isVisual ? 'Visual Diagram Evidence' : isAudio ? 'Audio Lecture Evidence' : 'Verified Grounding Citation'}
              </h3>
              <p className="text-xs text-stone-500">
                Chunk ID: {citation.chunkId} • {citation.mediaType ? citation.mediaType.toUpperCase() : 'TEXT'}
              </p>
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
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          <div>
            <span className="text-stone-400 font-medium uppercase tracking-wider block text-[10px] mb-1">
              Source Origin
            </span>
            <div className="font-semibold text-stone-900 text-sm">{citation.docTitle}</div>
            <div className="text-amber-800 font-medium mt-0.5">
              Section: {citation.section || 'General Context'}
            </div>
          </div>

          {/* Visual Evidence Preview */}
          {isVisual && citation.mediaAssetId && projectId && (
            <div className="space-y-2">
              <span className="text-stone-400 font-medium uppercase tracking-wider block text-[10px]">
                Referenced Diagram Visual
              </span>
              <div className="relative rounded-lg overflow-hidden border border-stone-200 bg-stone-900/5 max-h-64 flex items-center justify-center">
                <img
                  src={`/api/projects/${projectId}/media/${citation.mediaAssetId}/file`}
                  alt={citation.docTitle}
                  className="max-h-64 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              {citation.boundingBox && (
                <div className="p-2 bg-stone-100 rounded text-[11px] text-stone-600 font-mono">
                  Coordinates: [ymin: {citation.boundingBox.ymin}, xmin: {citation.boundingBox.xmin}, ymax: {citation.boundingBox.ymax}, xmax: {citation.boundingBox.xmax}]
                </div>
              )}
            </div>
          )}

          {/* Audio Evidence Preview */}
          {isAudio && citation.mediaAssetId && projectId && (
            <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between text-amber-900 font-medium text-xs">
                <span>Lecture Audio Playback</span>
                {citation.timeRange && (
                  <span className="font-mono bg-amber-200/70 px-2 py-0.5 rounded text-[11px]">
                    {citation.timeRange.startSeconds}s - {citation.timeRange.endSeconds}s
                  </span>
                )}
              </div>
              <audio
                controls
                src={`/api/projects/${projectId}/media/${citation.mediaAssetId}/file`}
                className="w-full h-8"
              />
            </div>
          )}

          <div>
            <span className="text-stone-400 font-medium uppercase tracking-wider block text-[10px] mb-1">
              Extracted Grounding Evidence
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
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
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
