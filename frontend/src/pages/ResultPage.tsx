import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api, type PollCurrent, type SpeedKing, type GhostMode } from '../api';

const TIMEOUT_EMOJIS = ['⏰', '💨', '⚡', '🕐'];

interface ResultState {
  result: {
    result: 'correct' | 'wrong' | 'timeout';
    correctIndex: number;
    awardedPoints?: number;
    timeTakenMs?: number;
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
  const [me, setMe] = useState<{ nickname: string; currentStreak?: number } | null>(null);

  useEffect(() => {
    if (!state) {
      navigate('/');
      return;
    }

    if (state.result.result === 'correct' && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 300,
        spread: 100,
        origin: { y: 0.45 },
        colors: ['#DB3320', '#F59E0B', '#006C49', '#855300', '#FFDAD4', '#FFD700'],
        scalar: 1.2,
      });
    }

    // Secondary fetch calls - non-blocking with graceful catch
    api.getMe().then(setMe).catch(() => {});

    const { poll, pollLaunchId, questionId } = state;
    const targetId = pollLaunchId || poll.pollLaunchId || questionId;
    if (targetId) {
      api.getGhostMode(targetId).then(setGhostMode).catch(() => {});
      api.getSpeedKing(targetId).then(res => setSpeedKing(res.speedKing)).catch(() => {});
    }
  }, [state, navigate]);

  if (!state) return null;

  const { result, poll, pollLaunchId, questionId } = state;
  const targetLaunchId = pollLaunchId || poll.pollLaunchId || questionId;
  const { result: outcome, correctIndex } = result;

  const config = {
    correct: {
      badge: 'CORRECT ANSWER',
      badgeBg: 'bg-[#ECFDF5]',
      badgeBorder: 'border-[#10B981]/40',
      badgeShadow: 'shadow-[0_2px_0_#A7F3D0]',
      badgeText: 'text-[#006C49]',
      title: "That's right!",
      subtitle: 'Great job, you nailed it.',
    },
    wrong: {
      badge: 'INCORRECT',
      badgeBg: 'bg-[#FFF0EE]',
      badgeBorder: 'border-[#DB3320]/30',
      badgeShadow: 'shadow-[0_2px_0_#FFDAD4]',
      badgeText: 'text-[#B71607]',
      title: 'Not quite',
      subtitle: "That wasn't the one — the correct answer is shown below.",
    },
    timeout: {
      badge: 'TIME EXPIRED',
      badgeBg: 'bg-[#FFEDD5]',
      badgeBorder: 'border-[#F59E0B]/40',
      badgeShadow: 'shadow-[0_2px_0_#FED7AA]',
      badgeText: 'text-[#855300]',
      title: "Time's up",
      subtitle: "Don't worry, keep trying!",
    },
  }[outcome];

  const options = poll.options ?? [];

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const isSpeedKingWinner = me?.nickname === speedKing?.nickname;
  const myTime = state.result.timeTakenMs;
  const diffTime = (myTime && speedKing) ? myTime - speedKing.timeTakenMs : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`I just scored ${state.result.awardedPoints || 0} pts on QuizPop! Can you beat me?`);
  };

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between py-6 sm:py-10 px-4 sm:px-6 md:px-8 relative overflow-hidden">
      <AnimatePresence>
        {outcome === 'wrong' && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="fixed inset-0 bg-[#DB3320]/5 pointer-events-none z-50 vignette-urgent"
          />
        )}
      </AnimatePresence>

      {/* Widescreen 16:9 responsive container */}
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 sm:gap-8 relative bg-[#FAF8F5] z-10">
        
        {/* Result Hero Section */}
        <motion.div
          initial={{ scale: shouldReduceMotion ? 1 : 0.9, opacity: 0 }}
          animate={
            outcome === 'wrong'
              ? { scale: 1, opacity: 1, x: shouldReduceMotion ? 0 : [0, -8, 8, -4, 4, 0] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center pt-2 pb-1 relative"
        >
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4 text-xs sm:text-sm font-sans font-extrabold tracking-wider uppercase transition-all shadow-sm ${config.badgeBg} ${config.badgeBorder} ${config.badgeShadow} ${outcome === 'correct' ? 'shimmer' : ''}`}>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                outcome === 'correct'
                  ? 'bg-[#10B981]'
                  : outcome === 'wrong'
                  ? 'bg-[#DB3320]'
                  : 'bg-[#F59E0B]'
              }`}
            />
            <span className={config.badgeText}>{config.badge}</span>
          </div>

          {/* Timeout emoji accent (staggered) */}
          {outcome === 'timeout' && (
            <div className="flex justify-center gap-3 mb-3 relative h-12">
              {TIMEOUT_EMOJIS.map((e, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.15, type: 'spring', stiffness: 260 }}
                  className="text-2xl sm:text-3xl absolute float-gentle"
                  style={{ left: `calc(50% + ${(i - 1.5) * 40}px)`, animationDelay: `${i * 0.5}s` }}
                >
                  {e}
                </motion.span>
              ))}
            </div>
          )}

          {/* Editorial Headline */}
          <h1 className="font-serif text-2xl sm:text-3xl md:text-3xl font-bold tracking-tight text-[#18181B] leading-tight">
            {config.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-sm sm:text-base font-sans font-medium text-[#534434] max-w-lg mx-auto">
            {config.subtitle}
          </p>

          {/* Points & Streak Feedback */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <div className={`font-sans font-extrabold text-2xl sm:text-3xl md:text-3xl px-6 py-2 rounded-2xl bg-white border border-[#E5E1D8] shadow-sm ${outcome === 'correct' ? 'text-[#006C49] glow-gold golden-flash' : 'text-[#855300]'}`}>
              {state.result.awardedPoints != null ? (state.result.awardedPoints === 0 ? '0 pts' : `+${state.result.awardedPoints} pts`) : '0 pts'}
            </div>
            {me?.currentStreak !== undefined && me.currentStreak > 0 && (
              <div className={`font-sans text-base sm:text-lg font-bold text-[#DB3320] bg-[#FFF0EE] border border-[#FFDAD4] px-4 py-2 rounded-2xl shadow-sm ${me.currentStreak > 2 ? 'fire-particles' : ''}`}>
                🔥 {me.currentStreak} day streak{me.currentStreak !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </motion.div>

        {/* Widescreen 16:9 Two-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column (7 cols): Question & Answer Review Plaque */}
          <motion.div
            initial={{ y: shouldReduceMotion ? 0 : 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="lg:col-span-7 relative bg-white border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 shadow-[0_4px_0_#E2DDD2,0_8px_24px_rgba(39,34,26,0.04)] gradient-border card-lift"
          >
            {/* Raised Category Tab */}
            <div className="absolute -top-3.5 left-6 bg-[#18181B] text-[#FAF8F5] text-xs font-sans font-bold tracking-widest px-3 py-1 rounded uppercase shadow-sm shimmer">
              ANSWER REVIEW
            </div>

            {/* Question Text */}
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#18181B] leading-snug pt-2 mb-6 break-words">
              {poll.text}
            </h2>

            {/* Options Stack */}
            <div aria-label="Reviewed Answers" className="space-y-3">
              {options.map((opt, idx) => {
                const isCorrect = idx === correctIndex;

                return (
                  <div
                    key={idx}
                    className={`w-full text-left rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all ${
                      isCorrect
                        ? 'bg-[#ECFDF5] border-2 border-[#10B981] shadow-[0_3px_0_#059669] glow-green'
                        : 'bg-white border border-[#E5E1D8] shadow-[0_2px_0_#DDD8CE] opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {/* Alphabet Badge */}
                      <span
                        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-sans text-sm sm:text-base font-bold flex-shrink-0 transition-colors ${
                          isCorrect
                            ? 'bg-[#10B981] text-white shadow-sm'
                            : 'bg-[#F0EDF1] border border-[#E5E1D8] text-[#534434]'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>

                      {/* Option Text */}
                      <span
                        className={`font-sans text-base sm:text-lg leading-snug break-words ${
                          isCorrect
                            ? 'text-[#006C49] font-extrabold'
                            : 'text-[#534434] font-medium'
                        }`}
                      >
                        {opt}
                      </span>
                    </div>

                    {/* Confirmation Badge for Correct Answer */}
                    {isCorrect && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981]/15 text-[#006C49] text-xs sm:text-sm font-sans font-extrabold flex-shrink-0">
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
                        <span>CORRECT</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column (5 cols): Speed King, Ghost Mode, and Action CTA Buttons */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Speed King Plaque */}
            {speedKing && (
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 25 }}
                className={`rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative card-lift ${
                  isSpeedKingWinner
                    ? 'bg-[#FFFBEB] border-2 border-[#F59E0B] shadow-[0_4px_0_#D97706] glow-gold shimmer'
                    : 'bg-white border border-[#E5E1D8] shadow-[0_3px_0_#E2DDD2]'
                }`}
              >
                {isSpeedKingWinner && (
                  <motion.div 
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="absolute -top-6 -right-2 text-3xl float-gentle z-20 drop-shadow-md"
                  >
                    👑
                  </motion.div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-sm ${
                        isSpeedKingWinner
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-[#FFEDD5] text-[#855300] border border-[#F59E0B]/30'
                      }`}
                    >
                      ⚡
                    </div>
                    <div>
                      <p
                        className={`text-xs font-sans font-extrabold uppercase tracking-wider ${
                          isSpeedKingWinner ? 'text-[#B45309]' : 'text-[#867461]'
                        }`}
                      >
                        {isSpeedKingWinner ? 'SPEED KING WINNER' : 'SPEED KING'}
                      </p>
                      <p className="font-serif text-lg sm:text-xl font-bold text-[#18181B] leading-tight mt-0.5">
                        {isSpeedKingWinner ? 'Fastest correct answer!' : speedKing.nickname}
                      </p>
                    </div>
                  </div>

                  <div className="text-right pl-3 flex-shrink-0">
                    <span
                      className={`font-sans font-extrabold text-lg sm:text-2xl tabular-nums px-3 py-1.5 rounded-xl ${
                        isSpeedKingWinner
                          ? 'bg-[#F59E0B]/20 text-[#B45309]'
                          : 'bg-[#F0EDF1] border border-[#E5E1D8] text-[#534434]'
                      }`}
                    >
                      {formatTime(speedKing.timeTakenMs)}
                    </span>
                  </div>
                </div>

                {!isSpeedKingWinner && diffTime != null && diffTime > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#E5E1D8] flex items-center justify-between">
                    <span className="text-sm font-sans font-medium text-[#855300]">You were {(diffTime / 1000).toFixed(2)}s behind!</span>
                    <div className="w-1/2 h-2 bg-[#F0EDF1] rounded-full overflow-hidden">
                      <div className="h-full bg-[#F59E0B]" style={{ width: `${Math.max(10, 100 - (diffTime / 5000) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Ghost Mode Analytics Card */}
            {ghostMode && ghostMode.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white border border-[#E5E1D8] rounded-2xl p-6 shadow-[0_3px_0_#E2DDD2] card-lift"
              >
                <div className="flex items-center justify-between mb-4 border-b border-[#E5E1D8]/60 pb-3">
                  <h3 className="font-sans font-bold text-sm text-[#18181B] uppercase tracking-wider flex items-center gap-2">
                    <span className="text-lg">👻</span> Campus Ghost Mode
                  </h3>
                  <span className="text-xs font-sans font-bold text-[#534434] bg-[#F0EDF1] border border-[#E5E1D8] px-3 py-1 rounded-full">
                    {ghostMode.total} attempt{ghostMode.total !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Correct row */}
                  <div className="bg-[#ECFDF5]/50 p-2 rounded-xl">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-sans mb-1.5">
                      <span className="font-bold text-[#006C49] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Correct
                      </span>
                      <span className="font-extrabold text-[#18181B] tabular-nums">
                        {ghostMode.correctPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E1D8]/60 rounded-full h-3 overflow-hidden relative">
                      <motion.div
                        className="bg-[#10B981] h-full rounded-full progress-glow flex items-center justify-end pr-1"
                        initial={{ width: 0 }}
                        animate={{ width: `${ghostMode.correctPercent}%` }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut', delay: 0.6 }}
                      >
                        {ghostMode.correctPercent > 15 && <span className="text-[10px] text-white font-bold">{Math.round(ghostMode.correctPercent)}%</span>}
                      </motion.div>
                    </div>
                  </div>

                  {/* Wrong row */}
                  <div className="bg-[#FFF0EE]/50 p-2 rounded-xl">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-sans mb-1.5">
                      <span className="font-bold text-[#B71607] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#DB3320]" /> Wrong
                      </span>
                      <span className="font-extrabold text-[#18181B] tabular-nums">
                        {ghostMode.wrongPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E1D8]/60 rounded-full h-3 overflow-hidden relative">
                      <motion.div
                        className="bg-[#DB3320] h-full rounded-full progress-glow flex items-center justify-end pr-1"
                        initial={{ width: 0 }}
                        animate={{ width: `${ghostMode.wrongPercent}%` }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut', delay: 0.6 }}
                      >
                        {ghostMode.wrongPercent > 15 && <span className="text-[10px] text-white font-bold">{Math.round(ghostMode.wrongPercent)}%</span>}
                      </motion.div>
                    </div>
                  </div>

                  {/* Timeout row */}
                  <div className="bg-[#FFFBEB]/50 p-2 rounded-xl">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-sans mb-1.5">
                      <span className="font-bold text-[#855300] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Timeout
                      </span>
                      <span className="font-extrabold text-[#18181B] tabular-nums">
                        {ghostMode.timeoutPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E1D8]/60 rounded-full h-3 overflow-hidden relative">
                      <motion.div
                        className="bg-[#F59E0B] h-full rounded-full progress-glow flex items-center justify-end pr-1"
                        initial={{ width: 0 }}
                        animate={{ width: `${ghostMode.timeoutPercent}%` }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut', delay: 0.6 }}
                      >
                        {ghostMode.timeoutPercent > 15 && <span className="text-[10px] text-white font-bold">{Math.round(ghostMode.timeoutPercent)}%</span>}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons Stack */}
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3 pt-1"
            >
              {/* Primary Kinetic Red Button */}
              <button
                type="button"
                onClick={() => navigate('/student')}
                className="w-full py-4 px-6 rounded-xl font-sans font-extrabold text-sm sm:text-base bg-[#DB3320] text-white shadow-[0_4px_0_#920700] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer border-0 shimmer-fast tactile-btn-red"
              >
                <span>Next Challenge →</span>
              </button>

              <div className="flex gap-3">
                {/* Secondary Varsity White Button */}
                <button
                  type="button"
                  onClick={() => navigate(`/leaderboard/${targetLaunchId}`)}
                  className="w-1/2 py-3.5 px-3 rounded-xl font-sans font-bold text-sm sm:text-base bg-white text-[#18181B] border border-[#E5E1D8] shadow-[0_3px_0_#DDD8CE] hover:border-[#867461] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer tactile-btn-white"
                >
                  <span>🏆 Leaderboard</span>
                </button>
                
                {/* Third Copy Result Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-1/2 py-3.5 px-3 rounded-xl font-sans font-bold text-sm sm:text-base bg-white text-[#18181B] border border-[#E5E1D8] shadow-[0_3px_0_#DDD8CE] hover:border-[#867461] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer tactile-btn-white"
                >
                  <span>📋 Copy Result</span>
                </button>
              </div>
            </motion.div>
          </div>

        </div>

        {/* Bottom Trust Footnote */}
        <footer className="w-full pt-4 pb-6 flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 text-[#534434]/80 text-xs sm:text-sm font-sans font-medium">
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
              Playing as <strong className="text-[#18181B] font-semibold">{me?.nickname || 'Student'}</strong> • Attempt recorded
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
