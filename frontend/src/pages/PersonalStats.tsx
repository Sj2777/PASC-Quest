import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { api, type StudentStats, type ArchiveQuestion, type FollowSummary, type Student } from '../api';

export default function PersonalStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [me, setMe] = useState<Student | null>(null);
  const [followSummary, setFollowSummary] = useState<FollowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<ArchiveQuestion | null>(null);
  const [followTab, setFollowTab] = useState<'following' | 'followers'>('following');
  const [followInput, setFollowInput] = useState('');
  const [followActionLoading, setFollowActionLoading] = useState(false);
  const [socialMessage, setSocialMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [renewFeedback, setRenewFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    Promise.all([
      api.getStudentStats(),
      api.getMe(),
      api.getFollowSummary().catch(() => null)
    ])
      .then(([statsData, meData, followData]) => {
        setStats(statsData);
        setMe(meData);
        if (followData) setFollowSummary(followData);
      })
      .catch((err) => {
        if (err?.status === 401 || err?.error === 'not_authenticated') {
          navigate('/');
        } else {
          setError('Could not load profile.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    await api.logoutStudent().catch(() => {});
    navigate('/');
  };

  const handleFollow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = followInput.trim();
    if (!target) return;
    if (me && target.toLowerCase() === me.nickname.toLowerCase()) {
      setSocialMessage({ text: "You cannot follow yourself.", isError: true });
      return;
    }
    setFollowActionLoading(true);
    setSocialMessage(null);
    try {
      await api.follow(target);
      setSocialMessage({ text: `Now following @${target}!`, isError: false });
      setFollowInput('');
      const updated = await api.getFollowSummary();
      setFollowSummary(updated);
    } catch (err: any) {
      setSocialMessage({ text: err?.error || err?.message || 'Could not follow student.', isError: true });
    } finally {
      setFollowActionLoading(false);
    }
  };

  const handleUnfollow = async (targetNickname: string) => {
    setFollowActionLoading(true);
    setSocialMessage(null);
    try {
      await api.unfollow(targetNickname);
      setSocialMessage({ text: `Unfollowed @${targetNickname}`, isError: false });
      const updated = await api.getFollowSummary();
      setFollowSummary(updated);
    } catch (err: any) {
      setSocialMessage({ text: err?.error || err?.message || 'Failed to unfollow.', isError: true });
    } finally {
      setFollowActionLoading(false);
    }
  };

  const handleQuickFollow = async (targetNickname: string) => {
    setFollowActionLoading(true);
    setSocialMessage(null);
    try {
      await api.follow(targetNickname);
      setSocialMessage({ text: `Now following @${targetNickname}!`, isError: false });
      const updated = await api.getFollowSummary();
      setFollowSummary(updated);
    } catch (err: any) {
      setSocialMessage({ text: err?.error || err?.message || 'Could not follow student.', isError: true });
    } finally {
      setFollowActionLoading(false);
    }
  };

  const handleRenewStreak = async () => {
    if (renewing) return;
    setRenewing(true);
    setRenewFeedback(null);
    try {
      const res = await api.renewStreak();
      setStats((prev) =>
        prev
          ? {
              ...prev,
              currentStreak: res.currentStreak,
              bestStreak: res.bestStreak,
              totalPoints: res.totalPoints,
            }
          : null
      );
      setMe((prev) =>
        prev
          ? {
              ...prev,
              currentStreak: res.currentStreak,
              bestStreak: res.bestStreak,
              totalPoints: res.totalPoints,
            }
          : null
      );
      setRenewFeedback({ text: `Streak renewed to ${res.currentStreak} day(s)! (-50 pts)`, isError: false });
    } catch (err: any) {
      setRenewFeedback({
        text: err?.error || err?.message || 'Failed to renew streak.',
        isError: true,
      });
    } finally {
      setRenewing(false);
    }
  };

  useEffect(() => {
    if (renewFeedback) {
      const t = setTimeout(() => setRenewFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [renewFeedback]);

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between relative">
      {/* Widescreen 16:9 responsive container */}
      <div className="w-full min-h-screen flex flex-col bg-[#FAF8F5] relative pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/80 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="screen-container flex justify-between items-center py-3.5 sm:py-4">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#855300] tracking-tight">
                Profile & Telemetry
              </span>
            </div>
            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-full border border-[#FFDAD4] text-[#DB3320] hover:text-[#B71607] bg-white/70 hover:bg-[#FFF0EE] shadow-[0_1px_0_#FFDAD4] transition-all active:translate-y-0.5 cursor-pointer"
              >
                Logout
              </button>
              <button
                onClick={() => navigate('/student')}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-full border border-[#D8C3AD]/60 text-[#867461] hover:text-[#18181B] bg-white/70 hover:bg-white shadow-[0_1px_0_#E2DDD2] transition-all active:translate-y-0.5 cursor-pointer"
              >
                Home ➔
              </button>
            </div>
          </div>
        </header>

        <main className="screen-container pt-6 sm:pt-8 md:pt-10 flex-1 flex flex-col">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin" />
            </div>
          ) : error ? (
            <div className="tactile-card rounded-2xl p-6 text-center bg-[#FFF0EE] border-[#FFDAD4] text-[#B71607] font-sans text-sm font-semibold max-w-lg mx-auto">
              {error}
            </div>
          ) : stats ? (
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {/* 1:2 Ratio Layout: 4 cols for Smaller Section, 8 cols for Bigger Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                {/* SMALLER SECTION (1/3 width = 4 columns on lg) */}
                <div className="lg:col-span-4 flex flex-col gap-5">
                  {/* 1. Person's Name & Info Card */}
                  <div className="tactile-card rounded-2xl p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#FFF8ED] border-2 border-[#F59E0B]/40 text-[#855300] font-serif text-2xl font-bold flex items-center justify-center shadow-inner shrink-0 select-none">
                      {me?.nickname ? me.nickname.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-serif text-2xl sm:text-3xl text-[#18181B] font-bold tracking-tight truncate">
                          @{me?.nickname || 'Student'}
                        </h1>
                        {me?.branch && (
                          <span className="font-sans text-[11px] font-bold text-[#855300] bg-[#FFFBEB] px-2.5 py-0.5 rounded-full border border-[#F59E0B]/30 uppercase tracking-wide">
                            {me.branch}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-sans font-bold text-xs text-[#DB3320] bg-[#FFF0EE] border border-[#FFDAD4] px-2.5 py-0.5 rounded-full">
                          <span>🔥</span>
                          <span>{stats.currentStreak > 0 ? `${stats.currentStreak} day streak` : '0 days streak'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Analytics in Small Cards */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-[#E5E1D8]/60 pb-2.5">
                      <span className="font-serif text-base font-bold text-[#18181B]">Analytics & Metrics</span>
                      <span className="font-sans text-[10px] font-bold text-[#867461] uppercase tracking-wider bg-[#F4EFEA] px-2 py-0.5 rounded-full border border-[#E5E1D8]">
                        Telemetry
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Total Points */}
                      <div className="rounded-xl p-3 bg-[#FFFBEB] border border-[#FDBA74]/50 flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#855300]">Total Points</span>
                        <div className="font-sans font-extrabold text-xl sm:text-2xl text-[#B45309] mt-0.5 leading-tight tabular-nums">
                          {stats.totalPoints}<span className="text-xs font-semibold ml-0.5">pts</span>
                        </div>
                      </div>

                      {/* Accuracy */}
                      <div className="rounded-xl p-3 bg-[#FAF8F5] border border-[#D8C3AD]/50 flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#867461]">Accuracy</span>
                        <div className="font-sans font-extrabold text-xl sm:text-2xl text-[#18181B] mt-0.5 leading-tight tabular-nums">
                          {stats.accuracy}<span className="text-xs font-semibold ml-0.5">%</span>
                        </div>
                      </div>

                      {/* Avg Speed */}
                      <div className="rounded-xl p-3 bg-[#FAF8F5] border border-[#D8C3AD]/50 flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#867461]">Avg Speed</span>
                        <div className="font-sans font-extrabold text-xl sm:text-2xl text-[#18181B] mt-0.5 leading-tight tabular-nums">
                          {stats.avgTimeMs !== null ? (stats.avgTimeMs / 1000).toFixed(1) : '-'}<span className="text-xs font-semibold ml-0.5">s</span>
                        </div>
                      </div>

                      {/* Current Streak */}
                      <div className="rounded-xl p-3 bg-[#FFF0EE] border border-[#FFDAD4] flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#B71607]">Current Streak</span>
                        <div className="font-sans font-extrabold text-xl sm:text-2xl text-[#DB3320] mt-0.5 leading-tight tabular-nums">
                          {stats.currentStreak}<span className="text-xs font-semibold ml-0.5">d</span>
                        </div>
                      </div>

                      {/* Best Streak */}
                      <div className="rounded-xl p-3 bg-[#FFFBEB] border border-[#FDE68A] flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#855300]">Best Streak</span>
                        <div className="font-sans font-extrabold text-xl sm:text-2xl text-[#855300] mt-0.5 leading-tight tabular-nums">
                          {stats.bestStreak}<span className="text-xs font-semibold ml-0.5">d</span>
                        </div>
                      </div>

                      {/* Archived Qs */}
                      <div className="rounded-xl p-3 bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#006C49]">Archived Qs</span>
                        <div className="font-sans font-extrabold text-xl sm:text-2xl text-[#006C49] mt-0.5 leading-tight tabular-nums">
                          {stats.questionArchive.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Streak Protection & Recovery Card */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-[#E5E1D8]/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔥</span>
                        <span className="font-serif text-base font-bold text-[#18181B]">Streak Protection</span>
                      </div>
                      <span className="font-sans text-[10px] font-bold text-[#855300] bg-[#FFFBEB] px-2.5 py-0.5 rounded-full border border-[#F59E0B]/30 uppercase tracking-wide">
                        50 pts / day
                      </span>
                    </div>

                    <p className="font-sans text-xs text-[#534434]">
                      Lost your streak or need +1 day boost? Spend <strong>50 points</strong> to restore or advance your streak by 1 day.
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-sans text-xs font-bold text-[#867461]">
                        Available: <strong className="text-[#855300]">{stats.totalPoints} pts</strong>
                      </span>
                      <button
                        onClick={handleRenewStreak}
                        disabled={renewing || stats.totalPoints < 50}
                        className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                          stats.totalPoints >= 50
                            ? 'tactile-btn-primary bg-[#DB3320] text-white hover:bg-[#B71607] shadow-[0_2px_0_#8E1A0C] active:translate-y-0.5'
                            : 'bg-zinc-200 text-zinc-400 border border-zinc-300 cursor-not-allowed shadow-none'
                        }`}
                        title={stats.totalPoints < 50 ? 'Requires 50 points' : 'Renew or advance streak'}
                      >
                        <span>🔥</span>
                        <span>{renewing ? 'Processing...' : 'Renew Streak (50 pts)'}</span>
                      </button>
                    </div>

                    {renewFeedback && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                          renewFeedback.isError
                            ? 'bg-[#FFF0EE] border-[#FFDAD4] text-[#B71607]'
                            : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#006C49]'
                        }`}
                      >
                        {renewFeedback.text}
                      </div>
                    )}
                  </div>

                  {/* 3. Following / Followers Section */}
                  <div className="tactile-card rounded-2xl p-4 sm:p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col gap-3.5">
                    {/* Tabs */}
                    <div className="flex items-center justify-between gap-2 border-b border-[#E5E1D8]/60 pb-3">
                      <div className="flex gap-1.5 p-1 bg-[#F4EFEA] rounded-xl w-full">
                        <button
                          type="button"
                          onClick={() => setFollowTab('following')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            followTab === 'following'
                              ? 'bg-white text-[#855300] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                              : 'text-[#867461] hover:text-[#18181B]'
                          }`}
                        >
                          Following ({followSummary?.followingCount ?? 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFollowTab('followers')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            followTab === 'followers'
                              ? 'bg-white text-[#855300] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                              : 'text-[#867461] hover:text-[#18181B]'
                          }`}
                        >
                          Followers ({followSummary?.followersCount ?? 0})
                        </button>
                      </div>
                    </div>

                    {/* Follow by nickname form */}
                    <form onSubmit={handleFollow} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Follow @nickname..."
                        value={followInput}
                        onChange={(e) => setFollowInput(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-1.5 text-xs font-medium rounded-xl border border-[#D8C3AD]/60 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#855300] transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={followActionLoading || !followInput.trim()}
                        className="px-3 py-1.5 bg-[#855300] text-white hover:bg-[#6b4200] disabled:opacity-40 text-xs font-bold rounded-xl shadow-[0_2px_0_#4a2e00] active:translate-y-0.5 cursor-pointer transition-all whitespace-nowrap"
                      >
                        + Follow
                      </button>
                    </form>

                    {/* Social message banner */}
                    {socialMessage && (
                      <div
                        className={`text-xs px-3 py-2 rounded-xl font-medium flex justify-between items-center ${
                          socialMessage.isError
                            ? 'bg-[#FFF0EE] text-[#B71607] border border-[#FFDAD4]'
                            : 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                        }`}
                      >
                        <span className="truncate mr-2">{socialMessage.text}</span>
                        <button
                          type="button"
                          onClick={() => setSocialMessage(null)}
                          className="font-bold cursor-pointer opacity-70 hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* List of followers / following */}
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 divide-y divide-[#E5E1D8]/50">
                      {(followTab === 'following' ? followSummary?.following : followSummary?.followers)?.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[#867461] font-medium">
                          {followTab === 'following'
                            ? 'Not following anyone yet.'
                            : 'No followers yet.'}
                        </div>
                      ) : (
                        (followTab === 'following' ? followSummary?.following : followSummary?.followers)?.map((user) => {
                          const isAlreadyFollowing = followSummary?.following.some(
                            (f) => f.nickname.toLowerCase() === user.nickname.toLowerCase()
                          );
                          return (
                            <div key={user.id} className="pt-2.5 pb-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#D8C3AD]/60 flex items-center justify-center text-xs font-bold text-[#855300] shrink-0">
                                  {user.nickname.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-serif text-sm font-semibold text-[#18181B] truncate">
                                      @{user.nickname}
                                    </span>
                                    {user.branch && (
                                      <span className="text-[9px] font-bold text-[#867461] bg-[#F4EFEA] px-1.5 py-0.2 rounded border border-[#E5E1D8]">
                                        {user.branch}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[#DB3320] font-medium flex items-center gap-0.5">
                                    🔥 {user.currentStreak}d
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {followTab === 'following' ? (
                                  <button
                                    type="button"
                                    disabled={followActionLoading}
                                    onClick={() => handleUnfollow(user.nickname)}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#FFDAD4] text-[#DB3320] hover:bg-[#FFF0EE] transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    Unfollow
                                  </button>
                                ) : isAlreadyFollowing ? (
                                  <span className="text-[10px] font-bold text-[#867461] bg-[#F4EFEA] px-2 py-0.5 rounded-md border border-[#E5E1D8]">
                                    Following
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={followActionLoading}
                                    onClick={() => handleQuickFollow(user.nickname)}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#855300] text-white hover:bg-[#6b4200] transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    + Follow
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* BIGGER SECTION (2/3 width = 8 columns on lg) */}
                <div className="lg:col-span-8 flex flex-col gap-5">
                  <div className="tactile-card rounded-2xl p-5 sm:p-6 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col gap-5">
                    <div className="flex items-center justify-between border-b border-[#E5E1D8]/60 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🗄️</span>
                        <h2 className="font-serif text-2xl sm:text-3xl text-[#18181B] font-bold">
                          Question Archive
                        </h2>
                      </div>
                      {stats.questionArchive && (
                        <span className="font-sans text-xs sm:text-sm font-bold text-[#867461] bg-[#F4EFEA] px-3.5 py-1 rounded-full border border-[#E5E1D8]">
                          {stats.questionArchive.length} round{stats.questionArchive.length !== 1 ? 's' : ''} recorded
                        </span>
                      )}
                    </div>

                    {!stats.questionArchive || stats.questionArchive.length === 0 ? (
                      <div className="py-16 sm:py-20 text-center flex flex-col items-center">
                        <span className="text-5xl mb-3 opacity-70">🗄️</span>
                        <p className="font-sans text-base text-[#867461] font-medium">No questions have been played yet.</p>
                        <p className="font-sans text-xs text-[#A89A8A] mt-1">Questions you participate in will be preserved here for review.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stats.questionArchive.map((q, i) => (
                          <button
                            key={q.questionId}
                            onClick={() => setSelectedQuestion(q)}
                            className="w-full text-left tactile-card rounded-xl p-4 sm:p-5 bg-[#FAF8F5] border border-[#D8C3AD]/60 shadow-[0_2px_0_#E2DDD2] hover:border-[#855300] hover:bg-white active:translate-y-0.5 active:shadow-none transition-all flex flex-col justify-between gap-3.5 cursor-pointer group"
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-sans text-xs font-bold text-[#867461] uppercase tracking-wider group-hover:text-[#855300] transition-colors">
                                Round {stats.questionArchive.length - i}
                              </span>
                              <span className="font-sans text-xs font-bold text-[#855300] bg-[#FFFBEB] px-2.5 py-0.5 rounded-full border border-[#F59E0B]/30 whitespace-nowrap">
                                +{q.points} pts ➔
                              </span>
                            </div>
                            <div className="font-serif text-base sm:text-lg text-[#18181B] font-medium leading-snug line-clamp-3">
                              {q.text}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          ) : null}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-center pb-safe px-3 sm:px-4">
          <div className="bottom-nav-dock flex justify-around items-center px-3 sm:px-6 py-2 sm:py-2.5 bg-white/95 backdrop-blur-md rounded-t-2xl border-t border-[#E5E1D8] shadow-[0_-4px_24px_rgba(39,34,26,0.08)]">
            {/* Home Tab */}
            <button
              onClick={() => navigate('/student')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[#534434] hover:text-[#855300] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold active:scale-95 transition-all select-none cursor-pointer rounded-xl hover:bg-[#FAF8F5]"
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

            {/* Profile Tab (ACTIVE) */}
            <button
              onClick={() => navigate('/stats')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 bg-[#F59E0B] text-[#613B00] rounded-xl px-3.5 sm:px-5 py-1.5 sm:py-2 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
            >
              <span className="text-lg sm:text-xl leading-none">👤</span>
              <span className="font-sans text-[11px] sm:text-xs md:text-sm">Profile</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm"
            onClick={() => setSelectedQuestion(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#FAF8F5] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#E5E1D8]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-6 py-5 border-b border-[#E5E1D8]">
                <h3 className="font-serif text-2xl font-bold text-[#18181B]">Question Detail</h3>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="w-9 h-9 rounded-full bg-[#E5E1D8]/60 flex items-center justify-center text-[#534434] hover:bg-[#D8C3AD] transition-colors cursor-pointer text-base"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
                <div>
                  <div className="font-sans text-xs font-bold text-[#867461] uppercase tracking-wider mb-2">
                    Question
                  </div>
                  <div className="font-serif text-xl sm:text-2xl text-[#18181B] leading-snug break-words font-medium">
                    {selectedQuestion.text}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-[#10B981]/30">
                  <div className="font-sans text-xs font-bold text-[#006C49] uppercase tracking-wider mb-1.5">
                    Correct Answer
                  </div>
                  <div className="font-sans text-lg sm:text-xl font-bold text-[#065F46] break-words">
                    {selectedQuestion.correctAnswer}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
