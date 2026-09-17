import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { PollCurrent } from '../api';

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
  questionId: string;
}

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultState | null;
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!state) { navigate('/'); return; }
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
  }, [state, navigate]);

  if (!state) return null;

  const { result, poll, questionId } = state;
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
      subtitle: "Don't worry, there's always tomorrow.",
      accent: 'var(--warning)',
      bg: '#FFF8EC',
    },
  }[outcome];

  const options = poll.options ?? [];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
      <div className="blob blob-1" style={{ opacity: 0.18 }} />
      <div className="blob blob-2" style={{ opacity: 0.12 }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Result hero */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
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
            <motion.div
              animate={outcome === 'wrong' ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.5 }}
              className="text-7xl mb-4"
            >
              {config.emoji}
            </motion.div>
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-4 flex flex-col gap-3"
        >
          <button
            id="see-leaderboard-btn"
            onClick={() => navigate(`/leaderboard/${questionId}`)}
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
            🏆 See Leaderboard
          </button>
          <p className="text-xs text-center" style={{ color: '#A89BC4' }}>
            Come back tomorrow for the next question.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
