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
      navigate('/');
      return;
    }
    api.getMe().catch(() => {
      navigate('/');
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
        navigate('/');
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
      {/* Widescreen 16:9 full-screen responsive container */}
      <div className="w-full min-h-screen flex flex-col justify-between bg-[#FAF8F5] relative">
        
        {/* Top Container: Progress + Header + Main question body */}
        <div className="flex flex-col flex-1">
          {/* Top Ambient Dynamic Progress Bar */}
          <div className="w-full h-2 sm:h-2.5 bg-[#E5E1D8]/60 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-r-full ${
                isUrgent ? 'bg-[#DB3320]' : 'bg-[#F59E0B]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Header Bar */}
          <header className="w-full border-b border-[#E5E1D8]/80 shadow-[0_2px_4px_rgba(39,34,26,0.04)] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40">
            <div className="screen-container-quiz flex justify-between items-center py-3.5 sm:py-4">
              {/* Subject / Category Pill */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white border border-[#E5E1D8] rounded-full shadow-[0_1px_3px_rgba(39,34,26,0.05)]">
                <span className={`w-2.5 h-2.5 rounded-full ${isUrgent ? 'bg-[#DB3320] animate-ping' : 'bg-[#F59E0B] animate-pulse'}`} />
                <span className="font-sans text-xs sm:text-sm tracking-wider text-[#534434] font-bold uppercase">
                  LIVE QUIZ ROUND
                </span>
              </div>

              {/* Prominent Tension Timer Badge */}
              <div
                className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl border transition-colors ${
                  isUrgent
                    ? 'bg-[#FFDAD4] border-[#DB3320]/40 shadow-[0_3px_0_#FFDAD4]'
                    : 'bg-[#FFEDD5]/70 border-[#F59E0B]/30 shadow-[0_3px_0_#FED7AA]'
                }`}
              >
                <svg
                  className={`w-5 h-5 sm:w-6 sm:h-6 ${isUrgent ? 'text-[#B71607] animate-bounce' : 'text-[#855300]'}`}
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
                  className={`font-sans font-extrabold text-lg sm:text-2xl tabular-nums leading-none tracking-tight ${
                    isUrgent ? 'text-[#B71607]' : 'text-[#855300]'
                  }`}
                >
                  {formattedTime}
                </span>
              </div>
            </div>
          </header>

          {/* Main Content Question Flow */}
          <main className="screen-container-quiz flex-1 flex flex-col justify-center py-6 sm:py-10 md:py-12 space-y-6 sm:space-y-8">
            {/* Question Metadata Strip */}
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs sm:text-sm text-[#867461] uppercase tracking-wider font-extrabold flex items-center gap-2">
                <span className="text-[#F59E0B] text-base">⚡</span> LIVE QUESTION
              </span>
              <span className="font-sans text-xs sm:text-sm px-3 py-1 rounded-lg bg-[#F0EDF1] border border-[#E5E1D8] text-[#534434] font-bold">
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
                  <div className="p-4 bg-[#FFF0EE] border border-[#FFCDD2] text-[#B71607] rounded-xl text-sm font-semibold flex items-center justify-between shadow-[0_2px_0_#FFCDD2]">
                    <div className="flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{errorMsg}</span>
                    </div>
                    <span className="text-xs underline uppercase tracking-wide cursor-pointer font-bold">
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
              className="relative bg-white border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 md:p-10 shadow-[0_4px_0_#E2DDD2,0_8px_24px_rgba(39,34,26,0.05)]"
            >
              <div className="absolute -top-3.5 left-6 bg-[#18181B] text-[#FAF8F5] text-xs font-bold tracking-widest px-3 py-1 rounded uppercase shadow-sm">
                QUESTION
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[#18181B] leading-snug sm:leading-tight tracking-tight pt-2 font-semibold break-words">
                {poll.text}
              </h1>
            </motion.div>

            {/* Answer Choices: 2x2 Responsive Grid on Laptop/Tablet */}
            <div aria-label="Answer Choices" className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 pt-2" role="radiogroup">
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
                    className={`w-full text-left rounded-2xl p-5 sm:p-6 flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#FFDAD4]/30 border-2 border-[#DB3320] shadow-[0_4px_0_#920700]'
                        : 'bg-white border border-[#E5E1D8] shadow-[0_3px_0_#DDD8CE] hover:border-[#867461] active:translate-y-0.5 active:shadow-[0_1px_0_#DDD8CE]'
                    } ${selected !== null || submitting ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 pr-2">
                      {/* Left Letter Badge */}
                      <span
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-sans text-base sm:text-lg font-bold flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#DB3320] text-white shadow-sm'
                            : 'bg-[#F0EDF1] border border-[#E5E1D8] text-[#534434]'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>

                      {/* Option Text */}
                      <span
                        className={`font-sans text-base sm:text-lg break-words ${
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
                        <div className="w-6 h-6 rounded-full border-2 border-[#DB3320] border-t-transparent animate-spin" />
                      ) : isSelected ? (
                        <div className="w-7 h-7 rounded-full bg-[#DB3320] flex items-center justify-center text-white shadow-sm">
                          <svg
                            className="w-4 h-4"
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
                        <span className="w-6 h-6 rounded-full border-2 border-[#E5E1D8] block" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </main>
        </div>

        {/* Bottom Action & Footnote Strip */}
        <footer className="w-full px-5 pt-4 pb-8 flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 text-[#534434]/80 text-xs sm:text-sm font-medium">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-[#006C49]"
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
              Playing as <strong className="text-[#18181B] font-semibold">{state.nickname}</strong> • One attempt only per question
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
