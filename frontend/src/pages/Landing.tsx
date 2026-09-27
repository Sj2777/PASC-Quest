import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '../api';
import type { PollLaunchItem, Student, StreakStatus } from '../api';

/** Format expiry as an editorial countdown, e.g. "Expires in 3h 42m" */
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

  const [animationState, setAnimationState] = useState<'none' | 'milestone' | 'comeback_reveal' | 'comeback_progress' | 'restored'>('none');
  const [milestone, setMilestone] = useState<number | null>(null);
  const [restoredStreak, setRestoredStreak] = useState<number | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [renewFeedback, setRenewFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

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
    polls.forEach((p) => {
      const ms = new Date(p.expiresAt).getTime() - currentNow;
      if (ms > 0 && ms < minDelay) minDelay = ms;
    });

    if (minDelay === Infinity) return;
    const delay = minDelay + 1000;
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
                  const crossed = MILESTONES.find((m) => (last.currentStreak || 0) < m && newStatus.currentStreak >= m);
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
          navigate('/');
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
    navigate('/');
  };

  useEffect(() => {
    if (renewFeedback) {
      const t = setTimeout(() => setRenewFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [renewFeedback]);

  const handleRenewStreak = async () => {
    if (renewing) return;
    setRenewing(true);
    setRenewFeedback(null);
    try {
      const res = await api.renewStreak();
      setStudent((prev) => prev ? {
        ...prev,
        currentStreak: res.currentStreak,
        bestStreak: res.bestStreak,
        totalPoints: res.totalPoints,
      } : null);
      setStreakStatus({
        currentStreak: res.currentStreak,
        bestStreak: res.bestStreak,
        comebackActive: false,
        comebackProgress: 0,
        preBreakStreak: 0,
        daysRemainingToRecover: null,
      });
      setRestoredStreak(res.currentStreak);
      setAnimationState('restored');
      setRenewFeedback({ text: `Streak renewed to ${res.currentStreak} day(s)! (-50 pts)` });
      localStorage.setItem('lastStreakStatus', JSON.stringify({
        currentStreak: res.currentStreak,
        bestStreak: res.bestStreak,
        comebackActive: false,
        comebackProgress: 0,
        preBreakStreak: 0,
      }));
    } catch (err: any) {
      setRenewFeedback({
        text: err?.error || err?.message || 'Failed to renew streak.',
        isError: true,
      });
    } finally {
      setRenewing(false);
    }
  };

  const handleStart = async (pollItem: PollLaunchItem) => {
    if (!student) return;
    const id = pollItem.pollLaunchId;
    setStarting((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const { token, timerSeconds } = await api.startPoll(id, student.nickname);
      navigate('/play', { state: { poll: pollItem, token, timerSeconds, nickname: student.nickname } });
    } catch (err: any) {
      if (err?.status === 401 || err?.error === 'not_authenticated') {
        navigate('/');
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

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const activeCount = polls.filter((p) => !p.completed).length;

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between">
      {/* Widescreen 16:9 full-width responsive envelope */}
      <div className="w-full min-h-screen flex flex-col bg-[#FAF8F5] relative pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/80 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="screen-container flex justify-between items-center py-3 sm:py-4">
            {/* Leading: Student initial badge & Newsreader brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full ring-2 ring-[#E5E1D8] bg-[#F0EDF1] flex items-center justify-center font-bold text-[#855300] text-sm sm:text-base shadow-sm select-none">
                {student?.nickname ? student.nickname.charAt(0).toUpperCase() : 'Q'}
              </div>
              <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#855300] tracking-tight">
                QuizPop
              </span>
            </div>

            {/* Trailing: Streak pill, Points pill & logout action */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Streak Pill */}
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full border border-[#D8C3AD]/60 shadow-[0_2px_0_#E2DDD2] active:translate-y-0.5 transition-all text-xs sm:text-sm font-bold text-[#18181B] select-none"
                title="Current active streak"
              >
                <span className="text-base sm:text-lg">🔥</span>
                <span>{streakStatus?.currentStreak ?? student?.currentStreak ?? 0} {((streakStatus?.currentStreak ?? student?.currentStreak ?? 0) === 1) ? 'day' : 'days'}</span>
              </div>

              {/* Points Pill */}
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full border border-[#FDBA74] shadow-[0_2px_0_#FED7AA] active:translate-y-0.5 transition-all text-xs sm:text-sm font-bold text-[#855300] select-none"
                title="Total points earned"
              >
                <span className="text-base sm:text-lg">⭐</span>
                <span className="tabular-nums">{student?.totalPoints ?? 0} pts</span>
              </div>

              {/* Logout Action */}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-full border border-[#D8C3AD]/60 text-[#867461] hover:text-[#18181B] bg-white/70 hover:bg-white shadow-[0_1px_0_#E2DDD2] transition-all active:translate-y-0.5 cursor-pointer"
                title="Sign out"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content: Laptop 16:9 Multi-Column Responsive Grid */}
        <main className="screen-container pt-6 sm:pt-8 md:pt-10 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            
            {/* Left Column: Greeting, Streak Progression, and Academic Division */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Personalized Editorial Hero Greeting */}
              <section className="flex flex-col gap-1.5">
                <p className="font-sans text-xs sm:text-sm font-bold tracking-wider text-[#867461] uppercase break-words">
                  {timeGreeting}, {student?.nickname || 'STUDENT'}
                </p>
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#18181B] font-semibold tracking-tight">
                  Competition
                </h1>
              </section>

              {/* Streak Renewal Notification */}
              {renewFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs sm:text-sm font-bold border transition-all shadow-sm ${
                    renewFeedback.isError
                      ? 'bg-[#FFF0EE] border-[#FFDAD4] text-[#B71607]'
                      : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#006C49]'
                  }`}
                >
                  {renewFeedback.text}
                </div>
              )}

              {/* Steal the Streak / Comeback Recovery Card */}
              {streakStatus && streakStatus.comebackActive && (
                <motion.section
                  initial={animationState === 'comeback_reveal' ? { opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  className="tactile-card rounded-2xl p-5 sm:p-6 bg-white border border-[#FDBA74] shadow-[0_3px_0_#FED7AA] flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-sans text-xs font-bold text-[#855300] tracking-wider uppercase">
                          STEAL THE STREAK
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3].map((step) => {
                            const isCompleted = step <= streakStatus.comebackProgress;
                            return (
                              <div
                                key={step}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                                  isCompleted ? 'bg-[#F59E0B] text-white shadow-sm' : 'bg-[#E4E1E6]'
                                }`}
                              >
                                {isCompleted ? '✓' : ''}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <p className="font-sans text-xs sm:text-sm text-[#534434]">
                        Recover your <strong>{streakStatus.preBreakStreak}-day streak</strong> — Day {streakStatus.comebackProgress} of 3
                      </p>
                    </div>

                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FFDDB8]/70 border border-[#F59E0B]/30 flex items-center justify-center text-2xl text-[#855300] shadow-sm select-none">
                      🔥
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#FED7AA]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs text-[#855300]">
                      <span className="font-medium">Skip the wait: </span>
                      <strong className="block sm:inline">Use points to restore instantly</strong>
                    </div>
                    <button
                      onClick={handleRenewStreak}
                      disabled={renewing || (student?.totalPoints ?? 0) < 50}
                      className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                        (student?.totalPoints ?? 0) >= 50
                          ? 'tactile-btn-primary bg-[#DB3320] text-white hover:bg-[#B71607] shadow-[0_2px_0_#8E1A0C] active:translate-y-0.5'
                          : 'bg-zinc-200 text-zinc-400 border border-zinc-300 cursor-not-allowed shadow-none'
                      }`}
                      title={(student?.totalPoints ?? 0) < 50 ? 'Requires 50 points' : 'Renew streak now'}
                    >
                      <span>🔥</span>
                      <span>{renewing ? 'Renewing...' : 'Renew Streak (50 pts)'}</span>
                    </button>
                  </div>
                </motion.section>
              )}

              {/* Inactive Streak Card - Option to kickstart with points */}
              {streakStatus && !streakStatus.comebackActive && streakStatus.currentStreak === 0 && (
                <section className="tactile-card rounded-2xl p-5 sm:p-6 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-sans text-xs font-bold text-[#867461] tracking-wider uppercase block">
                        STREAK INACTIVE
                      </span>
                      <p className="font-serif text-lg font-bold text-[#18181B] mt-0.5">
                        0 Day Streak
                      </p>
                      <p className="font-sans text-xs sm:text-sm text-[#534434] mt-1">
                        Lost your streak? Redeem 50 points to buy 1 day and ignite your momentum!
                      </p>
                    </div>
                    <span className="text-3xl select-none opacity-60">⏳</span>
                  </div>

                  <div className="pt-2.5 border-t border-[#E5E1D8]/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#855300]">
                      Points: {student?.totalPoints ?? 0} pts
                    </span>
                    <button
                      onClick={handleRenewStreak}
                      disabled={renewing || (student?.totalPoints ?? 0) < 50}
                      className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                        (student?.totalPoints ?? 0) >= 50
                          ? 'tactile-btn-primary bg-[#DB3320] text-white hover:bg-[#B71607] shadow-[0_2px_0_#8E1A0C] active:translate-y-0.5'
                          : 'bg-zinc-200 text-zinc-400 border border-zinc-300 cursor-not-allowed shadow-none'
                      }`}
                      title={(student?.totalPoints ?? 0) < 50 ? 'Requires 50 points' : 'Buy 1 day streak'}
                    >
                      <span>🔥</span>
                      <span>{renewing ? 'Processing...' : 'Buy 1-Day Streak (50 pts)'}</span>
                    </button>
                  </div>
                </section>
              )}

              {/* Milestone Celebration or Normal Streak Card */}
              {streakStatus && !streakStatus.comebackActive && (streakStatus.currentStreak > 0) && (
                <AnimatePresence mode="wait">
                  {animationState === 'milestone' ? (
                    <motion.section
                      key="milestone"
                      initial={{ scale: shouldReduceMotion ? 1 : 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0 }}
                      className="tactile-card rounded-2xl p-5 sm:p-6 text-center bg-white border border-[#FDBA74] shadow-[0_4px_0_#FED7AA]"
                    >
                      <span className="text-4xl block mb-2">🔥</span>
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#855300]">
                        {milestone} Day Streak Milestone!
                      </h3>
                      <p className="font-sans text-xs sm:text-sm text-[#534434] mt-1 font-medium">
                        {milestone === 3 ? "Keep it going!" : milestone === 7 ? "One week strong!" : milestone === 14 ? "Two weeks strong!" : "30 days of excellence!"}
                      </p>
                    </motion.section>
                  ) : animationState === 'restored' ? (
                    <motion.section
                      key="restored"
                      initial={{ scale: shouldReduceMotion ? 1 : 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0 }}
                      className="tactile-card rounded-2xl p-5 sm:p-6 text-center bg-[#ECFDF5] border border-[#A7F3D0] shadow-[0_4px_0_#BBF7D0]"
                    >
                      <span className="text-4xl block mb-2">🛡️</span>
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#006C49]">Streak Restored!</h3>
                      <p className="font-sans text-xs sm:text-sm text-[#065F46] mt-1 font-medium">
                        Your {restoredStreak}-day streak is officially back.
                      </p>
                    </motion.section>
                  ) : (
                    <section className="tactile-card rounded-2xl p-5 sm:p-6 bg-white border border-[#D8C3AD]/40 shadow-[0_2px_4px_rgba(39,34,26,0.04)] flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-sans text-xs font-bold text-[#855300] tracking-wider uppercase block">
                            ACTIVE STREAK
                          </span>
                          <p className="font-sans text-sm sm:text-base font-semibold text-[#18181B] mt-1">
                            {streakStatus.currentStreak} day streak — keep the momentum rolling!
                          </p>
                        </div>
                        <span className="text-3xl select-none">🔥</span>
                      </div>
                      <div className="pt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between">
                        <span className="text-xs text-[#867461]">
                          Extend / repair protection:
                        </span>
                        <button
                          onClick={handleRenewStreak}
                          disabled={renewing || (student?.totalPoints ?? 0) < 50}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1 cursor-pointer ${
                            (student?.totalPoints ?? 0) >= 50
                              ? 'bg-[#FFF8ED] text-[#855300] border border-[#FDBA74] hover:bg-[#FFEDD5] shadow-[0_1px_0_#FED7AA] active:translate-y-0.5'
                              : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed shadow-none'
                          }`}
                          title="Add +1 day streak using 50 points"
                        >
                          <span>🛡️</span>
                          <span>{renewing ? 'Renewing...' : '+1 Day Streak (50 pts)'}</span>
                        </button>
                      </div>
                    </section>
                  )}
                </AnimatePresence>
              )}

              {/* Campus Division & Profile Telemetry Card */}
              <section className="tactile-card rounded-2xl p-5 sm:p-6 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex items-center justify-between">
                <div>
                  <span className="font-sans text-xs font-bold text-[#867461] uppercase tracking-wider block">
                    CAMPUS ACADEMIC DIVISION
                  </span>
                  <p className="font-serif text-lg sm:text-xl font-bold text-[#18181B] mt-1">
                    Branch: {student?.branch || 'General Academic'}
                  </p>
                  <p className="font-sans text-xs sm:text-sm text-[#534434] mt-1">
                    Personal Best: <strong>{student?.bestStreak || 0} days</strong>
                  </p>
                </div>
                <button
                  onClick={() => navigate('/social')}
                  className="tactile-btn-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-sans text-[#18181B] select-none cursor-pointer"
                >
                  Standings ➔
                </button>
              </section>

              {/* Quick Overall Leaderboard Link */}
              <div className="hidden lg:block pt-2">
                <button
                  onClick={() => navigate('/student/leaderboard')}
                  className="inline-flex items-center gap-2 text-[#867461] hover:text-[#18181B] text-sm font-bold underline transition-colors cursor-pointer"
                >
                  <span>View All-Campus Overall Leaderboard</span>
                  <span>➔</span>
                </button>
              </div>
            </div>

            {/* Right Column: Daily Quests / Active Questions Grid */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-1">
                <h2 className="font-serif text-2xl sm:text-3xl text-[#18181B] font-medium">Available quiz questions</h2>
                <span className="font-sans text-xs sm:text-sm font-bold text-[#534434] tracking-wider uppercase px-3 py-1.5 rounded-full bg-[#F0EDF1] border border-[#E5E1D8]">
                  {activeCount} ACTIVE
                </span>
              </div>

              {loading ? (
                <div className="tactile-card rounded-2xl p-12 text-center bg-white border border-[#D8C3AD]/40">
                  <div className="w-10 h-10 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin mx-auto mb-3" />
                  <p className="font-sans text-sm text-[#867461] font-medium">Loading live rounds…</p>
                </div>
              ) : polls.length === 0 ? (
                <div className="tactile-card rounded-2xl p-10 sm:p-14 text-center bg-white border border-[#D8C3AD]/40 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[#F0EDF1] flex items-center justify-center text-3xl mb-4">
                    ☕
                  </div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B]">Nothing live yet</h3>
                  <p className="font-sans text-sm text-[#867461] mt-2 max-w-sm">
                    No questions are available right now. Check back soon for the next question round!
                  </p>
                  <button
                    onClick={() => navigate('/student/leaderboard')}
                    className="mt-6 tactile-btn-white px-5 py-2.5 rounded-xl text-sm font-bold font-sans text-[#18181B] select-none cursor-pointer"
                  >
                    View Overall Standings ➔
                  </button>
                </div>
              ) : (
                <div className={`grid gap-4 sm:gap-5 ${polls.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {polls.map((pollItem, idx) => {
                    const id = pollItem.pollLaunchId;
                    const isStarting = starting[id] ?? false;
                    const err = errors[id] ?? '';
                    const isCompleted = pollItem.completed;
                    const isExpiredLocal = new Date(pollItem.expiresAt).getTime() - now <= 0;

                    if (isCompleted) {
                      return (
                        <article
                          key={id}
                          className="rounded-2xl p-5 sm:p-6 bg-[#F0EDF1]/60 border border-[#D8C3AD]/40 flex flex-col justify-between gap-3 opacity-90 transition-all shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-[#006C49] font-sans text-xs font-bold tracking-wider uppercase">
                              <span className="w-4 h-4 rounded-full bg-[#006C49] text-white flex items-center justify-center text-[10px]">
                                ✓
                              </span>
                              COMPLETED
                            </span>
                            <span className="font-sans text-xs font-semibold text-[#867461] uppercase tracking-wider">
                              ROUND {polls.length > 1 ? idx + 1 : '1'}
                            </span>
                          </div>
                          <h4 className="font-sans text-base text-[#18181B] font-medium line-through decoration-[#D8C3AD] line-clamp-3">
                            {pollItem.text}
                          </h4>
                          <div className="flex items-center justify-between pt-2 border-t border-[#D8C3AD]/30">
                            <p className="font-sans text-xs text-[#006C49] font-medium">
                              ✓ Attempt recorded
                            </p>
                            <button
                              onClick={() => navigate(`/leaderboard/${pollItem.pollLaunchId}`)}
                              className="tactile-btn-white px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans text-[#18181B] select-none cursor-pointer"
                            >
                              Result ➔
                            </button>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article
                        key={id}
                        className="tactile-card rounded-2xl p-6 bg-white border border-[#D8C3AD]/60 shadow-[0_4px_0_#E2DDD2] flex flex-col justify-between gap-4 relative transition-all"
                      >
                        <div className="flex flex-col gap-3">
                          {/* Card Header: Live Status & Category/Index */}
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFDAD4] text-[#400100] font-sans text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-[#B71607] animate-ping" />
                              ● LIVE
                            </span>
                            <span className="font-sans text-xs font-bold text-[#867461] tracking-wider uppercase">
                              ROUND {polls.length > 1 ? idx + 1 : '1'}
                            </span>
                          </div>

                          <h3 className="font-serif text-xl sm:text-2xl text-[#18181B] leading-snug font-medium line-clamp-3">
                            {pollItem.text}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-[#534434] font-sans text-xs sm:text-sm mt-1">
                            <span className="flex items-center gap-1 font-medium bg-[#FAF8F5] px-2.5 py-1 rounded-md border border-[#E5E1D8]">
                              ⏱ {pollItem.timerSeconds}s
                            </span>
                            <span className="text-[#B71607] font-semibold bg-[#FFF0EE] px-2.5 py-1 rounded-md border border-[#FFDAD4]">
                              {formatExpiryCountdown(pollItem.expiresAt, now)}
                            </span>
                            <span className="text-[#855300] font-bold bg-[#FFFBEB] px-2.5 py-1 rounded-md border border-[#FDE68A]">
                              {pollItem.points === 0 ? '0 pts' : `+${pollItem.points} pts`}
                            </span>
                          </div>
                        </div>

                        {/* Per-Card Error */}
                        {err && (
                          <p className="font-sans text-xs font-semibold text-[#B71607] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FCA5A5]">
                            {err}
                          </p>
                        )}

                        {/* Tactile Kinetic Primary Action Button */}
                        <button
                          onClick={() => handleStart(pollItem)}
                          disabled={isStarting || isExpiredLocal}
                          className="tactile-btn-red w-full py-3.5 px-4 rounded-xl font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 select-none cursor-pointer mt-1"
                        >
                          <span>{isStarting ? 'Starting…' : isExpiredLocal ? 'Wait...' : 'Play Challenge'}</span>
                          <span className="text-lg leading-none">➔</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
              
              <div className="mt-2 mb-4 text-center lg:hidden">
                <button
                  onClick={() => navigate('/student/leaderboard')}
                  className="text-[#867461] hover:text-[#18181B] text-sm font-bold underline transition-colors cursor-pointer"
                >
                  View Overall Leaderboard ➔
                </button>
              </div>
            </div>

          </div>
        </main>

        {/* Bottom Navigation Bar: Docked Responsive Command Center */}
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-center pb-safe px-3 sm:px-4">
          <div className="bottom-nav-dock flex justify-around items-center px-3 sm:px-6 py-2 sm:py-2.5 bg-white/95 backdrop-blur-md rounded-t-2xl border-t border-[#E5E1D8] shadow-[0_-4px_24px_rgba(39,34,26,0.08)]">
            {/* Home Tab (ACTIVE) */}
            <button
              onClick={() => navigate('/student')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 bg-[#F59E0B] text-[#613B00] rounded-xl px-3.5 sm:px-5 py-1.5 sm:py-2 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
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

            {/* Leaderboard Tab */}
            <button
              onClick={() => navigate('/student/leaderboard')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]"
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
