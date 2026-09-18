import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  RefreshCw,
  Layers,
  Sparkles,
  AlertCircle,
  Database,
} from 'lucide-react';
import { MaterialDocument, KnowledgeChunk, BackgroundJob } from '../types.js';

interface MaterialsViewProps {
  projectId: string;
  projectName: string;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({ projectId, projectName }) => {
  const [documents, setDocuments] = useState<MaterialDocument[]>([]);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New Document Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, chunksRes, jobsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/documents`),
        fetch(`/api/projects/${projectId}/chunks`),
        fetch(`/api/projects/${projectId}/jobs`),
      ]);

      if (docsRes.ok && chunksRes.ok && jobsRes.ok) {
        const docsData = await docsRes.json();
        const chunksData = await chunksRes.json();
        const jobsData = await jobsRes.json();
        setDocuments(docsData.documents);
        setChunks(chunksData.chunks);
        setJobs(jobsData.jobs);
      }
    } catch (err) {
      console.error('Failed to load materials data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // Auto-poll background worker
    return () => clearInterval(interval);
  }, [projectId]);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isUploading) return;

    setIsUploading(true);
    setUploadFeedback(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          sourceType: 'text',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUploadFeedback(
          `Document accepted! Background indexing job '${data.job.id}' queued (Idempotent key: ${data.job.idempotencyKey.slice(0, 16)}...).`
        );
        setTitle('');
        setContent('');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setUploadFeedback(`Upload error: ${err.message || 'Failed to upload document.'}`);
      }
    } catch (err: any) {
      setUploadFeedback(`Network error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 text-stone-800 text-xs">
      {/* Overview Banner */}
      <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-stone-900 leading-tight">
            Materials & Grounded Knowledge Base
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Project: <span className="font-semibold text-stone-800">{projectName}</span> — Every document is isolated, sanitized, and indexed for deterministic citation.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-lg text-xs font-semibold text-stone-700">
            <Layers className="w-3.5 h-3.5 text-stone-500" />
            <span>{chunks.length} Knowledge Chunks</span>
          </div>
          <button
            onClick={fetchData}
            className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload New Material */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-600" />
              <span>Ingest Study Material</span>
            </h3>
            <p className="text-[11px] text-stone-500 mb-4">
              Upload notes or specifications. The ingestion pipeline sanitizes prompt-injection keywords, chunks text, and generates verifiable source anchors.
            </p>

            <form onSubmit={handleUploadDocument} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Section 5: Log Replication Invariants"
                  required
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Content / Lecture Text
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste study material text here..."
                  rows={6}
                  required
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:outline-none rounded-lg text-xs leading-relaxed font-mono text-[11px]"
                />
              </div>

              {uploadFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-[11px] flex items-start gap-1.5 ${
                    uploadFeedback.startsWith('Document accepted')
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border border-red-200 text-red-900'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{uploadFeedback}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || !title.trim() || !content.trim()}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-stone-100 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>{isUploading ? 'Ingesting...' : 'Ingest into Knowledge Base'}</span>
              </button>
            </form>
          </div>

          {/* Background Jobs Card */}
          <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <h3 className="text-xs font-bold text-stone-900 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span>Background Ingestion Workers</span>
              </span>
              <span className="text-[10px] text-stone-400">Idempotent & Resilient</span>
            </h3>

            {jobs.length === 0 ? (
              <p className="text-[11px] text-stone-400">No active background jobs.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-800 truncate max-w-[150px]">
                        {job.type}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          job.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'processing'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : job.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-stone-900 transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-stone-500">
                      <span>Progress: {job.progress}%</span>
                      {job.retryCount > 0 && <span>Retries: {job.retryCount}/{job.maxRetries}</span>}
                    </div>

                    {job.resultSummary && (
                      <p className="text-[10px] text-stone-600 truncate">{job.resultSummary}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Indexed Chunks & Security Audit */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-stone-700" />
                  <span>Grounded Knowledge Chunks</span>
                </h3>
                <p className="text-[11px] text-stone-500">
                  Inspected chunks available to the AI Tutor & Quiz engine within {projectName}.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                {chunks.length} Total
              </span>
            </div>

            {chunks.length === 0 ? (
              <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                No chunks indexed for this project yet. Upload course materials on the left to populate the knowledge base.
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200 space-y-2 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{chunk.docTitle}</span>
                        <span className="text-amber-800 font-medium">§ {chunk.sectionTitle}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-stone-400 font-mono">ID: {chunk.id}</span>
                        <span className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-700 font-mono">
                          ~{chunk.tokenCount} tokens
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-700 font-mono leading-relaxed bg-white p-2.5 rounded-lg border border-stone-200/80 whitespace-pre-wrap">
                      "{chunk.content}"
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      {/* Security Audit Badge */}
                      {chunk.securityFlags?.promptInjectionDetected ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          <span>Prompt Injection Defanged</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Sanitized & Verified</span>
                        </span>
                      )}
                      <span className="text-stone-400">Order #{chunk.chunkIndex + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
