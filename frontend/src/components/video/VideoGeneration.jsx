import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, Play, Download, RefreshCw, CheckCircle, AlertCircle,
  Copy, Upload, ExternalLink, Clapperboard, Sparkles,
  Volume2, VolumeX, Maximize, Pause, ChevronDown, ChevronUp,
  Clock, Check
} from 'lucide-react';
import {
  getSceneUploadStatus,
  uploadSceneVideo,
  assembleFinalVideo,
  getDreamVideo,
  refreshVideoUrl,
} from '../../services/api';

// ─── Cinematic Video Player ───────────────────────────────────────────────────

function CinematicPlayer({ videoUrl, title }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);

  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); }
    else { videoRef.current.play(); }
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'dream-vision').replace(/\s+/g, '-').toLowerCase()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(videoUrl, '_blank');
    }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#000', border: '1px solid rgba(124,58,237,0.4)', boxShadow: '0 0 60px rgba(124,58,237,0.25)' }}
    >
      {/* Title bar */}
      <div className="px-5 py-3 flex items-center justify-between"
           style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.12))' }}>
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">{title || 'Your Cinematic Vision'}</span>
        </div>
        <span className="text-xs text-green-400 font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Ready to Play
        </span>
      </div>

      {/* Video */}
      <div className="relative bg-black cursor-pointer" style={{ aspectRatio: '16/9' }}
           onMouseMove={resetHideTimer} onClick={togglePlay}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={() => setProgress(((videoRef.current?.currentTime || 0) / (videoRef.current?.duration || 1)) * 100)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          muted={muted}
          playsInline
        />
        <AnimatePresence>
          {!playing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                   style={{ background: 'rgba(124,58,237,0.85)', backdropFilter: 'blur(8px)' }}>
                <Play className="w-7 h-7 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showControls && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 p-4"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="w-full h-1.5 rounded-full mb-3 cursor-pointer"
                   style={{ background: 'rgba(255,255,255,0.2)' }} onClick={handleSeek}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="text-white hover:text-purple-300 transition-colors">
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setMuted(!muted)} className="text-white hover:text-purple-300 transition-colors">
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-xs text-gray-300">
                    {fmt(videoRef.current?.currentTime || 0)} / {fmt(duration)}
                  </span>
                </div>
                <button onClick={() => videoRef.current?.requestFullscreen()}
                        className="text-white hover:text-purple-300 transition-colors">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <button onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
          <Download className="w-4 h-4" /> Download MP4
        </button>
        <span className="text-xs text-gray-500">{duration > 0 ? `${Math.round(duration)}s · ` : ''}MP4 · 16:9</span>
      </div>
    </motion.div>
  );
}

// ─── Scene Upload Card ────────────────────────────────────────────────────────

