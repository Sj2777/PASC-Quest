import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '../api';
import type { PollLaunchItem, Student, StreakStatus } from '../api';


/** Format expiry as a countdown, e.g. "Expires in 3h 42m" */
function formatExpiryCountdown(expiresAt: string, nowMs: number): string {
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (diffMs <= 0) return 'Expired';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
}

export default function Landing() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [polls, setPolls] = useState<PollLaunchItem[]>([]);
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  // Per-launch starting state (keyed by pollLaunchId)
  const [starting, setStarting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const shouldReduceMotion = useReducedMotion();

  // Animation states
  const [animationState, setAnimationState] = useState<'none' | 'milestone' | 'comeback_reveal' | 'comeback_progress' | 'restored'>('none');
  const [milestone, setMilestone] = useState<number | null>(null);
  const [restoredStreak, setRestoredStreak] = useState<number | null>(null);

  const MILESTONES = [3, 7, 14, 30];

  // Tick every minute to update countdown UI
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Automatic refetch when a launch expires
  useEffect(() => {
    if (polls.length === 0) return;
    let minDelay = Infinity;
    const currentNow = Date.now();
    polls.forEach(p => {
      const ms = new Date(p.expiresAt).getTime() - currentNow;
      if (ms > 0 && ms < minDelay) minDelay = ms;
    });

    if (minDelay === Infinity) return;
    const delay = minDelay + 1000; // wait 1s past exact expiry to avoid race conditions
    // Max timeout is ~24 days, safe for browser setTimeout
    const timer = setTimeout(() => {
      api.getCurrent().then(setPolls).catch(console.error);
    }, delay);
    return () => clearTimeout(timer);
  }, [polls]);

  useEffect(() => {
    api.getMe()
      .then((me) => {
        setStudent(me);
        api.getStreakStatus().then((newStatus) => {
          setStreakStatus(newStatus);
          
          try {
            const stored = localStorage.getItem('lastStreakStatus');
            if (stored) {
              const last = JSON.parse(stored);
              
              if (last && typeof last === 'object') {
                if (last.comebackActive && !newStatus.comebackActive && newStatus.currentStreak > (last.currentStreak || 0)) {
                  setRestoredStreak(newStatus.currentStreak);
                  setAnimationState('restored');
                } else if (!last.comebackActive && newStatus.comebackActive) {
                  setAnimationState('comeback_reveal');
                } else if (last.comebackActive && newStatus.comebackActive && (last.comebackProgress || 0) < newStatus.comebackProgress) {
                  setAnimationState('comeback_progress');
                } else {
                  const crossed = MILESTONES.find(m => (last.currentStreak || 0) < m && newStatus.currentStreak >= m);
                  if (crossed) {
                    setMilestone(crossed);
                    setAnimationState('milestone');
                  }
                }
              }
            }
          } catch (e) {
            console.error('Failed to parse lastStreakStatus:', e);
          }
          localStorage.setItem('lastStreakStatus', JSON.stringify(newStatus));
        }).catch(() => {});
        return api.getCurrent();
      })
      .then((currentPolls) => {
        setPolls(currentPolls);
      })
      .catch((err) => {
        if (err?.status === 401 || err?.error === 'not_authenticated') {
          navigate('/auth');
        } else {
          setPolls([]);
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (animationState === 'milestone' || animationState === 'restored') {
      const t = setTimeout(() => {
        setAnimationState('none');
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [animationState]);

  const handleLogout = async () => {
    await api.logoutStudent().catch(() => {});
    navigate('/auth');
  };

  // Phase 7C-A: Each Play button is per-launch. We start THAT specific launch
  // and navigate to QuestionPage with its pollLaunchId.
  const handleStart = async (pollItem: PollLaunchItem) => {
    if (!student) return;
    const id = pollItem.pollLaunchId;
    setStarting((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const { token, timerSeconds } = await api.startPoll(id, student.nickname);
      // Pass the PollLaunchItem as the poll object. QuestionPage reads:
      //   poll.text, poll.options, poll.pollLaunchId, poll.questionId — all present.
      navigate('/play', { state: { poll: pollItem, token, timerSeconds, nickname: student.nickname } });
    } catch (err: any) {
      if (err?.status === 401 || err?.error === 'not_authenticated') {
        navigate('/auth');
        return;
      }
      if (err?.reason === 'already_played') {
        setErrors((prev) => ({ ...prev, [id]: "You've already answered this question." }));
      } else {
        setErrors((prev) => ({ ...prev, [id]: 'Something went wrong. Please try again.' }));
      }
    } finally {
      setStarting((prev) => ({ ...prev, [id]: false }));
    }
  };

  // For the leaderboard button in the nav: if exactly one poll is live use it,
  // otherwise hide the button (multi-question leaderboard navigation is Phase 7C-B).
  const singlePollId = polls.length === 1 ? polls[0].pollLaunchId : null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Ambient blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* User bar / Logged in indicator */}
        {student && (
          <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {student.nickname}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/social')}
                className="text-xs font-semibold px-3 py-1 rounded-xl border transition-all bg-white/50 hover:bg-white text-gray-700"
                style={{ borderColor: '#E4D9FF' }}
              >
                Social
              </button>
              <button
                onClick={() => navigate('/stats')}
                className="text-xs font-semibold px-3 py-1 rounded-xl border transition-all bg-white/50 hover:bg-white text-gray-700"
                style={{ borderColor: '#E4D9FF' }}
              >
                Stats
              </button>
              {/* Leaderboard button: only shown when exactly one poll is live */}
              {singlePollId && (
                <button
                  onClick={() => navigate(`/leaderboard/${singlePollId}`)}
                  className="text-xs font-semibold px-3 py-1 rounded-xl border transition-all bg-white/50 hover:bg-white text-gray-700"
                  style={{ borderColor: '#E4D9FF' }}
                >
                  Leaderboard
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1 rounded-xl border transition-all hover:bg-white text-gray-500 hover:text-gray-800"
                style={{ borderColor: '#E4D9FF' }}
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] mb-4"
            style={{ background: 'var(--primary)', boxShadow: '0 8px 32px rgba(255,77,141,0.35)' }}
          >
            <span className="text-4xl">🎯</span>
          </motion.div>
          <h1 className="font-display text-5xl font-extrabold" style={{ color: 'var(--ink)' }}>
            QuizPop
          </h1>
          <p className="mt-2 text-base font-medium" style={{ color: '#6B5B8E' }}>
            Available questions. One shot each.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-[28px] p-8"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 40px rgba(36,27,58,0.12)' }}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
            </div>
          ) : polls.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">☕</div>
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Nothing live yet
              </h2>
              <p className="mt-2 text-sm" style={{ color: '#6B5B8E' }}>
                No questions are available right now. Check back soon!
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
                Ready to play?
              </h2>
              <p className="text-sm mb-6" style={{ color: '#6B5B8E' }}>
                {polls.length === 1
                  ? 'Answer the live question before time runs out.'
                  : `${polls.length} questions are live. Answer any or all of them.`}
              </p>

              {/* Streak & Comeback UI — unchanged */}
              {streakStatus && streakStatus.comebackActive && (
                <motion.div 
                  initial={animationState === 'comeback_reveal' ? { opacity: 0, scale: shouldReduceMotion ? 1 : 0.9, y: shouldReduceMotion ? 0 : 10 } : false}
                  animate={
                    animationState === 'comeback_reveal' 
                      ? { opacity: 1, scale: 1, y: 0, x: shouldReduceMotion ? 0 : [0, -6, 6, -4, 4, 0] } 
                      : { opacity: 1, scale: 1, y: 0, x: 0 }
                  }
                  transition={{ duration: 0.5 }}
                  className="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">💔</span>
                    <h3 className="font-bold text-orange-800">Streak Broken!</h3>
                  </div>
                  <p className="text-sm text-orange-700 mb-3">
                    Your previous streak: <strong>{streakStatus.preBreakStreak} days</strong><br/>
                    Complete the next 3 days to restore it.
                  </p>
                  
                  <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1.5">
                    Recovery: {streakStatus.comebackProgress} / 3
                  </p>
                  <div className="flex gap-1.5 mb-2">
                    {[1, 2, 3].map(step => {
                      const isCompleted = step <= streakStatus.comebackProgress;
                      const isJustCompleted = animationState === 'comeback_progress' && step === streakStatus.comebackProgress;
                      return (
                        <div key={step} className="relative w-5 h-5">
                          <div className="absolute inset-0 rounded-full border-2 border-orange-300" />
                          {isCompleted && (
                             <motion.div 
                               initial={isJustCompleted ? { scale: shouldReduceMotion ? 1 : 0, opacity: shouldReduceMotion ? 0 : 1 } : false}
                               animate={{ scale: 1, opacity: 1 }}
                               transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                               className="absolute inset-0 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold" 
                             >
                               ✓
                             </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {streakStatus && !streakStatus.comebackActive && streakStatus.currentStreak > 0 && (
                <AnimatePresence mode="wait">
                  {animationState === 'milestone' ? (
                    <motion.div 
                      key="milestone"
                      initial={{ scale: shouldReduceMotion ? 1 : 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: shouldReduceMotion ? 1 : 0.9, opacity: 0 }}
                      className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 text-center shadow-sm"
                    >
                      <motion.div animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl mb-1">🔥</motion.div>
                      <h3 className="font-bold text-orange-900 text-lg">{milestone} Day Streak!</h3>
                      <p className="text-sm text-orange-800 font-medium">
                        {milestone === 3 ? "Keep it going." : milestone === 7 ? "One week strong." : milestone === 14 ? "Two weeks strong." : "30 days!"}
                      </p>
                    </motion.div>
                  ) : animationState === 'restored' ? (
                    <motion.div
                      key="restored"
                      initial={{ scale: shouldReduceMotion ? 1 : 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: shouldReduceMotion ? 1 : 0.9, opacity: 0 }}
                      className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col items-center text-center shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    >
                      <motion.div animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl mb-1">🔥</motion.div>
                      <h3 className="font-bold text-emerald-800 text-lg">Streak Restored!</h3>
                      <p className="text-sm text-emerald-700 mt-1 font-medium">
                        Your streak is back: <strong>{restoredStreak} days</strong>
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="normal"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-bold text-emerald-800">You're on fire! 🔥</h3>
                        <p className="text-xs font-medium text-emerald-700 mt-1">
                          {streakStatus.currentStreak} day streak
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* "Playing as" chip */}
              <div
                className="rounded-2xl p-4 mb-5 flex items-center justify-between"
                style={{ background: '#F5F0FF', border: '1.5px solid #E4D9FF' }}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#8A7BA8' }}>
                    Playing as
                  </p>
                  <p className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>
                    {student?.nickname}
                  </p>
                </div>
                <span className="text-2xl">⚡</span>
              </div>

              {/* Phase 7C-A: Per-launch question cards */}
              <div className="space-y-3">
                {polls.map((pollItem, idx) => {
                  const id = pollItem.pollLaunchId;
                  const isStarting = starting[id] ?? false;
                  const err = errors[id] ?? '';
                  const isCompleted = pollItem.completed;
                  const isExpiredLocal = new Date(pollItem.expiresAt).getTime() - now <= 0;

                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * idx, duration: 0.3 }}
                      className="rounded-2xl p-4"
                      style={{
                        background: isCompleted ? '#F0FDF4' : '#F5F0FF',
                        border: isCompleted ? '1.5px solid #BBF7D0' : '1.5px solid #E4D9FF',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: isCompleted ? '#22C55E' : '#8A7BA8' }}>
                            Question {polls.length > 1 ? idx + 1 : ''} {isCompleted && '— COMPLETED'}
                          </p>
                          <p className="font-medium text-sm leading-snug line-clamp-2" style={{ color: 'var(--ink)' }}>
                            {pollItem.text}
                          </p>
                          <p className="text-xs mt-1.5" style={{ color: isCompleted ? '#4ADE80' : '#A89BC4' }}>
                            {formatExpiryCountdown(pollItem.expiresAt, now)}
                          </p>
                          {err && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-1.5 text-xs font-medium"
                              style={{ color: 'var(--error)' }}
                            >
                              {err}
                            </motion.p>
                          )}
                        </div>
                        {isCompleted ? (
                          <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-center">
                            <span className="text-2xl">✅</span>
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleStart(pollItem)}
                            disabled={isStarting || isExpiredLocal}
                            className="flex-shrink-0 px-5 py-2.5 rounded-xl text-white font-bold text-sm font-display transition-opacity disabled:opacity-60"
                            style={{ background: isExpiredLocal ? 'var(--gray-300)' : 'var(--primary)', boxShadow: isExpiredLocal ? 'none' : '0 4px 16px rgba(255,77,141,0.35)' }}
                          >
                            {isStarting ? 'Starting…' : isExpiredLocal ? 'Wait...' : 'Play'}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <p className="mt-5 text-xs text-center" style={{ color: '#A89BC4' }}>
                One attempt per question.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
