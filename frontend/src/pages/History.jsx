import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Film, CheckCircle, Clock, AlertCircle, Trash2, Eye, Sparkles, Search, Video
} from 'lucide-react';
import { getDreams, deleteDream, getDreamVideo } from '../services/api';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';

const statusConfig = {
  completed: { label: 'Completed', variant: 'green', icon: CheckCircle },
  processing: { label: 'Processing', variant: 'cyan', icon: Clock },
  pending: { label: 'Pending', variant: 'purple', icon: Clock },
  failed: { label: 'Failed', variant: 'red', icon: AlertCircle },
};

export default function History() {
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [videoStatuses, setVideoStatuses] = useState({}); // dreamId -> status

  useEffect(() => {
    getDreams()
      .then(({ dreams }) => {
        setDreams(dreams || []);
        // Load video status for completed dreams
        const completed = (dreams || []).filter((d) => d.status === 'completed');
        completed.forEach(async (d) => {
          try {
            const v = await getDreamVideo(d.id);
            if (v?.status) {
              setVideoStatuses((prev) => ({ ...prev, [d.id]: v.status }));
            }
          } catch {}
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (confirmId !== id) { setConfirmId(id); return; }
    setDeletingId(id);
    try {
      await deleteDream(id);
      setDreams((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const filtered = dreams.filter((d) => {
    const q = search.toLowerCase();
    return (
      !q ||
      d.title?.toLowerCase().includes(q) ||
      d.logline?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Dream History</h1>
          <p className="text-gray-400">All your visions, stored and ready.</p>
        </motion.div>

        {/* Search + Create */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your dreams..."
              className="input-field pl-10 w-full"
            />
          </div>
          <Link to="/create" className="btn-primary flex items-center justify-center gap-2 sm:w-auto px-6">
            <Sparkles className="w-4 h-4" />
            New Vision
          </Link>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex justify-center"><LoadingSpinner size="lg" text="Loading dreams..." /></div>
        ) : error ? (
          <div className="card text-center py-10">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 && !search ? (
          <EmptyState
            icon={Sparkles}
            title="No dreams yet"
            description="Your dream history will appear here once you create your first vision."
            actionLabel="Create Your First Vision"
            actionTo="/create"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No results found"
            description={`No dreams match "${search}"`}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((dream, i) => {
              const cfg = statusConfig[dream.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              const isDeleting = deletingId === dream.id;
              const isConfirm = confirmId === dream.id;

              return (
                <motion.div
                  key={dream.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card flex items-center gap-4 hover:border-purple-500/20 transition-all duration-300"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
                    <Film className="w-5 h-5 text-purple-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{dream.title || 'Untitled Dream'}</h3>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`w-3 h-3 ${dream.status === 'completed' ? 'text-green-400' : dream.status === 'failed' ? 'text-red-400' : 'text-cyan-400'}`} />
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      <Badge variant="purple">{dream.input_type === 'voice' ? '🎤' : '✍️'}</Badge>
                      {videoStatuses[dream.id] === 'completed' && (
                        <Badge variant="cyan">🎬 Video Ready</Badge>
                      )}
                      {videoStatuses[dream.id] === 'processing' && (
                        <Badge variant="gold">⏳ Generating</Badge>
                      )}
                    </div>
                    {dream.logline && (
                      <p className="text-gray-400 text-sm truncate">{dream.logline}</p>
                    )}
                    <p className="text-gray-600 text-xs mt-1">
                      {new Date(dream.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={`/dream/${dream.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      {videoStatuses[dream.id] === 'completed' ? (
                        <><Video className="w-4 h-4 text-purple-400" /><span className="hidden sm:inline text-purple-400">Watch</span></>
                      ) : (
                        <><Eye className="w-4 h-4" /><span className="hidden sm:inline">View</span></>
                      )}
                    </Link>
                    <button
                      onClick={() => handleDelete(dream.id)}
                      disabled={isDeleting}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                        isConfirm
                          ? 'text-white bg-red-500/20 border border-red-500/40'
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {isDeleting ? 'Deleting...' : isConfirm ? 'Confirm' : 'Delete'}
                      </span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Total count */}
        {!loading && filtered.length > 0 && (
          <p className="text-center text-gray-600 text-xs mt-6">
            {filtered.length} dream{filtered.length !== 1 ? 's' : ''} {search ? 'found' : 'total'}
          </p>
        )}
      </div>
    </div>
  );
}
