import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { api, type StudentStats, type ArchiveQuestion } from '../api';

export default function PersonalStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<ArchiveQuestion | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    Promise.all([
      api.getStudentStats(),
      api.getMe()
    ])
      .then(([statsData, meData]) => {
        setStats(statsData);
        setNickname(meData.nickname);
      })
      .catch((err) => {
        if (err?.status === 401 || err?.error === 'not_authenticated') {
          navigate('/auth');
        } else {
          setError('Could not load profile.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between relative">
      {/* Centered tactile editorial envelope */}
      <div className="student-wrap min-h-screen flex flex-col bg-[#FAF8F5] md:bg-transparent relative pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/60 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="student-wrap flex justify-between items-center py-2.5 px-5">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl font-semibold text-[#855300] tracking-tight">
                Profile
              </span>
            </div>
            {/* Minimal Back to Home Action */}
            <button
              onClick={() => navigate('/student')}
              className="px-2.5 py-1 text-xs font-bold rounded-full border border-[#D8C3AD]/60 text-[#867461] hover:text-[#18181B] bg-white/70 hover:bg-white shadow-[0_1px_0_#E2DDD2] transition-all active:translate-y-0.5 cursor-pointer"
            >
              Home ➔
            </button>
          </div>
        </header>

        <main className="px-5 pt-5 flex-1 flex flex-col">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin" />
            </div>
          ) : error ? (
            <div className="tactile-card rounded-xl p-5 text-center bg-[#FFF0EE] border-[#FFDAD4] text-[#B71607] font-sans text-sm font-semibold">
              {error}
            </div>
          ) : stats ? (
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col"
            >
              {/* Profile Header */}
              <section className="text-center mt-2 mb-8">
                <h1 className="font-serif text-3xl sm:text-4xl text-[#18181B] font-bold tracking-tight">
                  @{nickname}
                </h1>
                <div className="mt-3 inline-flex items-center gap-1.5 font-sans font-bold text-sm sm:text-base text-[#DB3320] bg-[#FFF0EE] border border-[#FFDAD4] px-4 py-1.5 rounded-full shadow-sm">
                  <span>🔥</span>
                  <span>{stats.currentStreak > 0 ? `${stats.currentStreak} day streak${stats.currentStreak !== 1 ? 's' : ''}` : '0 days'}</span>
                </div>
              </section>

              {/* Performance Stats */}
              <section>
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Points */}
                  <div className="tactile-card rounded-xl p-3 sm:p-4 bg-white border border-[#FDBA74] shadow-[0_3px_0_#FED7AA] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-xl sm:text-2xl tabular-nums text-[#B45309] leading-tight">
                      {stats.totalPoints}<span className="text-xs sm:text-sm font-bold text-[#D97706] ml-0.5">pts</span>
                    </div>
                    <div className="font-sans text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 text-[#855300]">
                      Total Points
                    </div>
                  </div>
                  {/* Accuracy */}
                  <div className="tactile-card rounded-xl p-3 sm:p-4 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-xl sm:text-2xl tabular-nums text-[#18181B] leading-tight">
                      {stats.accuracy}<span className="text-xs sm:text-sm font-bold text-[#867461] ml-0.5">%</span>
                    </div>
                    <div className="font-sans text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 text-[#867461]">
                      Accuracy
                    </div>
                  </div>
                  {/* Average Time */}
                  <div className="tactile-card rounded-xl p-3 sm:p-4 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-xl sm:text-2xl tabular-nums text-[#18181B] leading-tight">
                      {stats.avgTimeMs !== null ? (stats.avgTimeMs / 1000).toFixed(1) : '-'}<span className="text-xs sm:text-sm font-bold text-[#867461] ml-0.5">s</span>
                    </div>
                    <div className="font-sans text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 text-[#867461]">
                      Avg Time
                    </div>
                  </div>
                </div>
              </section>

              {/* Question Archive */}
              <section className="mt-8">
                <h2 className="font-serif text-2xl text-[#18181B] font-bold mb-4">Question Archive</h2>
                <div className="flex flex-col gap-3">
                  {!stats.questionArchive || stats.questionArchive.length === 0 ? (
                    <div className="tactile-card rounded-xl p-6 text-center bg-white border border-[#D8C3AD]/40 flex flex-col items-center">
                      <span className="text-3xl mb-2 opacity-80">🗄️</span>
                      <p className="font-sans text-sm text-[#867461] font-medium">No questions have been played yet.</p>
                    </div>
                  ) : (
                    stats.questionArchive.map((q, i) => (
                      <button
                        key={q.questionId}
                        onClick={() => setSelectedQuestion(q)}
                        className="w-full text-left tactile-card rounded-xl p-4 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] hover:border-[#867461] active:translate-y-1 active:shadow-none transition-all flex flex-col gap-2 cursor-pointer"
                      >
                         <div className="flex justify-between items-center w-full">
                            <span className="font-sans text-[11px] font-bold text-[#867461] uppercase tracking-wider">
                              Question {stats.questionArchive.length - i}
                            </span>
                            <span className="font-sans text-[11px] font-bold text-[#855300] bg-[#FFFBEB] px-2 py-0.5 rounded-full border border-[#F59E0B]/30 whitespace-nowrap">
                              +{q.points} pts ➔
                            </span>
                         </div>
                         <div className="font-serif text-base sm:text-lg text-[#18181B] font-medium leading-snug line-clamp-2 mt-0.5">
                           {q.text}
                         </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          ) : null}
        </main>

        {/* Bottom Navigation Bar: Docked to Mobile-Style Content Envelope */}
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 bg-white border-t border-[#E5E1D8] shadow-[0_-4px_16px_rgba(39,34,26,0.06)]">
          <div className="student-nav-items">
            {/* Home Tab */}
            <button
              onClick={() => navigate('/student')}
              className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-3 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
            >
              <span className="text-base leading-none">🎮</span>
              <span className="font-sans text-[11px] mt-0.5">Home</span>
            </button>
            
            {/* Compete Tab */}
            <button
              onClick={() => navigate('/social')}
              className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-3 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
            >
              <span className="text-base leading-none">🏆</span>
              <span className="font-sans text-[11px] mt-0.5">Compete</span>
            </button>

            {/* Leaderboard Tab */}
            <button
              onClick={() => navigate('/student/leaderboard')}
              className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-3 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
            >
              <span className="text-base leading-none">🏅</span>
              <span className="font-sans text-[11px] mt-0.5">Leaderboard</span>
            </button>

            {/* Profile Tab (ACTIVE) */}
            <button
              onClick={() => navigate('/stats')}
              className="flex flex-col items-center justify-center bg-[#F59E0B] text-[#613B00] rounded-xl px-4 py-1.5 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
            >
              <span className="text-base leading-none">👤</span>
              <span className="font-sans text-[11px] mt-0.5">Profile</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm"
            onClick={() => setSelectedQuestion(null)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#FAF8F5] w-full max-w-[430px] rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-4 sm:mb-0 border border-[#E5E1D8]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-5 py-4 border-b border-[#E5E1D8]">
                <h3 className="font-serif text-xl font-bold text-[#18181B]">Question Detail</h3>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="w-8 h-8 rounded-full bg-[#E5E1D8]/60 flex items-center justify-center text-[#534434] hover:bg-[#D8C3AD] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <div className="font-sans text-[11px] font-bold text-[#867461] uppercase tracking-wider mb-1.5">
                    Question
                  </div>
                  <div className="font-serif text-lg sm:text-xl text-[#18181B] leading-snug break-words font-medium">
                    {selectedQuestion.text}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#10B981]/30">
                  <div className="font-sans text-[11px] font-bold text-[#006C49] uppercase tracking-wider mb-1">
                    Correct Answer
                  </div>
                  <div className="font-sans text-base sm:text-lg font-bold text-[#065F46] break-words">
                    {selectedQuestion.correctAnswer}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
