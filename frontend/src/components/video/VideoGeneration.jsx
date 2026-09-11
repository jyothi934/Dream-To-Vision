import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, Play, Download, RefreshCw, XCircle, CheckCircle,
  Clock, Clapperboard, AlertCircle, Sparkles, Volume2, VolumeX,
  Maximize, Pause
} from 'lucide-react';
import {
  generateVideo,
  getVideoProgress,
  getDreamVideo,
  cancelVideoGeneration,
} from '../../services/api';

// ─── Video Player ─────────────────────────────────────────────────────────────

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
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(pct || 0);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) videoRef.current.requestFullscreen();
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'dream-vision'}.mp4`;
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
      style={{ background: '#000', border: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 0 60px rgba(124,58,237,0.2)' }}
    >
      {/* Title bar */}
      <div className="px-5 py-3 flex items-center justify-between"
           style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.1))' }}>
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">{title || 'Your Cinematic Vision'}</span>
        </div>
        <span className="text-xs text-green-400 font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Ready
        </span>
      </div>

      {/* Video */}
      <div
        className="relative bg-black cursor-pointer"
        onMouseMove={resetHideTimer}
        onClick={togglePlay}
        style={{ aspectRatio: '16/9' }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          muted={muted}
          playsInline
        />

        {/* Play overlay when paused */}
        <AnimatePresence>
          {!playing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                   style={{ background: 'rgba(124,58,237,0.8)', backdropFilter: 'blur(8px)' }}>
                <Play className="w-7 h-7 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 p-4"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress bar */}
              <div
                className="w-full h-1.5 rounded-full mb-3 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.2)' }}
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}
                />
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
                <button onClick={handleFullscreen} className="text-white hover:text-purple-300 transition-colors">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="p-4 flex items-center gap-3"
           style={{ background: 'rgba(0,0,0,0.6)' }}>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          <Download className="w-4 h-4" />
          Download Video
        </button>
        <span className="text-xs text-gray-500">
          {duration > 0 ? `${Math.round(duration)}s · MP4 · 16:9` : 'MP4 · 16:9'}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Progress Screen ──────────────────────────────────────────────────────────

function GenerationProgress({ generation, sceneCount, onCancel }) {
  const pct = generation?.progress || 0;
  const completed = generation?.completedScenes || 0;
  const current = generation?.currentScene || 0;
  const total = generation?.totalScenes || sceneCount || 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(124,58,237,0.25)' }}
    >
      {/* Header */}
      <div className="px-6 py-5 text-center border-b border-white/5">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          <Clapperboard className="w-7 h-7 text-white" />
        </motion.div>
        <h3 className="text-xl font-bold text-white mb-1">Creating Your Vision</h3>
        <p className="text-gray-400 text-sm">
          {current > 0 && current <= total
            ? `Generating scene ${current} of ${total}...`
            : 'Preparing video pipeline...'}
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">Overall Progress</span>
          <span className="text-xs font-bold text-purple-400">{pct}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #60a5fa)' }}
          />
        </div>
      </div>

      {/* Scene status list */}
      <div className="px-6 pb-5 space-y-2">
        {Array.from({ length: total }, (_, i) => {
          const sceneNum = i + 1;
          const isDone = sceneNum <= completed;
          const isCurrent = sceneNum === current && !isDone;
          const isPending = sceneNum > current;

          return (
            <motion.div
              key={sceneNum}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                background: isDone
                  ? 'rgba(52,211,153,0.06)'
                  : isCurrent
                  ? 'rgba(124,58,237,0.12)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isDone ? 'rgba(52,211,153,0.2)' : isCurrent ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{
                     background: isDone ? 'rgba(52,211,153,0.2)' : isCurrent ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                   }}>
                {isDone ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : isCurrent ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 rounded-full border-2 border-purple-400/30 border-t-purple-400"
                  />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-gray-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isDone ? 'text-green-400' : isCurrent ? 'text-white' : 'text-gray-500'}`}>
                  Scene {sceneNum}
                </span>
              </div>

              <span className={`text-xs ${isDone ? 'text-green-400' : isCurrent ? 'text-purple-400' : 'text-gray-600'}`}>
                {isDone ? '✓ Done' : isCurrent ? 'Generating...' : 'Waiting'}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Cancel */}
      <div className="px-6 pb-5">
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 transition-all hover:bg-red-400/10"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <XCircle className="w-4 h-4" />
          Cancel Generation
        </button>
        <p className="text-center text-xs text-gray-600 mt-2">
          Each scene takes ~2–3 minutes · Don't close this page
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function VideoGeneration({ dream, autoStarted = false }) {
  const [videoStatus, setVideoStatus] = useState(null);  // null = not loaded yet
  const [generation, setGeneration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const dreamId = dream?.id;
  const sceneCount = dream?.scenes?.length || 6;
  const dreamTitle = dream?.title;

  // ── Load existing video status on mount ─────────────────
  useEffect(() => {
    if (!dreamId) return;
    getDreamVideo(dreamId)
      .then((data) => {
        setVideoStatus(data);
        // Auto-poll if video is already generating (came from CreateDream)
        // or if there's an active generation in DB
        if (data?.id && ['pending', 'processing'].includes(data?.status)) {
          setGeneration(data);
          startPolling(data.id);
        } else if (autoStarted && (!data || data.status === 'none')) {
          // Video was just started but DB not updated yet — poll the dream video endpoint
          setVideoStatus({ status: 'processing', totalScenes: dream?.scenes?.length || 6 });
          // Poll for generation to appear
          const checkInterval = setInterval(async () => {
            try {
              const latest = await getDreamVideo(dreamId);
              if (latest?.id) {
                clearInterval(checkInterval);
                setVideoStatus(latest);
                setGeneration(latest);
                if (['pending', 'processing'].includes(latest.status)) {
                  startPolling(latest.id);
                }
              }
            } catch {}
          }, 3000);
          // Clean up after 30s if nothing found
          setTimeout(() => clearInterval(checkInterval), 30000);
        }
      })
      .catch(() => setVideoStatus(null))
      .finally(() => setLoading(false));

    return () => stopPolling();
  }, [dreamId, autoStarted]);

  const startPolling = useCallback((genId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await getVideoProgress(genId);
        setGeneration(data);
        setVideoStatus(data);
        if (['completed', 'failed', 'cancelled'].includes(data.status)) {
          stopPolling();
        }
      } catch {}
    }, 5000);
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // ── Start generation ─────────────────────────────────────
  const handleGenerate = async () => {
    setStarting(true);
    setError('');
    try {
      const result = await generateVideo(dreamId);
      setGeneration({ ...result, completedScenes: 0, currentScene: 0, totalScenes: sceneCount, progress: 0 });
      setVideoStatus({ status: 'processing', ...result });
      startPolling(result.generationId);
    } catch (err) {
      setError(err.message || 'Failed to start video generation');
    } finally {
      setStarting(false);
    }
  };

  // ── Cancel ───────────────────────────────────────────────
  const handleCancel = async () => {
    if (!generation?.id && !generation?.generationId) return;
    const genId = generation.id || generation.generationId;
    try {
      await cancelVideoGeneration(genId);
      stopPolling();
      setVideoStatus({ status: 'cancelled' });
      setGeneration(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Retry ────────────────────────────────────────────────
  const handleRetry = () => {
    setVideoStatus(null);
    setGeneration(null);
    setError('');
    handleGenerate();
  };

  // ── Render states ────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 rounded-full border-2 border-purple-400/30 border-t-purple-400 mx-auto" />
      </div>
    );
  }

  const status = videoStatus?.status;
  const genId = generation?.id || generation?.generationId;

  return (
    <div>
      {/* ── Idle / No video yet ── */}
      {(!status || status === 'none' || status === 'cancelled') && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.04))', border: '1px dashed rgba(124,58,237,0.3)' }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
               style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.15))' }}>
            <Film className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Turn Your Dream Into a Cinematic Video</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Our AI will generate a real video clip for each scene and combine them into one final cinematic MP4.
          </p>
          <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
            {[`${sceneCount} AI Video Clips`, 'Character Consistent', 'FFmpeg Assembly', 'Downloadable MP4'].map((f) => (
              <span key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                <CheckCircle className="w-3.5 h-3.5 text-purple-400" />{f}
              </span>
            ))}
          </div>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-300 flex items-center gap-2"
                 style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={starting}
            className="btn-primary flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3.5 text-base"
          >
            {starting ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white" />
                Starting...
              </>
            ) : (
              <><Sparkles className="w-5 h-5" />Generate Cinematic Video</>
            )}
          </button>
          <p className="text-xs text-gray-600 mt-3">Takes ~15–20 minutes · Runs in background</p>
        </motion.div>
      )}

      {/* ── Processing ── */}
      {(status === 'processing' || status === 'pending') && (
        <GenerationProgress
          generation={generation}
          sceneCount={sceneCount}
          onCancel={handleCancel}
        />
      )}

      {/* ── Completed ── */}
      {status === 'completed' && videoStatus?.finalVideoUrl && (
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-300 text-sm font-semibold">Your dream has become a vision</p>
              <p className="text-green-400/60 text-xs">
                {videoStatus.duration ? `${videoStatus.duration}s · ` : ''}{sceneCount} scenes combined into one cinematic video
              </p>
            </div>
            <button onClick={handleRetry} className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
              <RefreshCw className="w-3.5 h-3.5" />Regenerate
            </button>
          </motion.div>
          <CinematicPlayer videoUrl={videoStatus.finalVideoUrl} title={dreamTitle} />
        </div>
      )}

      {/* ── Failed ── */}
      {status === 'failed' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(13,17,23,0.9)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Video Generation Failed</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            {videoStatus?.errorMessage || 'An error occurred during video generation.'}
          </p>
          <button onClick={handleRetry} className="btn-primary flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" />Retry Generation
          </button>
        </motion.div>
      )}
    </div>
  );
}
