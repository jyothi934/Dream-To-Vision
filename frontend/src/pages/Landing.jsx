import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Mic, Brain, Film, Users, ChevronRight, Star } from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI Dream Analysis', desc: 'Gemini AI extracts themes, emotions, characters, and symbols from your raw dream narrative.' },
  { icon: Film, title: 'Cinematic Story', desc: 'Your dream becomes a fully structured cinematic narrative with a compelling logline.' },
  { icon: Users, title: 'Character Profiles', desc: 'Every character gets a detailed visual and personality description, ready for production.' },
  { icon: Sparkles, title: 'Scene Breakdown', desc: '6 cinematic scenes with camera angles, lighting, and AI-ready visual prompts.' },
  { icon: Mic, title: 'Voice Input', desc: 'Speak your dream directly — no typing required. Voice converts to text instantly.' },
  { icon: Star, title: 'Dream History', desc: 'All your visions are stored and accessible. Pick up where you left off anytime.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-20 px-4 sm:px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-8"
          style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#a78bfa' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Google Gemini AI
        </motion.div>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
        >
          Turn Your{' '}
          <span className="gradient-text">Dream</span>
          <br />
          Into a{' '}
          <span className="gradient-text">Vision</span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
        >
          Describe your dream in words or voice. Our AI transforms it into a complete cinematic
          narrative — story, characters, scenes, and visual prompts.
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/signup" className="btn-primary flex items-center gap-2 text-base px-8 py-3.5">
            Start Creating <ChevronRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-secondary flex items-center gap-2 text-base px-8 py-3.5">
            Sign In
          </Link>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-16 max-w-4xl mx-auto"
        >
          <div className="card glow-purple p-8 text-left"
               style={{ background: 'rgba(13, 17, 23, 0.9)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-gray-500 text-xs ml-2">dream-vision-ai</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-purple-400 text-sm font-mono">INPUT</span>
                <p className="text-gray-300 text-sm italic">"I was flying over a neon city, chased by shadowy figures, when I landed on a floating island where an old woman gave me a glowing key..."</p>
              </div>
              <div className="border-t border-white/5 pt-3">
                <span className="text-cyan-400 text-sm font-mono">AI OUTPUT</span>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['✦ Analysis', '✦ Story', '✦ Characters', '✦ 6 Scenes'].map((item) => (
                    <div key={item} className="px-3 py-2 rounded-lg text-xs text-purple-300"
                         style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              One pipeline from raw dream to cinematic vision. No prompting required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card hover:border-purple-500/30 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to see your dream?
          </h2>
          <p className="text-gray-400 mb-8">Create your first vision in under a minute.</p>
          <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-base px-10 py-4">
            <Sparkles className="w-5 h-5" />
            Get Started Free
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
