import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api, type PollCurrent, type SpeedKing, type GhostMode } from '../api';

const CARD_COLORS = [
  'var(--card-lilac)',
  'var(--card-sky)',
  'var(--card-peach)',
  'var(--card-mint)',
];

const TIMEOUT_EMOJIS = ['⏰', '💨', '🌬️', '😅', '⚡', '🕐', '💫', '🏃'];

interface ResultState {
  result: {
    result: 'correct' | 'wrong' | 'timeout';
    correctIndex: number;
  };
  poll: PollCurrent;
  pollLaunchId?: string;
  questionId?: string;
}

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultState | null;
  const confettiFired = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  const [speedKing, setSpeedKing] = useState<SpeedKing | null>(null);
  const [ghostMode, setGhostMode] = useState<GhostMode | null>(null);
  const [me, setMe] = useState<{ nickname: string } | null>(null);

  useEffect(() => {
    if (!state) { navigate('/auth'); return; }
    if (state.result.result === 'correct' && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#FF4D8D', '#00D2A0', '#FFB020', '#C4AFFF', '#CDEFFF'],
        scalar: 1.1,
      });
    }

    // Fetch data
    api.getMe().then(setMe).catch(() => {});
    
    if (state) {
      const { poll, pollLaunchId, questionId } = state;
      const targetId = pollLaunchId || poll.pollLaunchId || questionId;
      if (targetId) {
        api.getGhostMode(targetId).then(setGhostMode).catch(() => {});
        api.getSpeedKing(targetId).then(res => setSpeedKing(res.speedKing)).catch(() => {});
      }
    }

  }, [state, navigate]);

  if (!state) return null;

  const { result, poll, pollLaunchId, questionId } = state;
  const targetLaunchId = pollLaunchId || poll.pollLaunchId || questionId;
  const { result: outcome, correctIndex } = result;

  const config = {
    correct: {
      emoji: '🎉',
      title: "That's right!",
      subtitle: 'Great job, you nailed it.',
      accent: 'var(--success)',
      bg: '#E6FBF5',
    },
    wrong: {
      emoji: '💡',
      title: 'Not quite',
      subtitle: "That wasn't the one — the correct answer is shown below.",
      accent: '#FF7043',
      bg: '#FFF3EE',
    },
    timeout: {
      emoji: '⏰',
      title: "Time's up",
      subtitle: "Don't worry, keep trying!",
      accent: 'var(--warning)',
      bg: '#FFF8EC',
    },
  }[outcome];

  const options = poll.options ?? [];

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const isSpeedKingWinner = me?.nickname === speedKing?.nickname;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
      <div className="blob blob-1" style={{ opacity: 0.18 }} />
      <div className="blob blob-2" style={{ opacity: 0.12 }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Result hero */}
        <motion.div
          initial={{ scale: shouldReduceMotion ? 1 : 0.8, opacity: 0 }}
          animate={
            outcome === 'wrong'
              ? { scale: 1, opacity: 1, x: shouldReduceMotion ? 0 : [0, -8, 8, -4, 4, 0] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center mb-8"
        >
          {/* Timeout emoji burst */}
          {outcome === 'timeout' && (
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {TIMEOUT_EMOJIS.map((e, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 260 }}
                  className="text-2xl"
                >
                  {e}
                </motion.span>
              ))}
            </div>
          )}

          {outcome !== 'timeout' && (
            <div className="text-7xl mb-4">
              {config.emoji}
            </div>
          )}

          <h1 className="font-display text-4xl font-extrabold" style={{ color: 'var(--ink)' }}>
            {config.title}
          </h1>
          <p className="mt-2 text-sm font-medium" style={{ color: '#6B5B8E' }}>
            {config.subtitle}
          </p>
        </motion.div>

        {/* Question + options reveal */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="rounded-[24px] p-6"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 24px rgba(36,27,58,0.1)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#A89BC4' }}>
            The question was
          </p>
          <p className="font-display text-xl font-bold mb-5" style={{ color: 'var(--ink)' }}>
            {poll.text}
          </p>

          <div className="grid gap-2.5">
            {options.map((opt, idx) => {
              const isCorrect = idx === correctIndex;
              let cardStyle: React.CSSProperties = {
                background: CARD_COLORS[idx % CARD_COLORS.length],
                border: '2px solid transparent',
                opacity: 0.55,
              };
              if (isCorrect) {
                cardStyle = {
                  background: '#E6FBF5',
                  border: '2px solid var(--success)',
                  opacity: 1,
                };
              }

              return (
                <div
                  key={idx}
                  className="option-card flex items-center gap-3"
                  style={cardStyle}
                >
                  <span
                    className="font-display font-bold text-lg flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(36,27,58,0.1)', color: 'var(--ink)' }}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ color: 'var(--ink)' }}>{opt}</span>
                  {isCorrect && (
                    <span className="ml-auto text-lg">✅</span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Speed King Display */}
        {speedKing && (
          <motion.div
            initial={{ opacity: 0, scale: isSpeedKingWinner && !shouldReduceMotion ? 0.9 : 1, y: shouldReduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
            className="mt-4 rounded-[24px] p-4 flex items-center justify-between"
            style={{ 
              background: isSpeedKingWinner ? 'linear-gradient(135deg, #FFF9C4, #FFF176)' : 'rgba(255,255,255,0.7)', 
              backdropFilter: 'blur(16px)', 
              boxShadow: '0 4px 24px rgba(36,27,58,0.1)',
              border: isSpeedKingWinner ? '2px solid #FBC02D' : '2px solid transparent'
            }}
          >
            <div className="flex items-center gap-3">
              <motion.span 
                initial={isSpeedKingWinner && !shouldReduceMotion ? { scale: 0, rotate: -45 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 400, damping: 15 }}
                className="text-3xl"
              >
                ⚡
              </motion.span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: isSpeedKingWinner ? '#F57F17' : '#A89BC4' }}>
                  {isSpeedKingWinner ? 'SPEED KING' : "Speed King"}
                </p>
                <p className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>
                  {isSpeedKingWinner ? 'Fastest correct answer' : `${speedKing.nickname} · ${formatTime(speedKing.timeTakenMs)}`}
                </p>
              </div>
            </div>
            {isSpeedKingWinner && (
              <div className="text-right">
                <motion.p 
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1, duration: 0.4, ease: "easeOut" }}
                  className="font-display font-extrabold text-xl" 
                  style={{ color: '#F57F17' }}
                >
                  {formatTime(speedKing.timeTakenMs)}
                </motion.p>
              </div>
            )}
          </motion.div>
        )}

        {/* Ghost Mode Display */}
        {ghostMode && ghostMode.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-4 rounded-[24px] p-5"
            style={{ 
              background: 'rgba(255,255,255,0.8)', 
              backdropFilter: 'blur(16px)', 
              boxShadow: '0 4px 24px rgba(36,27,58,0.1)'
            }}
          >
            <div className="flex items-center justify-between mb-4 border-b border-gray-200/50 pb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span className="text-xl">👻</span> Ghost Mode
              </h3>
              <span className="text-xs font-semibold text-gray-500 bg-white shadow-sm px-2 py-1 rounded-full border border-gray-100">
                {ghostMode.total} attempt{ghostMode.total !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-green-600">Correct</span>
                <motion.span 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 1 }}
                  className="font-bold text-gray-800"
                >
                  {ghostMode.correctPercent.toFixed(1)}%
                </motion.span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-green-500 h-1.5 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${ghostMode.correctPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.7 }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-orange-500">Wrong</span>
                <motion.span 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 1 }}
                  className="font-bold text-gray-800"
                >
                  {ghostMode.wrongPercent.toFixed(1)}%
                </motion.span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-orange-400 h-1.5 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${ghostMode.wrongPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.7 }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-yellow-600">Timeout</span>
                <motion.span 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 1 }}
                  className="font-bold text-gray-800"
                >
                  {ghostMode.timeoutPercent.toFixed(1)}%
                </motion.span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-yellow-400 h-1.5 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${ghostMode.timeoutPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.7 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-4 flex flex-col gap-3"
        >
          <button
            onClick={() => navigate('/student')}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all"
            style={{
              background: 'linear-gradient(135deg,#241B3A,#3D2B6B)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(36,27,58,0.25)',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ← Back to Questions
          </button>
          <button
            onClick={() => navigate(`/leaderboard/${targetLaunchId}`)}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all"
            style={{
              background: 'white',
              color: 'var(--ink)',
              border: '1.5px solid #E4D9FF',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            🏆 See Leaderboard
          </button>
        </motion.div>

      </div>
    </div>
  );
}
