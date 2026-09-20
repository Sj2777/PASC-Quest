import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';
import type { PollCurrent } from '../api';

const CARD_COLORS = [
  'var(--card-lilac)',
  'var(--card-sky)',
  'var(--card-peach)',
  'var(--card-mint)',
];

function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const offset = circumference * (1 - progress);

  const strokeColor = seconds > total * 0.5
    ? 'var(--primary)'
    : seconds > total * 0.25
      ? 'var(--warning)'
      : '#FF4D4D';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle
          className="timer-ring-track"
          cx="80" cy="80" r={radius}
          strokeWidth="10"
        />
        <circle
          className="timer-ring-fill"
          cx="80" cy="80" r={radius}
          strokeWidth="10"
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-extrabold leading-none"
          style={{ fontSize: 40, color: strokeColor }}
        >
          {seconds}
        </span>
        <span className="text-xs font-medium mt-0.5" style={{ color: '#A89BC4' }}>sec</span>
      </div>
    </div>
  );
}

export default function QuestionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    poll: PollCurrent;
    token: string;
    timerSeconds: number;
    nickname: string;
  } | null;

  const [secondsLeft, setSecondsLeft] = useState(state?.timerSeconds ?? 30);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timedOut = useRef(false);

  // Redirect if navigated directly without state or if unauthenticated
  useEffect(() => {
    if (!state) {
      navigate('/auth');
      return;
    }
    api.getMe().catch(() => {
      navigate('/auth');
    });
  }, [state, navigate]);

  const submit = useCallback(async (optionIndex: number | null) => {
    if (submitting || !state) return;
    setSubmitting(true);
    try {
      const result = await api.submitAttempt(state.token, state.nickname, optionIndex);
      navigate('/result', { state: { result, poll: state.poll, pollLaunchId: state.poll.pollLaunchId, questionId: state.poll.questionId } });
    } catch (err: any) {
      if (err?.status === 401 || err?.error === 'not_authenticated') {
        navigate('/auth');
        return;
      }
      navigate('/result', { state: { result: { result: 'timeout', correctIndex: 0 }, poll: state.poll, pollLaunchId: state.poll.pollLaunchId, questionId: state.poll.questionId } });
    }
  }, [submitting, state, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!state) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (!timedOut.current) {
            timedOut.current = true;
            submit(null); // timeout
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, submit]);

  const handleSelect = (idx: number) => {
    if (selected !== null || submitting) return;
    setSelected(idx);
    submit(idx);
  };

  if (!state) return null;

  const { poll } = state;

  return (
    <div className="relative min-h-screen flex flex-col items-center px-4 py-8 overflow-hidden">
      <div className="blob blob-1" style={{ opacity: 0.2 }} />
      <div className="blob blob-2" style={{ opacity: 0.15 }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Timer */}
        <div className="flex justify-center mb-6">
          <TimerRing seconds={secondsLeft} total={state.timerSeconds} />
        </div>

        {/* Question */}
        <div
          className="rounded-[24px] p-6 mb-6"
          style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 24px rgba(36,27,58,0.1)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#A89BC4' }}>
            Today's question
          </p>
          <h2 className="font-display text-2xl font-bold leading-snug" style={{ color: 'var(--ink)' }}>
            {poll.text}
          </h2>
        </div>

        {/* Options */}
        <div className="grid gap-3">
          {(poll.options ?? []).map((opt, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null || submitting}
              className="option-card text-left w-full flex items-center gap-3"
              style={{
                background: selected === null ? CARD_COLORS[idx % CARD_COLORS.length] : '#F5F0FF',
                border: selected === idx ? '2px solid var(--primary)' : '2px solid transparent',
                opacity: selected !== null && selected !== idx ? 0.6 : 1,
              }}
            >
              <span
                className="font-display font-bold text-lg flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(36,27,58,0.1)', color: 'var(--ink)' }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ color: 'var(--ink)' }}>{opt}</span>
              {submitting && selected === idx && (
                <span className="ml-auto">
                  <div className="w-4 h-4 rounded-full border-2 border-pink-300 border-t-pink-600 animate-spin" />
                </span>
              )}
            </motion.button>
          ))}
        </div>

        <p className="mt-6 text-xs text-center" style={{ color: '#A89BC4' }}>
          Playing as <strong style={{ color: '#6B5B8E' }}>{state.nickname}</strong>
        </p>
      </div>
    </div>
  );
}
