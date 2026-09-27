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
          navigate('/');
        } else {
          setError('Could not load profile.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    await api.logoutStudent().catch(() => {});
    navigate('/');
  };

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between relative">
      {/* Widescreen 16:9 responsive container */}
      <div className="w-full min-h-screen flex flex-col bg-[#FAF8F5] relative pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/80 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="screen-container flex justify-between items-center py-3.5 sm:py-4">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#855300] tracking-tight">
                Profile & Telemetry
              </span>
            </div>
            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-full border border-[#FFDAD4] text-[#DB3320] hover:text-[#B71607] bg-white/70 hover:bg-[#FFF0EE] shadow-[0_1px_0_#FFDAD4] transition-all active:translate-y-0.5 cursor-pointer"
              >
                Logout
              </button>
              <button
                onClick={() => navigate('/student')}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-full border border-[#D8C3AD]/60 text-[#867461] hover:text-[#18181B] bg-white/70 hover:bg-white shadow-[0_1px_0_#E2DDD2] transition-all active:translate-y-0.5 cursor-pointer"
              >
                Home ➔
              </button>
            </div>
          </div>
        </header>

        <main className="screen-container pt-6 sm:pt-8 md:pt-10 flex-1 flex flex-col">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin" />
            </div>
          ) : error ? (
            <div className="tactile-card rounded-2xl p-6 text-center bg-[#FFF0EE] border-[#FFDAD4] text-[#B71607] font-sans text-sm font-semibold max-w-lg mx-auto">
              {error}
            </div>
          ) : stats ? (
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8"
            >
              {/* Profile Header */}
              <section className="text-center mt-2 mb-4">
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#18181B] font-bold tracking-tight">
                  @{nickname}
                </h1>
                <div className="mt-3 inline-flex items-center gap-2 font-sans font-bold text-sm sm:text-base text-[#DB3320] bg-[#FFF0EE] border border-[#FFDAD4] px-5 py-2 rounded-full shadow-sm">
                  <span className="text-lg">🔥</span>
                  <span>{stats.currentStreak > 0 ? `${stats.currentStreak} day streak${stats.currentStreak !== 1 ? 's' : ''}` : '0 days active'}</span>
                </div>
              </section>

              {/* Performance Stats: 6-item Grid on Large Screens */}
              <section>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
                  {/* Total Points */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#FDBA74] shadow-[0_3px_0_#FED7AA] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-2xl sm:text-3xl tabular-nums text-[#B45309] leading-tight">
                      {stats.totalPoints}<span className="text-xs sm:text-sm font-bold text-[#D97706] ml-0.5">pts</span>
                    </div>
                    <div className="font-sans text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 text-[#855300]">
                      Total Points
                    </div>
                  </div>
                  {/* Accuracy */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-2xl sm:text-3xl tabular-nums text-[#18181B] leading-tight">
                      {stats.accuracy}<span className="text-xs sm:text-sm font-bold text-[#867461] ml-0.5">%</span>
                    </div>
                    <div className="font-sans text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 text-[#867461]">
                      Accuracy
                    </div>
                  </div>
                  {/* Average Time */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-2xl sm:text-3xl tabular-nums text-[#18181B] leading-tight">
                      {stats.avgTimeMs !== null ? (stats.avgTimeMs / 1000).toFixed(1) : '-'}<span className="text-xs sm:text-sm font-bold text-[#867461] ml-0.5">s</span>
                    </div>
                    <div className="font-sans text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 text-[#867461]">
                      Avg Time
                    </div>
                  </div>
                  {/* Current Streak */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#FDBA74] shadow-[0_3px_0_#FED7AA] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-2xl sm:text-3xl tabular-nums text-[#DB3320] leading-tight">
                      {stats.currentStreak}<span className="text-xs sm:text-sm font-bold text-[#DB3320] ml-0.5">d</span>
                    </div>
                    <div className="font-sans text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 text-[#B71607]">
                      Current Streak
                    </div>
                  </div>
                  {/* Best Streak */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#E5E1D8] shadow-[0_3px_0_#E2DDD2] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-2xl sm:text-3xl tabular-nums text-[#855300] leading-tight">
                      {stats.bestStreak}<span className="text-xs sm:text-sm font-bold text-[#855300] ml-0.5">d</span>
                    </div>
                    <div className="font-sans text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 text-[#855300]">
                      Best Streak
                    </div>
                  </div>
                  {/* Archive Count */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#A7F3D0] shadow-[0_3px_0_#BBF7D0] flex flex-col items-center justify-center text-center">
                    <div className="font-sans font-extrabold text-2xl sm:text-3xl tabular-nums text-[#006C49] leading-tight">
                      {stats.questionArchive.length}
                    </div>
                    <div className="font-sans text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 text-[#006C49]">
                      Archived Qs
                    </div>
                  </div>
                </div>
              </section>

              {/* Question Archive: Multi-Column on Large Screens */}
              <section className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-2xl sm:text-3xl text-[#18181B] font-bold">Question Archive</h2>
                  {stats.questionArchive && (
                    <span className="font-sans text-xs sm:text-sm font-bold text-[#867461] bg-[#F0EDF1] px-3 py-1 rounded-full border border-[#E5E1D8]">
                      {stats.questionArchive.length} round{stats.questionArchive.length !== 1 ? 's' : ''} recorded
                    </span>
                  )}
                </div>

                {!stats.questionArchive || stats.questionArchive.length === 0 ? (
                  <div className="tactile-card rounded-2xl p-8 sm:p-12 text-center bg-white border border-[#D8C3AD]/40 flex flex-col items-center">
                    <span className="text-4xl mb-3 opacity-80">🗄️</span>
                    <p className="font-sans text-sm sm:text-base text-[#867461] font-medium">No questions have been played yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.questionArchive.map((q, i) => (
                      <button
                        key={q.questionId}
                        onClick={() => setSelectedQuestion(q)}
                        className="w-full text-left tactile-card rounded-2xl p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] hover:border-[#867461] active:translate-y-1 active:shadow-none transition-all flex flex-col justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-sans text-xs font-bold text-[#867461] uppercase tracking-wider">
                            Round {stats.questionArchive.length - i}
                          </span>
                          <span className="font-sans text-xs font-bold text-[#855300] bg-[#FFFBEB] px-2.5 py-1 rounded-full border border-[#F59E0B]/30 whitespace-nowrap">
                            +{q.points} pts ➔
                          </span>
                        </div>
                        <div className="font-serif text-base sm:text-lg text-[#18181B] font-medium leading-snug line-clamp-3">
                          {q.text}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          ) : null}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-center pb-safe px-3 sm:px-4">
          <div className="bottom-nav-dock flex justify-around items-center px-3 sm:px-6 py-2 sm:py-2.5 bg-white/95 backdrop-blur-md rounded-t-2xl border-t border-[#E5E1D8] shadow-[0_-4px_24px_rgba(39,34,26,0.08)]">
            {/* Home Tab */}
            <button
              onClick={() => navigate('/student')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]"
            >
              <span className="text-lg sm:text-xl leading-none">🎮</span>
              <span className="font-sans text-[11px] sm:text-xs md:text-sm">Home</span>
            </button>
            
            {/* Compete Tab */}
            <button
              onClick={() => navigate('/social')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]"
            >
              <span className="text-lg sm:text-xl leading-none">🏆</span>
              <span className="font-sans text-[11px] sm:text-xs md:text-sm">Compete</span>
            </button>

            {/* Leaderboard Tab */}
            <button
              onClick={() => navigate('/student/leaderboard')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]"
            >
              <span className="text-lg sm:text-xl leading-none">🏅</span>
              <span className="font-sans text-[11px] sm:text-xs md:text-sm">Leaderboard</span>
            </button>

            {/* Profile Tab (ACTIVE) */}
            <button
              onClick={() => navigate('/stats')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 bg-[#F59E0B] text-[#613B00] rounded-xl px-3.5 sm:px-5 py-1.5 sm:py-2 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
            >
              <span className="text-lg sm:text-xl leading-none">👤</span>
              <span className="font-sans text-[11px] sm:text-xs md:text-sm">Profile</span>
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm"
            onClick={() => setSelectedQuestion(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#FAF8F5] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#E5E1D8]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-6 py-5 border-b border-[#E5E1D8]">
                <h3 className="font-serif text-2xl font-bold text-[#18181B]">Question Detail</h3>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="w-9 h-9 rounded-full bg-[#E5E1D8]/60 flex items-center justify-center text-[#534434] hover:bg-[#D8C3AD] transition-colors cursor-pointer text-base"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
                <div>
                  <div className="font-sans text-xs font-bold text-[#867461] uppercase tracking-wider mb-2">
                    Question
                  </div>
                  <div className="font-serif text-xl sm:text-2xl text-[#18181B] leading-snug break-words font-medium">
                    {selectedQuestion.text}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-[#10B981]/30">
                  <div className="font-sans text-xs font-bold text-[#006C49] uppercase tracking-wider mb-1.5">
                    Correct Answer
                  </div>
                  <div className="font-sans text-lg sm:text-xl font-bold text-[#065F46] break-words">
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
