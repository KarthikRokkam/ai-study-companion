import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  Volume2,
  FileAudio,
  CheckCircle,
  ArrowRight,
  Eye,
  Plus,
} from 'lucide-react';
import { MaterialDocument, KnowledgeChunk, BackgroundJob, MediaAsset } from '../types.js';

interface MaterialsViewProps {
  projectId: string;
  projectName: string;
  onNavigateToTutorWithMedia?: (mediaId: string) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  projectId,
  projectName,
  onNavigateToTutorWithMedia,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'text' | 'media'>('text');
  const [documents, setDocuments] = useState<MaterialDocument[]>([]);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New Document Form (Text)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // New Media Upload Form
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaUploadFeedback, setMediaUploadFeedback] = useState<string | null>(null);
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, chunksRes, jobsRes, mediaRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/documents`),
        fetch(`/api/projects/${projectId}/chunks`),
        fetch(`/api/projects/${projectId}/jobs`),
        fetch(`/api/projects/${projectId}/media`),
      ]);

      if (docsRes.ok && chunksRes.ok && jobsRes.ok) {
        const docsData = await docsRes.json();
        const chunksData = await chunksRes.json();
        const jobsData = await jobsRes.json();
        setDocuments(docsData.documents);
        setChunks(chunksData.chunks);
        setJobs(jobsData.jobs);
      }

      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        setMediaAssets(mediaData.mediaAssets || []);
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
          `Document accepted! Background indexing job '${data.job.id}' queued.`
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

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check SVG rejection
      if (file.name.toLowerCase().endsWith('.svg') || file.type.includes('svg')) {
        setMediaUploadFeedback('SVG files are rejected for script execution and XXE security. Please provide PNG, JPEG, WEBP or audio files.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setMediaUploadFeedback(null);
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isMediaUploading) return;

    setIsMediaUploading(true);
    setMediaUploadFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`/api/projects/${projectId}/media`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMediaUploadFeedback(
          `Media uploaded! Job '${data.job.id}' queued for multimodal indexing.`
        );
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setMediaUploadFeedback(`Upload error: ${err.message || 'Failed to upload media asset.'}`);
      }
    } catch (err: any) {
      setMediaUploadFeedback(`Network error: ${err.message}`);
    } finally {
      setIsMediaUploading(false);
    }
  };

  return (
    <div className="space-y-6 text-stone-800 text-xs">
      {/* Overview Banner & Tab Switcher */}
      <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-stone-900 leading-tight">
              Materials & Multimodal Knowledge Base
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
              Phase 6 Vision & Audio
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Project: <span className="font-semibold text-stone-800">{projectName}</span> — Documents, visual diagrams, and audio lectures are isolated, sanitized, and grounded.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Subtab Toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('text')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'text'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text Docs ({documents.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('media')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'media'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>Media & Vision ({mediaAssets.length})</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeSubTab === 'text' ? (
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
                          {chunk.mediaType === 'image' || chunk.mediaType === 'diagram' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                              <ImageIcon className="w-3 h-3" /> Diagram Chunk
                            </span>
                          ) : chunk.mediaType === 'audio_transcript' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Volume2 className="w-3 h-3" /> Audio Chunk
                            </span>
                          ) : null}
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

                      {chunk.boundingBox && (
                        <div className="text-[10px] text-sky-700 font-mono bg-sky-50 px-2 py-1 rounded border border-sky-100 inline-block">
                          Region Bounds: (ymin: {chunk.boundingBox.ymin}, xmin: {chunk.boundingBox.xmin}, ymax: {chunk.boundingBox.ymax}, xmax: {chunk.boundingBox.xmax})
                        </div>
                      )}

                      {chunk.timeRange && (
                        <div className="text-[10px] text-amber-700 font-mono bg-amber-50 px-2 py-1 rounded border border-amber-100 inline-block">
                          Timestamp Range: {chunk.timeRange.startSeconds}s – {chunk.timeRange.endSeconds}s
                        </div>
                      )}

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
      ) : (
        /* Multimodal Media Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Media Uploader */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs">
              <h3 className="text-sm font-bold text-stone-900 mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-600" />
                <span>Upload Media Asset</span>
              </h3>
              <p className="text-[11px] text-stone-500 mb-4">
                Upload architecture diagrams, lecture recordings, or slides. Supported formats: PNG, JPEG, WEBP, MP3, WAV, M4A.
              </p>

              <form onSubmit={handleUploadMedia} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1.5">
                    Select Diagram or Audio File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,audio/wav,audio/mpeg,audio/mp4,audio/x-m4a"
                    onChange={handleMediaFileChange}
                    className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer border border-stone-200 rounded-lg p-1.5"
                  />
                  <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Validated against magic bytes & size limits (10MB image, 25MB audio). SVG blocked.</span>
                  </div>
                </div>

                {selectedFile && (
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                    <div className="font-semibold text-stone-800 truncate text-[11px]">
                      {selectedFile.name}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Type: {selectedFile.type || 'Media binary'}
                    </div>
                  </div>
                )}

                {mediaUploadFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] flex items-start gap-1.5 ${
                      mediaUploadFeedback.startsWith('Media uploaded')
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border border-red-200 text-red-900'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{mediaUploadFeedback}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isMediaUploading || !selectedFile}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-stone-100 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isMediaUploading ? 'Uploading & Processing...' : 'Upload & Process Media'}</span>
                </button>
              </form>
            </div>

            {/* Media Processing Jobs */}
            <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs">
              <h3 className="text-xs font-bold text-stone-900 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <span>Media Pipeline Status</span>
                </span>
                <span className="text-[10px] text-stone-400">Vision & Transcription</span>
              </h3>

              {jobs.filter((j) => j.type === 'media_processing').length === 0 ? (
                <p className="text-[11px] text-stone-400">No active media processing jobs.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {jobs
                    .filter((j) => j.type === 'media_processing')
                    .map((job) => (
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
                        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-600 transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-stone-500 flex justify-between">
                          <span>Progress: {job.progress}%</span>
                          {job.resultSummary && <span className="truncate max-w-[120px]">{job.resultSummary}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Media Assets Gallery */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-sky-600" />
                    <span>Indexed Media Assets</span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Grounded visual diagrams and audio lecture files available for multimodal reasoning.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                  {mediaAssets.length} Assets
                </span>
              </div>

              {mediaAssets.length === 0 ? (
                <div className="p-12 text-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                  <p className="font-semibold text-stone-600 mb-1">No media assets uploaded yet</p>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    Upload an architecture diagram or lecture audio on the left to activate visual & auditory grounding in your AI Tutor.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                  {mediaAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-4 bg-stone-50/80 rounded-xl border border-stone-200 flex flex-col justify-between hover:bg-stone-50 transition-all space-y-3"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 truncate">
                            {asset.mediaType === 'audio' ? (
                              <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                                <Volume2 className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg shrink-0">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="truncate">
                              <h4 className="font-bold text-stone-900 text-xs truncate" title={asset.filename}>
                                {asset.filename}
                              </h4>
                              <span className="text-[10px] text-stone-500 font-mono">
                                {(((asset.fileSize || asset.byteSize || 0)) / 1024).toFixed(1)} KB • {asset.mimeType}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                              asset.processingStatus === 'ready' || asset.processingStatus === 'READY'
                                ? 'bg-emerald-100 text-emerald-800'
                                : asset.processingStatus === 'processing' || asset.processingStatus === 'PROCESSING'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : asset.processingStatus === 'failed' || asset.processingStatus === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {asset.processingStatus}
                          </span>
                        </div>

                        {/* Media Preview */}
                        {asset.mediaType === 'image' || asset.mediaType === 'diagram' ? (
                          <div className="w-full h-36 bg-stone-200 rounded-lg overflow-hidden border border-stone-300 relative group">
                            <img
                              src={`/api/projects/${projectId}/media/${asset.id}/file`}
                              alt={asset.filename}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                            {asset.visionMetadata?.detectedRegions && (
                              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-stone-900/80 text-white text-[10px] font-semibold rounded-md backdrop-blur-xs">
                                {asset.visionMetadata.detectedRegions.length} Detected Regions
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2">
                            <audio
                              controls
                              src={`/api/projects/${projectId}/media/${asset.id}/file`}
                              className="w-full h-8"
                            />
                            {asset.audioMetadata && (
                              <div className="text-[10px] text-stone-500 flex justify-between">
                                <span>Duration: {asset.audioMetadata.durationSeconds}s</span>
                                <span>{asset.audioMetadata.segments?.length || 0} segments transcribed</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Extracted Concepts / Metadata Summary */}
                        {asset.visionMetadata?.ocrExtractedText && (
                          <div className="mt-2 text-[10px] text-stone-600 bg-white p-2 rounded border border-stone-200/80 line-clamp-2">
                            <span className="font-semibold text-stone-800">OCR Summary: </span>
                            {asset.visionMetadata.ocrExtractedText}
                          </div>
                        )}

                        {asset.audioMetadata?.fullTranscript && (
                          <div className="mt-2 text-[10px] text-stone-600 bg-white p-2 rounded border border-stone-200/80 line-clamp-2">
                            <span className="font-semibold text-stone-800">Transcript: </span>
                            {asset.audioMetadata.fullTranscript}
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      {onNavigateToTutorWithMedia && (asset.processingStatus === 'ready' || asset.processingStatus === 'READY') && (
                        <button
                          onClick={() => onNavigateToTutorWithMedia(asset.id)}
                          className="w-full py-1.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Ask Grounded Tutor with this Media</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