function SceneUploadCard({ scene, onUpload, uploading }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(scene.visualPrompt || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.mp4')) {
      alert('Please upload an MP4 video file.');
      return;
    }
    onUpload(scene.sceneId, file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const isUploading = uploading === scene.sceneId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${scene.uploaded ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`,
        background: scene.uploaded ? 'rgba(52,211,153,0.04)' : 'rgba(13,17,23,0.8)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
             style={{ background: scene.uploaded ? 'rgba(52,211,153,0.2)' : 'rgba(124,58,237,0.15)', color: scene.uploaded ? '#34d399' : '#a78bfa' }}>
          {scene.uploaded ? <CheckCircle className="w-5 h-5" /> : String(scene.sceneNumber).padStart(2, '0')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-white text-sm">{scene.title || `Scene ${scene.sceneNumber}`}</h4>
            {scene.uploaded
              ? <span className="text-xs px-2 py-0.5 rounded-full text-green-400" style={{ background: 'rgba(52,211,153,0.12)' }}>✓ Uploaded</span>
              : <span className="text-xs px-2 py-0.5 rounded-full text-gray-500" style={{ background: 'rgba(255,255,255,0.05)' }}>Not uploaded</span>
            }
          </div>
          {scene.uploaded && (
            <p className="text-xs text-green-400/70 mt-0.5">Video ready for assembly</p>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-white transition-colors ml-2">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Prompt */}
              {scene.visualPrompt && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">Cinematic Prompt for Google Flow</span>
                    <button onClick={copyPrompt}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all"
                      style={{ background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(124,58,237,0.15)', color: copied ? '#34d399' : '#a78bfa' }}>
                      {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy Prompt</>}
                    </button>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">{scene.visualPrompt}</p>
                </div>
              )}

              {/* Upload area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileRef.current?.click()}
                className="rounded-xl p-5 text-center cursor-pointer transition-all duration-200"
                style={{
                  border: `2px dashed ${dragOver ? 'rgba(124,58,237,0.6)' : scene.uploaded ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.12)'}`,
                  background: dragOver ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  className="hidden" onChange={(e) => handleFile(e.target.files[0])} />

                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 rounded-full border-2 border-purple-400/30 border-t-purple-400" />
                    <p className="text-sm text-purple-400">Uploading...</p>
                  </div>
                ) : scene.uploaded ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <p className="text-sm text-green-400 font-medium">Uploaded successfully</p>
                    <p className="text-xs text-gray-500">Click to replace with a different clip</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-500" />
                    <p className="text-sm text-gray-300">Drop MP4 here or click to browse</p>
                    <p className="text-xs text-gray-600">Generate in Google Flow → Download → Upload here</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VideoGeneration({ dream }) {
  const [status, setStatus] = useState(null); // scene upload status
  const [finalVideo, setFinalVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // sceneId currently uploading
  const [assembling, setAssembling] = useState(false);
  const [error, setError] = useState('');
  const [allExpanded, setAllExpanded] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const pollRef = useRef(null);

  const dreamId = dream?.id;
  const dreamTitle = dream?.title;

  // Load status on mount
  const loadStatus = useCallback(async () => {
    if (!dreamId) return;
    try {
      const [uploadStatus, videoData] = await Promise.all([
        getSceneUploadStatus(dreamId),
        getDreamVideo(dreamId),
      ]);
      setStatus(uploadStatus);
      if (videoData?.finalVideoUrl) setFinalVideo(videoData);
      // If assembling in background, poll
      if (videoData?.status === 'processing') {
        startPolling();
      }
    } catch (err) {
      console.error('Load status error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [dreamId]);

  useEffect(() => {
    loadStatus();
    return () => stopPolling();
  }, [loadStatus]);

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const v = await getDreamVideo(dreamId);
        if (v?.finalVideoUrl) {
          setFinalVideo(v);
          stopPolling();
          setAssembling(false);
        } else if (v?.status === 'failed') {
          setError(v.errorMessage || 'Assembly failed');
          stopPolling();
          setAssembling(false);
        }
      } catch {}
    }, 4000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // Upload handler for a single scene
  const handleUpload = async (sceneId, file) => {
    setUploading(sceneId);
    setError('');
    try {
      await uploadSceneVideo(dreamId, sceneId, file);
      // Refresh status
      const updated = await getSceneUploadStatus(dreamId);
      setStatus(updated);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  // Assemble final video
  const handleAssemble = async () => {
    setAssembling(true);
    setError('');
    try {
      const result = await assembleFinalVideo(dreamId);
      if (result.finalVideoUrl) {
        setFinalVideo({ finalVideoUrl: result.finalVideoUrl, duration: result.duration });
        stopPolling();
        setAssembling(false);
      } else {
        // Assembly runs async — poll for completion
        startPolling();
      }
    } catch (err) {
      setError(err.message || 'Assembly failed');
      setAssembling(false);
    }
  };

  // Copy all prompts
  const handleCopyAll = () => {
    if (!status?.scenes) return;
    const allPrompts = status.scenes
      .map((s) => `=== Scene ${s.sceneNumber}: ${s.title} ===\n${s.visualPrompt}`)
      .join('\n\n');
    navigator.clipboard.writeText(allPrompts).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  const uploadedCount = status?.uploadedScenes || 0;
  const totalScenes = status?.totalScenes || dream?.scenes?.length || 6;
  const allUploaded = uploadedCount >= totalScenes && totalScenes > 0;

  if (loading) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 rounded-full border-2 border-purple-400/30 border-t-purple-400 mx-auto" />
      </div>
    );
  }

  // ── Final video ready ──
  if (finalVideo?.finalVideoUrl) {
    return (
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-green-300 text-sm font-semibold">Your dream has become a cinematic vision</p>
            <p className="text-green-400/60 text-xs">
              {finalVideo.duration ? `${finalVideo.duration}s · ` : ''}{uploadedCount} scenes assembled into one final MP4
            </p>
          </div>
          <button onClick={() => { setFinalVideo(null); loadStatus(); }}
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw className="w-3.5 h-3.5" /> Re-assemble
          </button>
        </motion.div>
        <CinematicPlayer videoUrl={finalVideo.finalVideoUrl} title={dreamTitle} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header: Google Flow instructions ── */}
      <div className="rounded-2xl p-6"
           style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(124,58,237,0.06))', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <Clapperboard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Generate with Google Flow</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Copy each scene's cinematic prompt below → paste it into Google Flow (Veo) → download the MP4 clip → upload it here. Once all scenes are uploaded, click <strong className="text-white">Create Final Video</strong> to assemble everything with FFmpeg.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://flow.google" target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                 style={{ background: 'linear-gradient(135deg,#4285f4,#34a853)' }}>
                <ExternalLink className="w-4 h-4" /> Open Google Flow
              </a>
              <button onClick={handleCopyAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: copiedAll ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.07)', color: copiedAll ? '#34d399' : '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
                {copiedAll ? <><Check className="w-4 h-4" />All Copied!</> : <><Copy className="w-4 h-4" />Copy All Prompts</>}
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{uploadedCount} of {totalScenes} scenes uploaded</span>
            <span className="text-xs font-bold text-purple-400">{totalScenes > 0 ? Math.round((uploadedCount / totalScenes) * 100) : 0}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <motion.div
              animate={{ width: `${totalScenes > 0 ? (uploadedCount / totalScenes) * 100 : 0}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: allUploaded ? 'linear-gradient(90deg,#34d399,#10b981)' : 'linear-gradient(90deg,#7c3aed,#a78bfa)' }}
            />
          </div>
        </div>
      </div>

      {/* ── How it works steps ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { n: '1', label: 'Copy prompt', icon: Copy, color: '#a78bfa' },
          { n: '2', label: 'Generate in Flow', icon: ExternalLink, color: '#60a5fa' },
          { n: '3', label: 'Upload MP4', icon: Upload, color: '#34d399' },
          { n: '4', label: 'Create final video', icon: Sparkles, color: '#fbbf24' },
        ].map(({ n, label, icon: Icon, color }) => (
          <div key={n} className="flex items-center gap-3 px-4 py-3 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-lg font-bold" style={{ color }}>{n}</span>
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
            <span className="text-xs text-gray-400 font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </motion.div>
      )}

      {/* ── Scene cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Scene Clips</h4>
          <button onClick={() => setAllExpanded(!allExpanded)}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
            {allExpanded ? <><ChevronUp className="w-3.5 h-3.5" />Collapse all</> : <><ChevronDown className="w-3.5 h-3.5" />Expand all</>}
          </button>
        </div>

        <div className="space-y-2">
          {(status?.scenes || dream?.scenes?.map((s) => ({
            sceneId: s.id,
            sceneNumber: s.scene_number,
            title: s.title,
            visualPrompt: s.visual_prompt,
            uploaded: false,
            videoUrl: null,
          })) || []).map((scene) => (
            <SceneUploadCard
              key={scene.sceneId}
              scene={{ ...scene, _expanded: allExpanded }}
              onUpload={handleUpload}
              uploading={uploading}
            />
          ))}
        </div>
      </div>

      {/* ── Assemble button ── */}
      <div className="pt-2">
        {!allUploaded && uploadedCount > 0 && (
          <p className="text-xs text-yellow-400/70 mb-3 text-center">
            {totalScenes - uploadedCount} scene{totalScenes - uploadedCount !== 1 ? 's' : ''} remaining — you can assemble with uploaded clips only, or upload all for a complete video.
          </p>
        )}
        <button
          onClick={handleAssemble}
          disabled={assembling || uploadedCount === 0}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: assembling
              ? 'rgba(124,58,237,0.4)'
              : uploadedCount === 0
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            border: uploadedCount === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            boxShadow: !assembling && uploadedCount > 0 ? '0 0 30px rgba(124,58,237,0.3)' : 'none',
          }}
        >
          {assembling ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white" />
              Assembling with FFmpeg...
            </>
          ) : (
            <>
              <Film className="w-5 h-5" />
              Create Final Video
              {uploadedCount > 0 && <span className="text-purple-200 text-sm">({uploadedCount} scene{uploadedCount !== 1 ? 's' : ''})</span>}
            </>
          )}
        </button>
        {uploadedCount === 0 && (
          <p className="text-center text-xs text-gray-600 mt-2">Upload at least one scene clip to enable assembly</p>
        )}
      </div>
    </div>
  );
}
