import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api, type PollCurrent, type SpeedKing, type GhostMode } from '../api';

const TIMEOUT_EMOJIS = ['⏰', '💨', '⚡', '🕐'];

interface ResultState {
  result: {
    result: 'correct' | 'wrong' | 'timeout';
    correctIndex: number;
    awardedPoints?: number;
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
      navigate('/auth');
      return;
    }

    if (state.result.result === 'correct' && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 160,
        spread: 85,
        origin: { y: 0.45 },
        colors: ['#DB3320', '#F59E0B', '#006C49', '#855300', '#FFDAD4'],
        scalar: 1.05,
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

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between py-6 sm:py-10 px-4">
      {/* Centered tactical mobile envelope (max 430px, tablet/desktop responsive) */}
      <div className="w-full max-w-[430px] sm:max-w-lg md:max-w-none mx-auto flex flex-col gap-4 sm:gap-5 relative shadow-[0_0_50px_rgba(39,34,26,0.06)] md:shadow-none bg-[#FAF8F5]">
        
        {/* Result Hero Section */}
        <motion.div
          initial={{ scale: shouldReduceMotion ? 1 : 0.9, opacity: 0 }}
          animate={
            outcome === 'wrong'
              ? { scale: 1, opacity: 1, x: shouldReduceMotion ? 0 : [0, -8, 8, -4, 4, 0] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center pt-2 pb-1"
        >
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mb-3 text-xs font-sans font-extrabold tracking-wider uppercase transition-all shadow-sm ${config.badgeBg} ${config.badgeBorder} ${config.badgeShadow}`}>
            <span
              className={`w-2 h-2 rounded-full ${
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
            <div className="flex justify-center gap-2 mb-2">
              {TIMEOUT_EMOJIS.map((e, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 260 }}
                  className="text-2xl"
                >
                  {e}
                </motion.span>
              ))}
            </div>
          )}

