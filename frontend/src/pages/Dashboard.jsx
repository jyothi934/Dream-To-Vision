import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Clock, CheckCircle, AlertCircle, Film, ChevronRight } from 'lucide-react';
import { useAuth } from '../store/authStore';
import { getDreams } from '../services/api';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';

const statusConfig = {
  completed: { label: 'Completed', variant: 'green', icon: CheckCircle },
  processing: { label: 'Processing', variant: 'cyan', icon: Clock },
  pending: { label: 'Pending', variant: 'purple', icon: Clock },
  failed: { label: 'Failed', variant: 'red', icon: AlertCircle },
};

function DreamCard({ dream, index }) {
  const cfg = statusConfig[dream.status] || statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link
        to={`/dream/${dream.id}`}
        className="card block hover:border-purple-500/30 transition-all duration-300 group"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
              <Film className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
              {dream.title || 'Untitled Dream'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Icon className={`w-3.5 h-3.5 ${dream.status === 'failed' ? 'text-red-400' : dream.status === 'completed' ? 'text-green-400' : 'text-cyan-400'}`} />
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>
        </div>

        {dream.logline && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">{dream.logline}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{new Date(dream.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="flex items-center gap-1 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
            View <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDreams()
      .then(({ dreams: d }) => setDreams(d || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const completed = dreams.filter((d) => d.status === 'completed').length;
  const processing = dreams.filter((d) => d.status === 'processing' || d.status === 'pending').length;
  const username = user?.email?.split('@')[0] || 'Dreamer';

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
            Welcome back, <span className="gradient-text">{username}</span>
          </h1>
          <p className="text-gray-400">Your dream visions are waiting.</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {[
            { label: 'Total Dreams', value: dreams.length, icon: Film, color: 'text-purple-400' },
            { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-green-400' },
            { label: 'Processing', value: processing, icon: Clock, color: 'text-cyan-400' },
            { label: 'This Month', value: dreams.filter(d => new Date(d.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length, icon: Sparkles, color: 'text-yellow-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
            </div>
          ))}
        </motion.div>

        {/* Create CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-10"
        >
          <Link
            to="/create"
            className="flex items-center gap-4 p-6 rounded-2xl group transition-all duration-300 hover:border-purple-500/40"
            style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.05))',
              border: '1px dashed rgba(124, 58, 237, 0.3)',
            }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-0.5">Create New Vision</h3>
              <p className="text-gray-400 text-sm">Describe a dream and let AI build your cinematic story</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 ml-auto group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </motion.div>

        {/* Dreams list */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Recent Dreams</h2>
            {dreams.length > 0 && (
              <Link to="/history" className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><LoadingSpinner size="lg" text="Loading dreams..." /></div>
          ) : error ? (
            <div className="card text-center py-10">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          ) : dreams.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No dreams yet"
              description="Create your first vision to see it here."
              actionLabel="Create Your First Vision"
              actionTo="/create"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dreams.slice(0, 6).map((dream, i) => (
                <DreamCard key={dream.id} dream={dream} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
