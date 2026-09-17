import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { LeaderboardEntry, LeaderboardResponse } from '../api';

const MEDAL = ['🥇', '🥈', '🥉'];
const POLL_INTERVAL_MS = 5000;

const RANK_COLORS: Record<number, { bg: string; border: string; glow: string; text: string }> = {
  1: { bg: 'linear-gradient(135deg,#FFD700,#FFA500)', border: '#FFD700', glow: 'rgba(255,215,0,0.45)', text: '#7A4800' },
  2: { bg: 'linear-gradient(135deg,#E0E8FF,#B0C4DE)', border: '#B0BEC5', glow: 'rgba(176,196,222,0.4)', text: '#37474F' },
  3: { bg: 'linear-gradient(135deg,#FFCBA4,#CD7F32)', border: '#CD7F32', glow: 'rgba(205,127,50,0.4)', text: '#5D2E00' },
};

const resultBadge = (result: LeaderboardEntry['result']) => {
  if (result === 'correct') return { label: '✓ Correct', bg: '#D4FAF0', color: '#00875A' };
  if (result === 'wrong')   return { label: '✗ Wrong',   bg: '#FFE8E8', color: '#C62828' };
  return                           { label: '⏰ Timeout', bg: '#FFF3CD', color: '#8A5700' };
};

const formatTime = (ms: number | null) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