          {/* Editorial Headline */}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#18181B] leading-tight">
            {config.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-1.5 text-xs sm:text-sm font-sans font-medium text-[#534434] max-w-sm mx-auto">
            {config.subtitle}
          </p>

          {/* Points & Streak Feedback */}
          <div className="flex flex-col items-center justify-center gap-1 mt-4">
            <div className={`font-sans font-extrabold text-xl sm:text-2xl ${outcome === 'correct' ? 'text-[#006C49]' : 'text-[#855300]'}`}>
              {state.result.awardedPoints != null ? (state.result.awardedPoints === 0 ? '0 pts' : `+${state.result.awardedPoints} pts`) : '0 pts'}
            </div>
            {me?.currentStreak !== undefined && me.currentStreak > 0 && (
              <div className="font-sans text-sm font-bold text-[#DB3320]">
                🔥 {me.currentStreak} day streak{me.currentStreak !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </motion.div>

        {/* Question & Answer Review Plaque */}
        <motion.div
          initial={{ y: shouldReduceMotion ? 0 : 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="relative bg-white border border-[#E5E1D8] rounded-xl p-5 sm:p-6 shadow-[0_3px_0_#E2DDD2,0_6px_16px_rgba(39,34,26,0.04)]"
        >
          {/* Raised Category Tab */}
          <div className="absolute -top-3 left-4 bg-[#18181B] text-[#FAF8F5] text-[10px] font-sans font-bold tracking-widest px-2.5 py-0.5 rounded uppercase">
            ANSWER REVIEW
          </div>

          {/* Question Text */}
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#18181B] leading-snug pt-1 mb-5 break-words">
            {poll.text}
          </h2>

          {/* Options Stack */}
          <div aria-label="Reviewed Answers" className="space-y-2.5">
            {options.map((opt, idx) => {
              const isCorrect = idx === correctIndex;

              return (
                <div
                  key={idx}
                  className={`w-full text-left rounded-xl p-3.5 sm:p-4 flex items-center justify-between transition-all ${
                    isCorrect
                      ? 'bg-[#ECFDF5] border-2 border-[#10B981] shadow-[0_3px_0_#059669]'
                      : 'bg-white border border-[#E5E1D8] shadow-[0_2px_0_#DDD8CE] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {/* Alphabet Badge */}
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-sans text-sm font-bold flex-shrink-0 transition-colors ${
                        isCorrect
                          ? 'bg-[#10B981] text-white shadow-sm'
                          : 'bg-[#F0EDF1] border border-[#E5E1D8] text-[#534434]'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>

                    {/* Option Text */}
                    <span
                      className={`font-sans text-sm sm:text-base leading-snug break-words ${
                        isCorrect
                          ? 'text-[#18181B] font-bold'
                          : 'text-[#534434] font-medium'
                      }`}
                    >
                      {opt}
                    </span>
                  </div>

                  {/* Confirmation Badge for Correct Answer */}
                  {isCorrect && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#10B981]/15 text-[#006C49] text-xs font-sans font-extrabold flex-shrink-0">
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
                      <span className="hidden sm:inline">CORRECT</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Speed King Plaque */}
        {speedKing && (
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 25 }}
            className={`rounded-xl p-4 sm:p-5 flex items-center justify-between ${
              isSpeedKingWinner
                ? 'bg-[#FFFBEB] border-2 border-[#F59E0B] shadow-[0_4px_0_#D97706]'
                : 'bg-white border border-[#E5E1D8] shadow-[0_3px_0_#E2DDD2]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-sm ${
                  isSpeedKingWinner
                    ? 'bg-[#F59E0B] text-white'
                    : 'bg-[#FFEDD5] text-[#855300] border border-[#F59E0B]/30'
                }`}
              >
                ⚡
              </div>
              <div>
                <p
                  className={`text-[10px] sm:text-[11px] font-sans font-extrabold uppercase tracking-wider ${
                    isSpeedKingWinner ? 'text-[#B45309]' : 'text-[#867461]'
                  }`}
                >
                  {isSpeedKingWinner ? 'SPEED KING WINNER' : 'SPEED KING'}
                </p>
                <p className="font-serif text-base sm:text-lg font-bold text-[#18181B] leading-tight">
                  {isSpeedKingWinner ? 'Fastest correct answer!' : speedKing.nickname}
                </p>
              </div>
            </div>

            <div className="text-right pl-3 flex-shrink-0">
              <span
                className={`font-sans font-extrabold text-base sm:text-xl tabular-nums px-2.5 py-1 rounded-lg ${
                  isSpeedKingWinner
                    ? 'bg-[#F59E0B]/20 text-[#B45309]'
                    : 'bg-[#F0EDF1] border border-[#E5E1D8] text-[#534434]'
                }`}
              >
                {formatTime(speedKing.timeTakenMs)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Ghost Mode Analytics Card */}
        {ghostMode && ghostMode.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white border border-[#E5E1D8] rounded-xl p-5 shadow-[0_3px_0_#E2DDD2]"
          >
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E1D8]/60 pb-3">
              <h3 className="font-sans font-bold text-xs sm:text-sm text-[#18181B] uppercase tracking-wider flex items-center gap-1.5">
                <span>👻</span> Campus Ghost Mode
              </h3>
              <span className="text-[11px] font-sans font-bold text-[#534434] bg-[#F0EDF1] border border-[#E5E1D8] px-2.5 py-0.5 rounded-full">
                {ghostMode.total} attempt{ghostMode.total !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Correct row */}
              <div>
                <div className="flex items-center justify-between text-xs font-sans mb-1.5">
                  <span className="font-bold text-[#006C49] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Correct
                  </span>
                  <span className="font-extrabold text-[#18181B] tabular-nums">
                    {ghostMode.correctPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#E5E1D8]/60 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="bg-[#10B981] h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${ghostMode.correctPercent}%` }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut', delay: 0.6 }}
                  />
                </div>
              </div>

              {/* Wrong row */}
              <div>
                <div className="flex items-center justify-between text-xs font-sans mb-1.5">
                  <span className="font-bold text-[#B71607] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#DB3320]" /> Wrong
                  </span>
                  <span className="font-extrabold text-[#18181B] tabular-nums">
                    {ghostMode.wrongPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#E5E1D8]/60 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="bg-[#DB3320] h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${ghostMode.wrongPercent}%` }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut', delay: 0.6 }}
                  />
                </div>
              </div>

              {/* Timeout row */}
              <div>
                <div className="flex items-center justify-between text-xs font-sans mb-1.5">
                  <span className="font-bold text-[#855300] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Timeout
                  </span>
                  <span className="font-extrabold text-[#18181B] tabular-nums">
                    {ghostMode.timeoutPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#E5E1D8]/60 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="bg-[#F59E0B] h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${ghostMode.timeoutPercent}%` }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut', delay: 0.6 }}
                  />
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
          className="flex flex-col gap-3 pt-2"
        >
          {/* Primary Kinetic Red Button */}
          <button
            type="button"
            onClick={() => navigate('/student')}
            className="w-full py-3.5 px-6 rounded-xl font-sans font-extrabold text-sm sm:text-base bg-[#DB3320] text-white shadow-[0_4px_0_#920700] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            <span>← Back to Questions</span>
          </button>

          {/* Secondary Varsity White Button */}
          <button
            type="button"
            onClick={() => navigate(`/leaderboard/${targetLaunchId}`)}
            className="w-full py-3 px-6 rounded-xl font-sans font-bold text-sm sm:text-base bg-white text-[#18181B] border border-[#E5E1D8] shadow-[0_3px_0_#DDD8CE] hover:border-[#867461] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🏆 See Leaderboard</span>
          </button>
        </motion.div>

        {/* Bottom Trust Footnote */}
        <footer className="w-full pt-1 pb-4 flex flex-col items-center">
          <div className="flex items-center justify-center gap-1.5 text-[#534434]/80 text-xs font-sans font-medium">
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
              Playing as <strong className="text-[#18181B] font-semibold">{me?.nickname || 'Student'}</strong> • Attempt recorded
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
