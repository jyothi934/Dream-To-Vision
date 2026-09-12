import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mic, MicOff, AlertCircle, Brain, Film, Users,
  Clapperboard, ChevronRight, CheckCircle
} from 'lucide-react';
import { createDream, analyzeDream } from '../services/api';
import { useVoiceInput } from '../hooks/useVoiceInput';

// Phase 1 pipeline steps only — video is done manually via Google Flow
const STEPS = [
  { icon: Brain,        label: 'Analyzing dream',    phase: 1 },
  { icon: Film,         label: 'Crafting story',     phase: 1 },
  { icon: Users,        label: 'Building characters',phase: 1 },
  { icon: Clapperboard, label: 'Generating scenes',  phase: 1 },
];

export default function CreateDream() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [inputType, setInputType] = useState('text');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const stepIntervalRef = useRef(null);

  const handleTranscript = useCallback((transcript) => {
    setText(transcript);
    setInputType('voice');
  }, []);

  const { isListening, isSupported, error: voiceError, toggle } = useVoiceInput({ onTranscript: handleTranscript });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) { setError('Please describe your dream first.'); return; }
    if (trimmed.length < 10) { setError('Please provide at least 10 characters.'); return; }

    setError('');
    setLoading(true);
    setStep(0);
    setCompletedSteps([]);

    // Animate through steps 0-3 while AI runs (~6s each)
    let i = 0;
    stepIntervalRef.current = setInterval(() => {
      i = Math.min(i + 1, 3);
      setStep(i);
    }, 6000);

    try {
      const { dream } = await createDream(trimmed, inputType);
      const { dream: result } = await analyzeDream(dream.id);

      clearInterval(stepIntervalRef.current);
      setCompletedSteps([0, 1, 2, 3]);

      // Navigate to result — user will use Google Flow to create the video
      navigate(`/dream/${result.id}`);

    } catch (err) {
      clearInterval(stepIntervalRef.current);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
      setCompletedSteps([]);
    }
  };

  const charCount = text.length;
  const isValid = charCount >= 10 && charCount <= 5000;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="max-w-3xl mx-auto relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6"
               style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#a78bfa' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Gemini AI + Kling Video Generation
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            Turn Your Dream Into a <span className="gradient-text">Vision</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Describe your dream. AI will analyze it, build the story, and automatically generate your cinematic video.
          </p>
        </motion.div>

        {/* Full-screen generation overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              style={{ background: 'rgba(5, 8, 16, 0.97)', backdropFilter: 'blur(20px)' }}
            >
              <div className="text-center w-full max-w-md">
                {/* Active step icon */}
                <motion.div
                  key={step}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  {(() => { const Icon = STEPS[step]?.icon || Sparkles; return <Icon className="w-10 h-10 text-white" />; })()}
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-1">{STEPS[step]?.label}...</h2>
                <p className="text-gray-400 text-sm mb-8">
                  {step < 4 ? 'Building your cinematic universe' : 'Kicking off AI video generation — sit back'}
                </p>

                {/* Step pipeline */}
                <div className="space-y-2 text-left">
                  {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isDone = completedSteps.includes(i);
                    const isCurrent = i === step && !isDone;
                    const isPending = i > step && !isDone;

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                        style={{
                          background: isDone
                            ? 'rgba(52,211,153,0.07)'
                            : isCurrent
                            ? 'rgba(124,58,237,0.12)'
                            : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isDone ? 'rgba(52,211,153,0.2)' : isCurrent ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)'}`,
                        }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                             style={{ background: isDone ? 'rgba(52,211,153,0.2)' : isCurrent ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)' }}>
                          {isDone ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : isCurrent ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-4 h-4 rounded-full border-2 border-purple-400/30 border-t-purple-400"
                            />
                          ) : (
                            <Icon className={`w-4 h-4 ${isPending ? 'text-gray-600' : 'text-purple-400'}`} />
                          )}
                        </div>

                        <span className={`text-sm font-medium flex-1 ${isDone ? 'text-green-400' : isCurrent ? 'text-white' : 'text-gray-500'}`}>
                          {s.label}
                        </span>

                        {s.phase === 2 && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                            Video AI
                          </span>
                        )}

                        <span className={`text-xs ${isDone ? 'text-green-400' : isCurrent ? 'text-purple-400' : 'text-gray-600'}`}>
                          {isDone ? '✓' : isCurrent ? '...' : ''}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-600 mt-6">
                  Video generation continues in the background — you'll see live progress on the result page
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleSubmit}>
            <div className="card mb-4">
              {/* Voice / Text toggle */}
              <div className="flex items-center gap-2 mb-4">
                <button type="button" onClick={() => setInputType('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    inputType === 'text' ? 'text-white bg-purple-600/30 border border-purple-500/40' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                  Text
                </button>
                <button type="button" onClick={() => setInputType('voice')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    inputType === 'voice' ? 'text-white bg-purple-600/30 border border-purple-500/40' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <Mic className="w-3.5 h-3.5" /> Voice
                </button>
                {!isSupported && <span className="text-xs text-yellow-400 ml-2">Voice not supported in this browser</span>}
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Describe your dream, vision, or story in detail...\n\nExample: "I was flying over a glowing neon city at night, being chased by shadowy figures. I landed on a floating island where an ancient woman handed me a golden key and told me I was chosen to unlock the door between worlds..."`}
                  rows={8}
                  maxLength={5000}
                  className="input-field resize-none text-base leading-relaxed"
                  disabled={loading}
                />
                {isSupported && (
                  <button type="button" onClick={toggle} disabled={loading}
                    className={`absolute bottom-3 right-3 p-2.5 rounded-xl transition-all duration-200 ${
                      isListening ? 'text-white animate-pulse-slow' : 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10'
                    }`}
                    style={isListening ? { background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' } : {}}
                    title={isListening ? 'Stop recording' : 'Start voice input'}>
                    {isListening ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 px-1">
                <div>
                  {isListening && (
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                      className="flex items-center gap-2 text-red-400 text-xs">
                      <div className="w-2 h-2 rounded-full bg-red-400" /> Listening...
                    </motion.div>
                  )}
                </div>
                <span className={`text-xs ${charCount > 4900 ? 'text-red-400' : 'text-gray-500'}`}>{charCount} / 5000</span>
              </div>
            </div>

            {/* Errors */}
            {(voiceError || error) && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300 mb-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{voiceError || error}
              </motion.div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {isSupported && (
                <button type="button" onClick={toggle} disabled={loading}
                  className={`btn-secondary flex items-center justify-center gap-2 sm:w-40 ${isListening ? 'border-red-500/40 text-red-400' : ''}`}>
                  {isListening ? <><MicOff className="w-4 h-4" />Stop</> : <><Mic className="w-4 h-4" />Use Voice</>}
                </button>
              )}
              <button type="submit" disabled={loading || !isValid}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <><motion.div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white"
                    animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  Creating your vision...</>
                ) : (
                  <><Sparkles className="w-5 h-5" />Create My Vision<ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* What you get */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Brain,        label: 'AI Analysis' },
            { icon: Film,         label: 'Story + Logline' },
            { icon: Users,        label: 'Characters' },
            { icon: Clapperboard, label: '6 Scenes + Prompts' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-xl text-center"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Icon className="w-5 h-5 text-purple-400" />
              <span className="text-xs text-gray-400 font-medium">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
