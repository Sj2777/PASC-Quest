import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../api';
import type { OverallLeaderboardPeriod, OverallLeaderboardResponse } from '../api';
import { useLeaderboardWebSocket } from '../useWebSocket';

const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

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
  const [me, setMe] = useState<{ nickname: string } | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const fetchLeaderboard = useCallback((silent = false) => {
    let active = true;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    api.getOverallLeaderboard(period)
      .then((res) => {
        if (active) {
          setData(res);
          if (!silent) setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          if (err?.status === 401 || err?.error === 'not_authenticated') {
            navigate('/');
            return;
          }
          if (!silent) {
            setError('Couldn\'t load the leaderboard.');
            setLoading(false);
          }
        }
      });
    return () => { active = false; };
  }, [period, navigate]);

  useEffect(() => {
    api.getMe().then((res) => setMe(res)).catch(() => {});
    const cleanup = fetchLeaderboard(false);
    return cleanup;
  }, [fetchLeaderboard]);

  useLeaderboardWebSocket((event) => {
    if (event.scope === 'overall') {
      fetchLeaderboard(true);
    }
  });

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between pb-safe">
      <div className="w-full min-h-screen flex flex-col bg-[#FAF8F5] relative pb-28">
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/80 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="screen-container flex justify-between items-center py-3.5 sm:py-4">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#855300] tracking-tight">Competition Hall</span>
            </div>
            <button onClick={() => navigate('/student')} className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-full border border-[#D8C3AD]/60 text-[#867461] hover:text-[#18181B] bg-white/70 hover:bg-white shadow-[0_1px_0_#E2DDD2] transition-all active:translate-y-0.5 cursor-pointer">
              Home ➔
            </button>
          </div>
        </header>

        <main className="screen-container max-w-4xl mx-auto pt-6 sm:pt-8 md:pt-10 flex-1 flex flex-col gap-6 sm:gap-8">
          <section className="text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#18181B] font-extrabold tracking-tight leading-tight">Overall Leaderboard</h1>
              <p className="font-sans text-xs sm:text-sm text-[#867461] mt-1 uppercase tracking-wider font-bold">Campus-wide Hall of Fame & Cumulative Standings</p>
            </div>
            <div className="inline-flex self-center sm:self-auto p-1 bg-[#E5E1D8]/60 rounded-xl border border-[#D8C3AD]/40 shadow-inner" role="tablist">
              {(['daily', 'weekly', 'all-time'] as OverallLeaderboardPeriod[]).map((tab) => {
                const active = period === tab;
                const labels: Record<OverallLeaderboardPeriod, string> = { 'daily': 'Daily', 'weekly': 'Weekly', 'all-time': 'All-Time' };
                return (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPeriod(tab)}
                    className={`px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${active ? 'bg-gradient-to-r from-[#F59E0B] to-[#FDBA74] text-[#613B00] shadow-sm border border-[#F59E0B]' : 'text-[#867461] hover:text-[#534434] border border-transparent cursor-pointer'}`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>
          </section>

          {loading ? (
            <div className="space-y-3 mt-2">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="tactile-card rounded-2xl p-8 text-center bg-[#FFF0EE] border-[#FFDAD4] flex flex-col items-center mt-2">
              <span className="text-4xl mb-3">⚠️</span>
              <h3 className="font-sans text-base font-bold text-[#B71607] mb-2">{error}</h3>
              <button onClick={() => { setLoading(true); setError(''); api.getOverallLeaderboard(period).then((res) => { setData(res); setLoading(false); }).catch(() => { setError('Couldn\'t load the leaderboard.'); setLoading(false); }); }} className="px-5 py-2 rounded-xl bg-white text-[#B71607] border border-[#FFDAD4] shadow-sm text-xs sm:text-sm font-bold active:translate-y-0.5 cursor-pointer">Retry</button>
            </div>
          ) : data && data.entries.length === 0 ? (
            <div className="tactile-card rounded-2xl p-12 text-center bg-white border border-[#D8C3AD]/40 flex flex-col items-center mt-2 shadow-[0_4px_0_#E2DDD2]">
              <span className="text-5xl mb-4 block opacity-90">🦗</span>
              <h3 className="font-serif text-2xl font-bold text-[#18181B] leading-snug">No scores recorded yet</h3>
              <p className="font-sans text-sm text-[#867461] mt-2 max-w-sm">Answer today's live questions or challenges to place your name on the campus leaderboard.</p>
            </div>
          ) : data ? (
            <div className="flex flex-col gap-6 mt-2">
              {data.entries.length >= 2 && (
                <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-8 my-4 h-48 sm:h-60 md:h-68">
                  {[data.entries[1], data.entries[0], data.entries[2]].filter(Boolean).map((e) => {
                    const isFirst = e.rank === 1;
                    const h = isFirst ? 'h-32 sm:h-40 md:h-48' : e.rank === 2 ? 'h-24 sm:h-32 md:h-36' : 'h-20 sm:h-24 md:h-28';
                    const bg = isFirst ? 'bg-gradient-to-b from-[#FDBA74] to-[#F59E0B]' : e.rank === 2 ? 'bg-gradient-to-b from-[#E5E1D8] to-[#D8C3AD]' : 'bg-gradient-to-b from-[#D8C3AD] to-[#C2AA92]';
                    const border = isFirst ? 'border-[#F59E0B]' : e.rank === 2 ? 'border-[#D1CACA]' : 'border-[#C2AA92]';
                    const medal = isFirst ? '👑' : e.rank === 2 ? '🥈' : '🥉';

                    return (
                      <motion.div
                        key={e.nickname}
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: e.rank * 0.1 }}
                        className={`flex flex-col items-center w-24 sm:w-32 md:w-44 ${isFirst ? 'glow-gold z-10 scale-105' : ''}`}
                      >
                        <span className="text-3xl sm:text-4xl mb-1 drop-shadow-md">{medal}</span>
                        <div className="font-sans font-bold text-xs sm:text-sm text-[#18181B] truncate max-w-full text-center">{e.nickname}</div>
                        <div className="font-sans text-[11px] sm:text-xs font-bold text-[#855300] mb-2 tabular-nums">{e.score} pts</div>
                        <div className={`w-full ${h} ${bg} border-2 ${border} rounded-t-2xl flex flex-col items-center justify-start pt-2 sm:pt-3 shadow-[0_4px_0_#A89F91] transition-all`}>
                          <span className="font-serif font-black text-lg sm:text-2xl text-white drop-shadow-sm">#{e.rank}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {data.entries.map((entry, i) => {
                  const isMe = me && entry.nickname === me.nickname;
                  return (
                    <motion.div
                      key={`${entry.nickname}-${entry.rank}`}
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className={`card-lift flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl border transition-all shadow-[0_3px_0_#E2DDD2] hover:shadow-[0_4px_0_#D8C3AD] ${
                        isMe ? 'border-[#F59E0B] bg-[#FFFBEB] glow-amber' : entry.rank === 1 ? 'border-[#FDBA74] bg-[#FFFBF5]' : 'border-[#E5E1D8] bg-white'
                      }`}
                    >
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-sans font-extrabold text-sm sm:text-base flex-shrink-0 ${
                        entry.rank === 1 ? 'bg-[#F59E0B] text-[#613B00] border border-[#D97706]' : 
                        entry.rank === 2 ? 'bg-[#E5E7EB] text-[#374151] border border-[#D1D5DB]' :
                        entry.rank === 3 ? 'bg-[#FDE68A] text-[#92400E] border border-[#FCD34D]' :
                        'bg-[#F0EDF1] text-[#534434] border border-[#E5E1D8]'
                      }`}>
                        {entry.rank}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div>
                          <p className="font-sans font-bold text-sm sm:text-base truncate text-[#18181B]">{entry.nickname}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 font-sans text-xs font-semibold">
                            <span className="text-[#867461]">⏱️ {formatTime(entry.averageTimeMs)} avg</span>
                            {entry.currentStreak > 0 && <span className="text-[#DB3320] fire-particles">🔥 {entry.currentStreak}d streak</span>}
                          </div>
                        </div>
                        {isMe && (
                          <span className="ml-auto font-sans text-[10px] font-black uppercase tracking-widest text-[#F59E0B] bg-[#FFF8ED] border border-[#FDBA74] px-2 py-0.5 rounded-full">
                            YOU →
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 pl-2">
                        <div className="font-sans font-extrabold text-xl sm:text-2xl tabular-nums text-[#B45309]">{entry.score}<span className="text-xs sm:text-sm ml-1 font-bold text-[#867461]">pts</span></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-center pb-safe px-3 sm:px-4">
          <div className="bottom-nav-dock glass-nav flex justify-around items-center px-3 sm:px-6 py-2 sm:py-2.5 bg-white/95 backdrop-blur-md rounded-t-2xl border-t border-[#E5E1D8] shadow-[0_-4px_24px_rgba(39,34,26,0.08)]">
            <button onClick={() => navigate('/student')} className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]">
              <span className="text-lg sm:text-xl leading-none">🎮</span><span className="font-sans text-[11px] sm:text-xs md:text-sm">Home</span>
            </button>
            <button onClick={() => navigate('/social')} className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]">
              <span className="text-lg sm:text-xl leading-none">🏆</span><span className="font-sans text-[11px] sm:text-xs md:text-sm">Compete</span>
            </button>
            <button onClick={() => navigate('/student/leaderboard')} className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 bg-[#F59E0B] text-[#613B00] rounded-xl px-3.5 sm:px-5 py-1.5 sm:py-2 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer">
              <span className="text-lg sm:text-xl leading-none">🏅</span><span className="font-sans text-[11px] sm:text-xs md:text-sm">Leaderboard</span>
            </button>
            <button onClick={() => navigate('/stats')} className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]">
              <span className="text-lg sm:text-xl leading-none">👤</span><span className="font-sans text-[11px] sm:text-xs md:text-sm">Profile</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