function LiveBadge() {
  return (
    <motion.div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ background: 'rgba(255,77,77,0.2)', border: '1px solid rgba(255,77,77,0.5)', color: '#FF7070' }}
      animate={{ opacity: [1, 0.5, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <span
        style={{
          width: 6, height: 6, borderRadius: '50%', background: '#FF4D4D',
          boxShadow: '0 0 6px #FF4D4D',
          display: 'inline-block',
        }}
      />
      LIVE
    </motion.div>
  );
}

function PodiumBar({ entry, delay }: { entry: LeaderboardEntry; delay: number }) {
  const style = RANK_COLORS[entry.rank] ?? RANK_COLORS[3];
  const heights = [160, 120, 90];
  const h = heights[entry.rank - 1] ?? 90;

  return (
    <motion.div
      layout
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="text-center">
        <div className="text-3xl mb-1">{MEDAL[entry.rank - 1]}</div>
        <p
          className="font-bold text-sm max-w-[80px] truncate"
          style={{ color: entry.isMe ? 'var(--primary)' : 'white' }}
        >
          {entry.nickname}{entry.isMe ? ' (you)' : ''}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#8A7BA8' }}>
          {formatTime(entry.timeTakenMs)}
        </p>
      </div>
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: h }}
        transition={{ delay: delay + 0.15, duration: 0.6, ease: 'easeOut' }}
        style={{
          width: 72,
          background: style.bg,
          border: `2px solid ${style.border}`,
          boxShadow: `0 0 18px ${style.glow}`,
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="font-display font-extrabold text-xl" style={{ color: style.text }}>
          #{entry.rank}
        </span>
      </motion.div>
    </motion.div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 rounded w-1/3" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-2 rounded w-1/4" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div className="h-5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );
}

export default function Leaderboard() {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!questionId) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.getLeaderboard(questionId);
      setData(res);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      setError('');
    } catch {
      setError('Could not load leaderboard.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [questionId]);

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Start/stop polling based on question status
  useEffect(() => {
    // Clear old interval
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

  const isLive = data?.questionStatus === 'live';

  // Podium order: 2nd, 1st, 3rd (classic podium layout)
  const podiumOrder = data
    ? [data.top10[1], data.top10[0], data.top10[2]].filter(Boolean)
    : [];
  const restList = data?.top10.slice(3) ?? [];
  const myEntry = data?.myEntry;
  const showMyRank = myEntry && (data?.myRank ?? 0) > 10;

  return (
    <div
      className="relative min-h-screen flex flex-col items-center px-4 py-8 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1A0F2E 0%, #2D1B69 50%, #1A0F2E 100%)' }}
    >
      {/* Star field */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            background: 'white',
            opacity: 0.15 + Math.sin(i) * 0.1,
            width: (i % 3) + 1,
            height: (i % 3) + 1,
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
          }}
        />
      ))}

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-2"
        >
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="font-display text-4xl font-extrabold text-white">Leaderboard</h1>

          {/* Live badge + player count */}
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {isLive && <LiveBadge />}
            {data && (
              <span className="text-sm font-medium" style={{ color: '#C4AFFF' }}>
                {data.total} player{data.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Question text */}
          {data && (
            <p className="mt-1 text-xs italic px-4 opacity-60 text-white line-clamp-2">
              {data.questionText}
            </p>
          )}

          {/* Last updated */}
          {lastUpdated && isLive && (
            <motion.p
              key={secondsAgo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1.5 text-xs"
              style={{ color: '#6B5BAA' }}
            >
              {secondsAgo === 0 ? '✓ Just updated' : `Updated ${secondsAgo}s ago · refreshes every ${POLL_INTERVAL_MS / 1000}s`}
            </motion.p>
          )}
        </motion.div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 mt-6">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {error && (
          <div className="text-center mt-8" style={{ color: '#FF7070' }}>{error}</div>
        )}

        {data && !loading && (
          <>
            {/* Podium — top 3 */}
            {data.top10.length >= 1 && (
              <motion.div
                layout
                className="flex items-end justify-center gap-4 mt-6 mb-6"
              >
                <AnimatePresence mode="popLayout">
                  {podiumOrder.map((e) => (
                    <PodiumBar
                      key={e.nickname + e.rank}
                      entry={e}
                      delay={e.rank === 1 ? 0.1 : e.rank === 2 ? 0.2 : 0.3}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Ranks 4–10 */}
            {restList.length > 0 && (
              <motion.div
                layout
                className="rounded-3xl overflow-hidden mb-4"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <AnimatePresence mode="popLayout">
                  {restList.map((entry, i) => {
                    const badge = resultBadge(entry.result);
                    return (
                      <motion.div
                        key={entry.nickname + entry.rank}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{
                          borderBottom: i < restList.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                          background: entry.isMe ? 'rgba(255,77,141,0.12)' : 'transparent',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.1)', color: '#C4AFFF' }}
                        >
                          {entry.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-bold text-sm truncate"
                            style={{ color: entry.isMe ? 'var(--primary)' : 'white' }}
                          >
                            {entry.nickname}{entry.isMe ? ' 👈 you' : ''}
                          </p>
                          <p className="text-xs" style={{ color: '#8A7BA8' }}>
                            {formatTime(entry.timeTakenMs)}
                          </p>
                        </div>
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Empty state */}
            {data.top10.length === 0 && (
              <div className="text-center py-12" style={{ color: '#8A7BA8' }}>
                <div className="text-5xl mb-3">🦗</div>
                <p className="font-bold text-white">No answers yet</p>
                <p className="text-sm mt-1">Be the first to play!</p>
              </div>
            )}

            {/* My rank — only shown when outside top 10 */}
            {showMyRank && myEntry && (
              <motion.div
                layout
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl p-4 flex items-center gap-3 mb-4"
                style={{
                  background: 'linear-gradient(135deg,rgba(255,77,141,0.2),rgba(196,175,255,0.2))',
                  border: '1.5px solid rgba(255,77,141,0.5)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                  style={{ background: 'var(--primary)', color: 'white' }}
                >
                  #{myEntry.rank}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{myEntry.nickname} — your rank</p>
                  <p className="text-xs" style={{ color: '#C4AFFF' }}>
                    {formatTime(myEntry.timeTakenMs)} · {resultBadge(myEntry.result).label}
                  </p>
                </div>
                <span className="text-2xl">👈</span>
              </motion.div>
            )}
          </>
        )}

        {/* Manual refresh button for LIVE */}
        {isLive && !loading && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => fetchData(true)}
            className="w-full py-2.5 rounded-2xl font-bold text-sm mb-3 transition-all"
            style={{
              background: 'rgba(255,77,141,0.15)',
              border: '1px solid rgba(255,77,141,0.35)',
              color: '#FF9EC7',
              cursor: 'pointer',
            }}
            whileTap={{ scale: 0.97 }}
          >
            ↻ Refresh Now
          </motion.button>
        )}

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl font-bold text-sm transition-all"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#C4AFFF',
            cursor: 'pointer',
          }}
          whileTap={{ scale: 0.97 }}
        >
          ← Back to Home
        </motion.button>
      </div>
    </div>
  );
}
