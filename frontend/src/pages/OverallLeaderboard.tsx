import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../api';
import type { OverallLeaderboardPeriod, OverallLeaderboardResponse } from '../api';

const formatTime = (ms: number) => {
  return `${(ms / 1000).toFixed(1)}s`;
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#E5E1D8] shadow-[0_2px_0_#E2DDD2]">
      <div className="w-8 h-8 rounded-full bg-[#F0EDF1]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded w-1/3 bg-[#F0EDF1]" />
        <div className="h-2 rounded w-1/4 bg-[#FAF8F5]" />
      </div>
      <div className="h-5 w-16 rounded-full bg-[#F0EDF1]" />
    </div>
  );
}

export default function OverallLeaderboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<OverallLeaderboardResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<OverallLeaderboardPeriod>('all-time');
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.getOverallLeaderboard(period)
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          if (err?.status === 401 || err?.error === 'not_authenticated') {
            navigate('/auth');
            return;
          }
          setError('Couldn\'t load the leaderboard.');
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [period, navigate]);

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between">
      {/* Centered tactile editorial envelope */}
      <div className="w-full max-w-[430px] sm:max-w-lg mx-auto min-h-screen flex flex-col bg-[#FAF8F5] relative shadow-[0_0_50px_rgba(39,34,26,0.06)] pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/60 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="flex justify-between items-center w-full px-5 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl font-semibold text-[#855300] tracking-tight">
                Competition
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

        <main className="px-5 pt-5 flex-1 flex flex-col gap-5">
          {/* Header section */}
          <section>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#18181B] font-bold tracking-tight leading-tight">
              Overall Leaderboard
            </h1>
            <p className="font-sans text-xs text-[#867461] mt-1 uppercase tracking-wider font-bold">
              Global Rankings
            </p>
          </section>

          {/* Period Tabs */}
          <div className="flex p-1 bg-[#E5E1D8]/40 rounded-xl border border-[#D8C3AD]/40" role="tablist">
            {(['daily', 'weekly', 'all-time'] as OverallLeaderboardPeriod[]).map((tab) => {
              const active = period === tab;
              const labels: Record<OverallLeaderboardPeriod, string> = {
                'daily': 'Daily',
                'weekly': 'Weekly',
                'all-time': 'All Time'
              };
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(tab)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    active 
                      ? 'bg-white text-[#18181B] shadow-sm border border-[#E5E1D8]' 
                      : 'text-[#867461] hover:text-[#534434] border border-transparent cursor-pointer'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-3 mt-2">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="tactile-card rounded-xl p-6 text-center bg-[#FFF0EE] border-[#FFDAD4] flex flex-col items-center mt-2">
              <span className="text-3xl mb-2">⚠️</span>
              <h3 className="font-sans text-sm font-bold text-[#B71607] mb-3">{error}</h3>
              <button 
                onClick={() => {
                  setLoading(true);
                  setError('');
                  api.getOverallLeaderboard(period)
                    .then((res) => { setData(res); setLoading(false); })
                    .catch(() => { setError('Couldn\'t load the leaderboard.'); setLoading(false); });
                }}
                className="px-4 py-1.5 rounded-lg bg-white text-[#B71607] border border-[#FFDAD4] shadow-sm text-xs font-bold active:translate-y-0.5 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : data && data.entries.length === 0 ? (
            <div className="tactile-card rounded-xl p-8 text-center bg-white border border-[#D8C3AD]/40 flex flex-col items-center mt-2">
              <span className="text-4xl mb-3 block opacity-90">🦗</span>
              <h3 className="font-serif text-lg font-bold text-[#18181B] leading-snug">No scores yet</h3>
              <p className="font-sans text-xs text-[#867461] mt-1 max-w-[200px]">
                Answer questions to appear on the leaderboard.
              </p>
            </div>
          ) : data ? (
            <div className="flex flex-col gap-3 mt-2">
              {data.entries.map((entry, i) => {
                return (
                  <motion.div
                    key={`${entry.nickname}-${entry.rank}`}
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all bg-white shadow-[0_3px_0_#E2DDD2] ${
                      entry.rank === 1 ? 'border-[#FDBA74]' : 'border-[#E5E1D8]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-sans font-bold text-sm flex-shrink-0 ${
                      entry.rank === 1 ? 'bg-[#F59E0B] text-[#613B00] border-[#D97706]' : 
                      entry.rank === 2 ? 'bg-[#E5E7EB] text-[#374151] border-[#D1D5DB]' :
                      entry.rank === 3 ? 'bg-[#FDE68A] text-[#92400E] border-[#FCD34D]' :
                      'bg-[#F0EDF1] text-[#534434] border border-[#E5E1D8]'
                    }`}>
                      {entry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-bold text-sm truncate text-[#18181B]">
                        {entry.nickname}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 font-sans text-xs font-semibold">
                        <span className="text-[#867461]">
                          {formatTime(entry.averageTimeMs)} avg
                        </span>
                        {entry.currentStreak > 0 && (
                          <span className="text-[#DB3320]">
                            🔥 {entry.currentStreak} day streak{entry.currentStreak !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 pl-2">
                      <div className="font-sans font-extrabold text-xl tabular-nums text-[#B45309]">
                        {entry.score}<span className="text-xs ml-0.5 font-bold text-[#867461]">pts</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : null}
        </main>

        {/* Bottom Navigation Bar: Docked to Mobile-Style Content Envelope */}
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-around items-center px-2 py-2 max-w-[430px] sm:max-w-lg mx-auto pb-safe bg-white rounded-t-xl border-t border-[#E5E1D8] shadow-[0_-4px_16px_rgba(39,34,26,0.06)]">
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

          {/* Leaderboard Tab (ACTIVE) */}
          <button
            onClick={() => navigate('/student/leaderboard')}
            className="flex flex-col items-center justify-center bg-[#F59E0B] text-[#613B00] rounded-xl px-4 py-1.5 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">🏅</span>
            <span className="font-sans text-[11px] mt-0.5">Leaderboard</span>
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => navigate('/stats')}
            className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-3 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">👤</span>
            <span className="font-sans text-[11px] mt-0.5">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
