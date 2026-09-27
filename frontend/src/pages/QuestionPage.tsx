import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '../api';
import type { PollCurrent } from '../api';

export default function QuestionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    poll: PollCurrent;
    token: string;
    timerSeconds: number;
    nickname: string;
  } | null;

  const totalSeconds = state?.timerSeconds ?? 30;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const timedOut = useRef(false);
  const shouldReduceMotion = useReducedMotion();

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
    setErrorMsg('');
    try {
      const result = await api.submitAttempt(state.token, optionIndex);
      navigate('/result', {
        state: {
          result,
          poll: state.poll,
          pollLaunchId: state.poll.pollLaunchId,
          questionId: state.poll.questionId,
        },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.error === 'not_authenticated') {
        navigate('/auth');
        return;
      }

      // Retain actual error message instead of blind timeout fallback
      const message = err?.message || err?.error || 'Failed to submit answer';
      if (message.toLowerCase().includes('timeout') || timedOut.current) {
        navigate('/result', {
          state: {
            result: { result: 'timeout', correctIndex: 0, awardedPoints: 0 },
            poll: state.poll,
            pollLaunchId: state.poll.pollLaunchId,
            questionId: state.poll.questionId,
          },
        });
      } else {
        setErrorMsg(message);
        setSubmitting(false);
        setSelected(null); // Unlock UI for retry
      }
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
  const options = poll.options ?? [];

  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));
  const isUrgent = secondsLeft <= 5;
  const formattedTime = secondsLeft < 10 ? `00:0${secondsLeft}` : `00:${secondsLeft}`;

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between">
      {/* Centered tactical mobile envelope (max 430px, tablet/desktop responsive) */}
      <div className="w-full max-w-[430px] sm:max-w-lg md:max-w-none mx-auto min-h-screen flex flex-col justify-between bg-[#FAF8F5] relative shadow-[0_0_50px_rgba(39,34,26,0.06)] md:shadow-none">
        
        {/* Top Container: Progress + Header + Main question body */}
        <div className="flex flex-col flex-1">
          {/* Top Ambient Dynamic Progress Bar */}
          <div className="w-full h-1.5 bg-[#E5E1D8]/60 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-r-full ${
                isUrgent ? 'bg-[#DB3320]' : 'bg-[#F59E0B]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Header Bar */}
          <header className="flex justify-between items-center w-full px-5 py-3.5 border-b border-[#E5E1D8]/60 shadow-[0_2px_4px_rgba(39,34,26,0.04)] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40">
            {/* Subject / Category Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E5E1D8] rounded-full shadow-[0_1px_3px_rgba(39,34,26,0.05)]">
              <span className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-[#DB3320] animate-ping' : 'bg-[#F59E0B] animate-pulse'}`} />
              <span className="font-sans text-[11px] tracking-wider text-[#534434] font-bold uppercase">
                LIVE QUIZ
              </span>
            </div>

            {/* Prominent Tension Timer Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
                isUrgent
                  ? 'bg-[#FFDAD4] border-[#DB3320]/40 shadow-[0_2px_0_#FFDAD4]'
                  : 'bg-[#FFEDD5]/60 border-[#F59E0B]/30 shadow-[0_2px_0_#FED7AA]'
              }`}
            >
              <svg
                className={`w-4 h-4 ${isUrgent ? 'text-[#B71607] animate-bounce' : 'text-[#855300]'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                className={`font-sans font-extrabold text-base sm:text-lg tabular-nums leading-none tracking-tight ${
                  isUrgent ? 'text-[#B71607]' : 'text-[#855300]'
                }`}
              >
                {formattedTime}
              </span>
            </div>
          </header>

          {/* Main Content Question Flow */}
          <main className="flex-1 flex flex-col justify-start px-5 py-4 space-y-4">
            {/* Question Metadata Strip */}
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] text-[#867461] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                <span className="text-[#F59E0B]">⚡</span> LIVE QUESTION
              </span>
              <span className="font-sans text-[11px] px-2 py-0.5 rounded bg-[#F0EDF1] border border-[#E5E1D8] text-[#534434] font-bold">
                {totalSeconds}s TIMER
              </span>
            </div>

            {/* Error Alert Banner */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-[#FFF0EE] border border-[#FFCDD2] text-[#B71607] rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-[0_2px_0_#FFCDD2]">
                    <div className="flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{errorMsg}</span>
                    </div>
                    <span className="text-[11px] underline uppercase tracking-wide cursor-pointer font-bold">
                      Tap to retry
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Question Text Plaque */}
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white border border-[#E5E1D8] rounded-xl p-5 sm:p-6 shadow-[0_3px_0_#E2DDD2,0_6px_16px_rgba(39,34,26,0.04)]"
            >
              <div className="absolute -top-3 left-4 bg-[#18181B] text-[#FAF8F5] text-[10px] font-bold tracking-widest px-2.5 py-0.5 rounded uppercase">
                QUESTION
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#18181B] leading-snug tracking-tight pt-1 font-semibold break-words">
                {poll.text}
              </h1>
            </motion.div>

            {/* Stack of Tactile Answer Choices */}
            <div aria-label="Answer Choices" className="space-y-3 pt-1" role="radiogroup">
              {options.map((opt, idx) => {
                const isSelected = selected === idx;
                const isOtherSelected = selected !== null && !isSelected;

                return (
                  <motion.button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(idx)}
                    disabled={selected !== null || submitting}
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                    animate={{
                      opacity: isOtherSelected ? 0.45 : 1,
                      y: isSelected ? -2 : 0,
                    }}
                    whileHover={
                      selected === null && !submitting && !shouldReduceMotion
                        ? { y: -2 }
                        : {}
                    }
                    whileTap={
                      selected === null && !submitting && !shouldReduceMotion
                        ? { y: 2 }
                        : {}
                    }
                    transition={{ duration: 0.15 }}
                    className={`w-full text-left rounded-xl p-4 flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#FFDAD4]/30 border-2 border-[#DB3320] shadow-[0_4px_0_#920700]'
                        : 'bg-white border border-[#E5E1D8] shadow-[0_3px_0_#DDD8CE] hover:border-[#867461] active:translate-y-0.5 active:shadow-[0_1px_0_#DDD8CE]'
                    } ${selected !== null || submitting ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Left Letter Badge */}
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-sans text-sm font-bold flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#DB3320] text-white shadow-sm'
                            : 'bg-[#F0EDF1] border border-[#E5E1D8] text-[#534434]'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>

                      {/* Option Text */}
                      <span
                        className={`font-sans text-sm sm:text-base break-words ${
                          isSelected
                            ? 'text-[#18181B] font-bold'
                            : 'text-[#18181B] font-semibold'
                        }`}
                      >
                        {opt}
                      </span>
                    </div>

                    {/* Right-Hand Radio / Status Indicator */}
                    <div className="flex-shrink-0 ml-3">
                      {submitting && isSelected ? (
                        <div className="w-5 h-5 rounded-full border-2 border-[#DB3320] border-t-transparent animate-spin" />
                      ) : isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#DB3320] flex items-center justify-center text-white shadow-sm">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-[#E5E1D8] block" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </main>
        </div>

        {/* Bottom Action & Footnote Strip */}
        <footer className="w-full px-5 pt-3 pb-6 flex flex-col items-center">
          <div className="flex items-center justify-center gap-1.5 text-[#534434]/80 text-xs font-medium">
            <svg
              className="w-4 h-4 text-[#006C49]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>
              Playing as <strong className="text-[#18181B] font-semibold">{state.nickname}</strong> • One attempt only
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
