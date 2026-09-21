import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

export default function EntryPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans selection:bg-pink-500/30 flex items-center justify-center p-4">
      <main className="max-w-4xl w-full mx-auto relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>
            </div>
            <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
              QuizPop
            </h1>
          </div>
          <p className="text-xl text-neutral-400 font-medium">
            Welcome to QuizPop. Choose how you want to continue.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="group relative bg-neutral-800/50 backdrop-blur-md rounded-3xl p-8 border border-white/5 hover:border-pink-500/30 transition-all cursor-pointer flex flex-col items-center text-center overflow-hidden"
            onClick={() => navigate('/auth')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-violet-500/0 group-hover:from-pink-500/5 group-hover:to-violet-500/5 transition-colors" />
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Student Login</h2>
            <p className="text-neutral-400">
              Play quizzes, track your streak, and compete on the leaderboards.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="group relative bg-neutral-800/50 backdrop-blur-md rounded-3xl p-8 border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer flex flex-col items-center text-center overflow-hidden"
            onClick={() => navigate('/admin')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-blue-500/0 group-hover:from-violet-500/5 group-hover:to-blue-500/5 transition-colors" />
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Admin Login</h2>
            <p className="text-neutral-400">
              Manage questions, launches, and monitor quiz activity.
            </p>
          </motion.div>
        </div>
      </main>

      {/* Decorative background blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px]" />
      </div>
    </div>
  );
}
