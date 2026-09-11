import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Film, Users, Clapperboard, ArrowLeft, Trash2, AlertCircle,
  Camera, Sun, Wind, MapPin, Heart, Zap, Sparkles, Clock, CheckCircle,
  ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { getDream, deleteDream } from '../services/api';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import VideoGeneration from '../components/video/VideoGeneration';

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-4"
    >
      <button
        className="w-full flex items-center justify-between mb-0 group"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
            <Icon className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">{title}</h2>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="mt-5">{children}</div>}
    </motion.div>
  );
}

function TagList({ items, variant = 'purple' }) {
  if (!items?.length) return <p className="text-gray-500 text-sm italic">None identified</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => <Badge key={i} variant={variant}>{item}</Badge>)}
    </div>
  );
}

function CharacterCard({ character }) {
  return (
    <div className="p-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
             style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          {character.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h4 className="font-semibold text-white">{character.name || 'Unknown'}</h4>
          <span className="text-xs text-purple-400">{character.role || 'Character'}</span>
        </div>
        {character.age_range && <Badge variant="cyan">{character.age_range}</Badge>}
      </div>

      <div className="space-y-3 text-sm">
        {character.appearance && (
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Appearance</span>
            <p className="text-gray-300 leading-relaxed">{character.appearance}</p>
          </div>
        )}
        {character.personality && (
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Personality</span>
            <p className="text-gray-300 leading-relaxed">{character.personality}</p>
          </div>
        )}
        {character.clothing && (
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Clothing</span>
            <p className="text-gray-300 leading-relaxed">{character.clothing}</p>
          </div>
        )}
        {character.visual_description && (
          <div className="pt-2 border-t border-white/5">
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Visual Description</span>
            <p className="text-gray-400 text-xs leading-relaxed italic">{character.visual_description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SceneCard({ scene }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="px-5 py-4"
           style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.08))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-purple-400/60">
              {String(scene.scene_number).padStart(2, '0')}
            </span>
            <div>
              <h4 className="font-semibold text-white">{scene.title}</h4>
              {scene.duration && <span className="text-xs text-gray-500">{scene.duration}s</span>}
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-white transition-colors p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="px-5 py-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {scene.description && <p className="text-gray-300 text-sm leading-relaxed mb-4">{scene.description}</p>}

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {scene.camera_angle && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Eye className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>{scene.camera_angle}</span>
            </div>
          )}
          {scene.camera_movement && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Wind className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>{scene.camera_movement}</span>
            </div>
          )}
          {scene.lighting && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Sun className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span>{scene.lighting}</span>
            </div>
          )}
          {scene.mood && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Heart className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
              <span>{scene.mood}</span>
            </div>
          )}
          {scene.environment && (
            <div className="flex items-center gap-2 text-xs text-gray-400 col-span-2">
              <MapPin className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              <span>{scene.environment}</span>
            </div>
          )}
        </div>

        {scene.characters?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {scene.characters.map((c, i) => <Badge key={i} variant="cyan">{c}</Badge>)}
          </div>
        )}

        {/* Visual prompt (expandable) */}
        {scene.visual_prompt && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              {expanded ? 'Hide' : 'Show'} visual prompt
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-4 rounded-xl"
                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">AI Visual Prompt</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">{scene.visual_prompt}</p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DreamResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoStarted = searchParams.get('video') === 'started';
  const [dream, setDream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getDream(id)
      .then(({ dream }) => setDream(dream))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteDream(id);
      navigate('/history');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <PageLoader text="Loading your vision..." />;

  if (error) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="card text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const analysis = dream?.analysis || {};
  const statusConfig = {
    completed: { label: 'Completed', variant: 'green', icon: CheckCircle },
    processing: { label: 'Processing', variant: 'cyan', icon: Clock },
    failed: { label: 'Failed', variant: 'red', icon: AlertCircle },
  };
  const sc = statusConfig[dream.status] || statusConfig.processing;
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="max-w-4xl mx-auto relative z-10">

        {/* Back + actions */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/history" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
              confirmDelete
                ? 'text-white bg-red-500/20 border border-red-500/40 hover:bg-red-500/30'
                : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>

        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.06))' }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon className={`w-4 h-4 ${dream.status === 'completed' ? 'text-green-400' : dream.status === 'failed' ? 'text-red-400' : 'text-cyan-400'}`} />
                <Badge variant={sc.variant}>{sc.label}</Badge>
                <Badge variant="purple">{dream.input_type === 'voice' ? '🎤 Voice' : '✍️ Text'}</Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{dream.title || 'Untitled Dream'}</h1>
            </div>
            <div className="text-xs text-gray-500 flex-shrink-0 text-right">
              {new Date(dream.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {dream.logline && (
            <p className="text-lg text-gray-300 italic leading-relaxed border-l-2 border-purple-500/40 pl-4">
              {dream.logline}
            </p>
          )}

          {analysis.summary && (
            <p className="text-gray-400 text-sm leading-relaxed mt-4">{analysis.summary}</p>
          )}

          {/* Theme + Mood + Visual Style */}
          <div className="flex flex-wrap gap-3 mt-4">
            {analysis.theme && <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /><span className="text-sm text-gray-300">{analysis.theme}</span></div>}
            {analysis.mood && <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-pink-400" /><span className="text-sm text-gray-300">{analysis.mood}</span></div>}
            {analysis.visualStyle && <div className="flex items-center gap-2"><Camera className="w-4 h-4 text-cyan-400" /><span className="text-sm text-gray-300">{analysis.visualStyle}</span></div>}
          </div>
        </motion.div>

        {/* Analysis section */}
        {analysis && Object.keys(analysis).length > 0 && (
          <Section title="Dream Analysis" icon={Brain}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Emotions</h4>
                <TagList items={analysis.emotions} variant="gold" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Settings</h4>
                <TagList items={analysis.settings} variant="cyan" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Key Events</h4>
                <TagList items={analysis.events} variant="green" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Visual Elements</h4>
                <TagList items={analysis.visualElements} variant="purple" />
              </div>
            </div>
          </Section>
        )}

        {/* Story section */}
        {dream.story && (
          <Section title="Cinematic Story" icon={Film}>
            <div className="prose prose-invert max-w-none">
              {dream.story.split('\n\n').map((para, i) => (
                <p key={i} className="text-gray-300 leading-relaxed text-base mb-4 last:mb-0">{para}</p>
              ))}
            </div>
          </Section>
        )}

        {/* Characters section */}
        {dream.characters?.length > 0 && (
          <Section title={`Characters (${dream.characters.length})`} icon={Users}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dream.characters.map((char) => (
                <CharacterCard key={char.id} character={char} />
              ))}
            </div>
          </Section>
        )}

        {/* Scenes section */}
        {dream.scenes?.length > 0 && (
          <Section title={`Cinematic Scenes (${dream.scenes.length})`} icon={Clapperboard}>
            <div className="space-y-4">
              {dream.scenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Phase 2: Video Generation ── */}
        {dream.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card mb-4"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
                <Film className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Your Cinematic Vision</h2>
            </div>
            <VideoGeneration dream={dream} autoStarted={videoStarted} />
          </motion.div>
        )}

        {/* Raw input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-3">
            <Sparkles className="w-4 h-4 text-gray-500" /> Original Dream Input
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed italic">{dream.raw_input}</p>
        </motion.div>

      </div>
    </div>
  );
}
