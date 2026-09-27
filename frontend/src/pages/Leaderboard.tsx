import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../api';
import type { LeaderboardEntry, LeaderboardResponse } from '../api';
import { useLeaderboardWebSocket } from '../useWebSocket';

const MEDAL = ['🥇', '🥈', '🥉'];
const POLL_INTERVAL_MS = 5000;

const resultBadge = (result: LeaderboardEntry['result']) => {
  if (result === 'correct') return { label: '✓ Correct', bg: 'bg-[#E6F8F3]', border: 'border-[#10B981]/40', color: 'text-[#006C49]' };
  if (result === 'wrong')   return { label: '✗ Wrong',   bg: 'bg-[#FFF0EE]', border: 'border-[#FFDAD4]', color: 'text-[#B71607]' };
  return                           { label: '⏰ Timeout', bg: 'bg-[#FFFBEB]', border: 'border-[#FDBA74]', color: 'text-[#855300]' };
};

const formatTime = (ms: number | null) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

function LiveBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#DB3320]/40 bg-[#FFF0EE] text-[10px] font-sans font-bold text-[#B71607] tracking-wider uppercase shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-[#DB3320] animate-pulse" />
      LIVE
    </div>
  );
}

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

export default function Leaderboard() {
  const { pollLaunchId, questionId } = useParams<{ pollLaunchId?: string; questionId?: string }>();
  const targetId = pollLaunchId || questionId;
  const navigate = useNavigate();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const fetchData = useCallback(async (silent = false) => {
    if (!targetId) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.getLeaderboard(targetId);
      setData(res);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      setError('');
    } catch {
      setError('Could not load leaderboard.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [targetId]);

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Start/stop polling based on question status
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (data?.questionStatus === 'live') {
      intervalRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [data?.questionStatus, fetchData]);

  // Tick "N seconds ago" counter
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [lastUpdated]);

  useLeaderboardWebSocket((event) => {
    if (event.scope === 'poll' && event.pollLaunchId === targetId) {
      fetchData(true);
    }
  });

  const isLive = data?.questionStatus === 'live';

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = data
    ? [data.top10[1], data.top10[0], data.top10[2]].filter(Boolean)
    : [];
  const restList = data?.top10.slice(3) ?? [];
  const myEntry = data?.myEntry;
  const showMyRank = myEntry && (data?.myRank ?? 0) > 10;

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between pb-safe">
      {/* Widescreen 16:9 responsive container */}
      <div className="w-full min-h-screen flex flex-col bg-[#FAF8F5] relative pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/80 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="screen-container flex justify-between items-center py-3.5 sm:py-4">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#855300] tracking-tight">
                Competition Standings
              </span>
            </div>
            <button
              onClick={() => navigate('/student')}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-full border border-[#D8C3AD]/60 text-[#867461] hover:text-[#18181B] bg-white/70 hover:bg-white shadow-[0_1px_0_#E2DDD2] transition-all active:translate-y-0.5 cursor-pointer"
            >
              Home ➔
            </button>
          </div>
        </header>

        <main className="screen-container max-w-4xl mx-auto pt-6 sm:pt-8 md:pt-10 flex-1 flex flex-col gap-6 sm:gap-8">
          {/* Header section */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center mt-2"
          >
            <div className="text-4xl sm:text-5xl mb-2 opacity-90">🏆</div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#18181B] tracking-tight leading-none mb-3">
              Round Leaderboard
            </h1>
            
            <div className="flex items-center gap-2 mb-3">
              {isLive && <LiveBadge />}
              {data && (
                <span className="font-sans text-xs sm:text-sm font-bold uppercase tracking-wider text-[#867461] bg-[#E5E1D8]/40 px-3 py-1 rounded-full">
                  {data.total} Participant{data.total !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {data && (
              <p className="font-serif text-[#534434] text-sm sm:text-base italic border-l-2 border-[#D8C3AD] pl-4 py-1 mb-2 max-w-lg line-clamp-2">
                "{data.questionText}"
              </p>
            )}

            {lastUpdated && isLive && (
              <p className="font-sans text-xs font-bold text-[#867461] uppercase tracking-wider mt-1">
                {secondsAgo === 0 ? '✓ Live synced' : `Updated ${secondsAgo}s ago · Refreshes ${POLL_INTERVAL_MS / 1000}s`}
              </p>
            )}
          </motion.div>

          {loading ? (
            <div className="space-y-3 mt-4">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="tactile-card rounded-2xl p-6 text-center bg-[#FFF0EE] border-[#FFDAD4] text-[#B71607] font-sans text-sm font-semibold mt-4">
              {error}
            </div>
          ) : data ? (
            <div className="flex flex-col gap-6 mt-2">
              
              {/* Expansive Collegiate Podium (Top 3) */}
              {data.top10.length > 0 && (
                <div className="flex items-end justify-center gap-4 sm:gap-6 md:gap-8 mb-6 mt-4 h-52 sm:h-64 md:h-72">
                  {podiumOrder.map((e) => {
                    const isFirst = e.rank === 1;
                    const h = isFirst ? 'h-32 sm:h-40 md:h-48' : e.rank === 2 ? 'h-24 sm:h-32 md:h-36' : 'h-20 sm:h-24 md:h-28';
                    const bg = isFirst ? 'bg-[#FDBA74]' : e.rank === 2 ? 'bg-[#E5E1D8]' : 'bg-[#D8C3AD]';
                    const border = isFirst ? 'border-[#F59E0B]' : e.rank === 2 ? 'border-[#D1CACA]' : 'border-[#C2AA92]';
                    const text = isFirst ? 'text-[#613B00]' : 'text-[#534434]';
                    
                    return (
                      <motion.div
                        key={e.nickname + e.rank}
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: e.rank * 0.1 }}
                        className="flex flex-col items-center gap-2.5 w-24 sm:w-32 md:w-40 lg:w-44"
                      >
                        <div className="text-center w-full">
                          <div className="text-3xl sm:text-4xl mb-1.5">{MEDAL[e.rank - 1]}</div>
                          <p className={`font-sans text-xs sm:text-sm font-bold truncate ${e.isMe ? 'text-[#DB3320]' : 'text-[#18181B]'}`}>
                            {e.nickname}
                          </p>
                          <p className="font-sans text-[11px] sm:text-xs font-semibold text-[#867461]">
                            {formatTime(e.timeTakenMs)}
                          </p>
                        </div>
                        <div className={`w-full ${h} ${bg} border-t-2 border-l-2 border-r-2 ${border} rounded-t-2xl flex items-center justify-center shadow-[inset_0_4px_12px_rgba(255,255,255,0.4)]`}>
                          <span className={`font-serif text-3xl sm:text-4xl font-extrabold ${text}`}>
                            #{e.rank}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Top 10 List */}
              {restList.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-sans text-xs sm:text-sm font-bold text-[#867461] uppercase tracking-wider pl-1 mb-1">
                    The Pack
                  </h3>
                  {restList.map((entry, i) => {
                    const badge = resultBadge(entry.result);
                    return (
                      <motion.div
                        key={entry.nickname + entry.rank}
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                        className={`flex items-center gap-3.5 sm:gap-4 px-5 py-4 rounded-2xl border transition-all ${
                          entry.isMe 
                            ? 'bg-[#FFF0EE] border-[#FFDAD4] shadow-[0_3px_0_#FFCDD2]' 
                            : 'bg-white border-[#E5E1D8] shadow-[0_3px_0_#E2DDD2]'
                        }`}
                      >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-sans font-bold text-sm sm:text-base bg-[#F0EDF1] text-[#534434] border border-[#E5E1D8] flex-shrink-0">
                          {entry.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-sans font-bold text-sm sm:text-base truncate ${entry.isMe ? 'text-[#DB3320]' : 'text-[#18181B]'}`}>
                            {entry.nickname} {entry.isMe && <span className="text-xs ml-1.5 uppercase font-extrabold text-[#DB3320]">(You)</span>}
                          </p>
                          <p className="font-sans text-xs sm:text-sm text-[#867461] font-semibold">
                            {formatTime(entry.timeTakenMs)}
                          </p>
                        </div>
                        <span className={`font-sans text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0 ${badge.bg} ${badge.border} ${badge.color} uppercase tracking-wide shadow-sm`}>
                          {badge.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {data.top10.length === 0 && (
                <div className="tactile-card rounded-2xl p-10 text-center bg-white border border-[#D8C3AD]/40 flex flex-col items-center mt-4">
                  <span className="text-4xl mb-3 block opacity-90">🦗</span>
                  <h3 className="font-serif text-xl font-bold text-[#18181B] leading-snug">No answers yet</h3>
                  <p className="font-sans text-sm text-[#867461] mt-1 max-w-xs">
                    Be the first to secure a spot on the leaderboard!
                  </p>
                </div>
              )}

              {/* My Rank (If outside top 10) */}
              {showMyRank && myEntry && (
                <motion.div
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#FFFBEB] border border-[#FDBA74] shadow-[0_3px_0_#FED7AA]"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-sans font-bold text-base bg-[#F59E0B] text-[#613B00] shadow-sm flex-shrink-0">
                    {myEntry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-bold text-base text-[#855300] truncate">
                      {myEntry.nickname} <span className="text-xs ml-1.5 uppercase font-extrabold">(You)</span>
                    </p>
                    <p className="font-sans text-xs sm:text-sm text-[#B45309] font-semibold">
                      {formatTime(myEntry.timeTakenMs)} · {resultBadge(myEntry.result).label.replace(/✓ |✗ |⏰ /, '')}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Actions Footer */}
              {isLive && (
                <div className="flex justify-center mt-4 mb-6">
                  <button
                    onClick={() => fetchData(true)}
                    className="tactile-btn-white px-6 py-3 rounded-xl font-sans font-bold text-sm sm:text-base text-[#18181B] bg-white border border-[#D8C3AD] shadow-[0_3px_0_#E2DDD2] active:translate-y-1 active:shadow-[0_0px_0_#E2DDD2] flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span className="text-lg text-[#867461]">↻</span> Refresh Live Standings
                  </button>
                </div>
              )}

            </div>
          ) : null}
        </main>

        {/* Bottom Navigation Bar: Docked Responsive Command Center */}
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

            {/* Leaderboard Tab (ACTIVE) */}
            <button
              onClick={() => navigate('/student/leaderboard')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 bg-[#F59E0B] text-[#613B00] rounded-xl px-3.5 sm:px-5 py-1.5 sm:py-2 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
            >
              <span className="text-lg sm:text-xl leading-none">🏅</span>
              <span className="font-sans text-[11px] sm:text-xs md:text-sm">Leaderboard</span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => navigate('/stats')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]"
            >
              <span className="text-lg sm:text-xl leading-none">👤</span>
              <span className="font-sans text-[11px] sm:text-xs md:text-sm">Profile</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
