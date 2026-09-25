import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '../api';
import type { Friend, BranchBattleEntry, HallOfFameEntry } from '../api';

export default function SocialHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'friends' | 'branch' | 'hallOfFame'>('friends');
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followInput, setFollowInput] = useState('');
  const [followMessage, setFollowMessage] = useState('');
  const [followError, setFollowError] = useState('');

  const [branchLeaderboard, setBranchLeaderboard] = useState<BranchBattleEntry[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fRes, bRes, hRes] = await Promise.all([
        api.getFriends().catch(() => ({ friends: [] })),
        api.getBranchBattle().catch(() => ({ leaderboard: [] })),
        api.getHallOfFame().catch(() => ({ hallOfFame: [] }))
      ]);
      setFriends(fRes.friends);
      setBranchLeaderboard(bRes.leaderboard);
      setHallOfFame(hRes.hallOfFame);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (e: React.FormEvent) => {
    e.preventDefault();
    setFollowMessage('');
    setFollowError('');
    if (!followInput.trim()) return;

    try {
      const res = await api.follow(followInput.trim());
      setFollowMessage(res.message);
      setFollowInput('');
      loadData();
    } catch (err: any) {
      setFollowError(err?.error || 'Failed to follow');
    }
  };

  const handleUnfollow = async (nickname: string) => {
    if (!confirm(`Unfollow ${nickname}?`)) return;
    try {
      await api.unfollow(nickname);
      loadData();
    } catch (err: any) {
      console.error('Failed to unfollow', err);
    }
  };

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between">
      {/* Centered tactile editorial envelope */}
      <div className="w-full max-w-[430px] sm:max-w-lg mx-auto min-h-screen flex flex-col bg-[#FAF8F5] relative shadow-[0_0_50px_rgba(39,34,26,0.06)] pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/60 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="flex justify-between items-center w-full px-5 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl font-semibold text-[#855300] tracking-tight">
                Competition
              </span>
            </div>
            {/* Minimal Back to Home Action */}
            <button
              onClick={() => navigate('/student')}
              className="px-2.5 py-1 text-xs font-bold rounded-full border border-[#D8C3AD]/60 text-[#867461] hover:text-[#18181B] bg-white/70 hover:bg-white shadow-[0_1px_0_#E2DDD2] transition-all active:translate-y-0.5 cursor-pointer"
            >
              Home ➔
            </button>
          </div>
        </header>

        <main className="px-5 pt-5 flex-1 flex flex-col gap-5">
          {/* Header section */}
          <section>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#18181B] font-bold tracking-tight leading-tight">
              The Arena
            </h1>
            <p className="font-sans text-xs text-[#867461] mt-1 uppercase tracking-wider font-bold">
              Rankings & Rivalries
            </p>
          </section>

          {/* Segmented Tabs */}
          <div className="flex bg-[#E5E1D8]/40 p-1 rounded-xl shadow-[inset_0_2px_4px_rgba(39,34,26,0.04)]">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'friends' 
                  ? 'bg-white shadow-[0_1px_3px_rgba(39,34,26,0.08)] text-[#18181B]' 
                  : 'text-[#867461] hover:text-[#534434]'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setActiveTab('branch')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'branch' 
                  ? 'bg-white shadow-[0_1px_3px_rgba(39,34,26,0.08)] text-[#18181B]' 
                  : 'text-[#867461] hover:text-[#534434]'
              }`}
            >
              Branches
            </button>
            <button
              onClick={() => setActiveTab('hallOfFame')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'hallOfFame' 
                  ? 'bg-white shadow-[0_1px_3px_rgba(39,34,26,0.08)] text-[#18181B]' 
                  : 'text-[#867461] hover:text-[#534434]'
              }`}
            >
              Hall of Fame
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 space-y-4"
              >
                {/* Friends Tab */}
                {activeTab === 'friends' && (
                  <>
                    <div className="tactile-card bg-white rounded-xl p-4 sm:p-5 border border-[#E5E1D8] shadow-[0_3px_0_#E2DDD2]">
                      <h3 className="font-serif font-bold text-lg text-[#18181B] mb-3">Add a Rival</h3>
                      <form onSubmit={handleFollow} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Friend's nickname"
                          value={followInput}
                          onChange={(e) => setFollowInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#D8C3AD] text-sm font-sans font-semibold text-[#18181B] placeholder:text-[#867461] focus:outline-none focus:border-[#DB3320] focus:ring-1 focus:ring-[#DB3320] transition-all"
                        />
                        <button type="submit" className="tactile-btn-red px-4 py-2 rounded-lg font-sans font-bold text-xs cursor-pointer">
                          Follow
                        </button>
                      </form>
                      {followMessage && <p className="text-[#006C49] font-bold text-xs mt-2">{followMessage}</p>}
                      {followError && <p className="text-[#B71607] font-bold text-xs mt-2">{followError}</p>}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-sans text-[11px] font-bold text-[#867461] uppercase tracking-wider pl-1">
                        Following ({friends.length})
                      </h3>
                      {friends.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="font-sans text-xs font-semibold text-[#867461]">No rivals tracked yet.</p>
                        </div>
                      ) : (
                        friends.map((friend) => (
                          <div key={friend.id} className="bg-white rounded-xl p-3 sm:p-4 flex items-center justify-between border border-[#E5E1D8] shadow-[0_2px_0_#E2DDD2]">
                            <div>
                              <div className="font-sans font-bold text-[#18181B]">{friend.nickname}</div>
                              <div className="text-[10px] font-bold text-[#867461] uppercase tracking-wide flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-0.5"><span className="text-[#DB3320]">🔥</span> {friend.currentStreak} Streak</span>
                                {friend.branch && <span className="flex items-center gap-0.5"><span className="text-[#855300]">🎓</span> {friend.branch}</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnfollow(friend.nickname)}
                              className="text-[10px] font-bold text-[#B71607] px-2.5 py-1.5 border border-[#FFDAD4] rounded-lg bg-[#FFF0EE] hover:bg-[#FFCDD2] transition-colors"
                            >
                              Unfollow
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* Branch Battles Tab */}
                {activeTab === 'branch' && (
                  <>
                    <div className="tactile-card bg-white rounded-xl p-4 border border-[#D8C3AD] shadow-[0_3px_0_#E2DDD2]">
                      <h3 className="font-serif font-bold text-xl text-[#18181B] flex items-center gap-2">
                        <span className="text-[#855300]">⚔️</span> Weekly Accuracy Battle
                      </h3>
                      <p className="font-sans text-xs text-[#534434] mt-1 font-semibold">
                        Which branch is dominating this week?
                      </p>
                    </div>
                    
                    <div className="space-y-3 mt-4">
                      {branchLeaderboard.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="font-sans text-xs font-semibold text-[#867461]">No attempts this week yet!</p>
                        </div>
                      ) : (
                        branchLeaderboard.map((entry, idx) => {
                          const isFirst = idx === 0;
                          return (
                            <div
                              key={entry.branch}
                              className={`relative bg-white rounded-xl p-4 flex items-center justify-between border shadow-[0_3px_0_#E2DDD2] ${
                                isFirst ? 'border-[#FDBA74]' : 'border-[#E5E1D8]'
                              }`}
                            >
                              {isFirst && <div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-xl bg-[#F59E0B]" />}
                              <div className={`flex items-center gap-3 ${isFirst ? 'ml-1' : ''}`}>
                                <span className={`font-serif font-extrabold text-2xl w-6 text-center ${isFirst ? 'text-[#F59E0B]' : 'text-[#D8C3AD]'}`}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-sans font-bold text-[#18181B] text-lg leading-tight">{entry.branch}</div>
                                  <div className="text-[10px] font-bold text-[#867461] uppercase tracking-wide mt-0.5">
                                    {entry.totalAttempts} total attempts
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className={`font-sans font-extrabold text-2xl tabular-nums ${isFirst ? 'text-[#B45309]' : 'text-[#18181B]'}`}>
                                  {entry.accuracy}<span className="text-sm ml-0.5">%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {/* Hall of Fame Tab */}
                {activeTab === 'hallOfFame' && (
                  <>
                    <div className="tactile-card bg-[#FFFBEB] rounded-xl p-4 border border-[#FDBA74] shadow-[0_3px_0_#FED7AA] text-center">
                      <div className="text-3xl mb-2">🏆</div>
                      <h3 className="font-serif font-bold text-xl text-[#855300]">Hall of Fame</h3>
                      <p className="font-sans text-xs text-[#B45309] mt-1 font-bold uppercase tracking-wider">
                        Top Streaks of All Time
                      </p>
                    </div>

                    <div className="space-y-3 mt-4">
                      {hallOfFame.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="font-sans text-xs font-semibold text-[#867461]">No one has built a streak yet!</p>
                        </div>
                      ) : (
                        hallOfFame.map((student, idx) => {
                          const isFirst = idx === 0;
                          return (
                            <div
                              key={student.id}
                              className={`relative bg-white rounded-xl p-4 flex items-center justify-between border shadow-[0_3px_0_#E2DDD2] ${
                                isFirst ? 'border-[#FDBA74]' : 'border-[#E5E1D8]'
                              }`}
                            >
                              {isFirst && <div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-xl bg-[#F59E0B]" />}
                              <div className={`flex items-center gap-3 ${isFirst ? 'ml-1' : ''}`}>
                                <span className={`font-serif font-extrabold text-2xl w-6 text-center ${isFirst ? 'text-[#F59E0B]' : 'text-[#D8C3AD]'}`}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-sans font-bold text-[#18181B]">{student.nickname}</div>
                                  {student.branch && (
                                    <div className="text-[10px] font-bold text-[#867461] uppercase tracking-wide mt-0.5">
                                      {student.branch}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="font-sans font-extrabold text-2xl tabular-nums text-[#DB3320] flex items-center gap-1 leading-none">
                                  {student.bestStreak} <span className="text-sm">🔥</span>
                                </div>
                                {student.currentStreak > 0 && (
                                  <div className="text-[9px] font-bold text-[#B71607] uppercase tracking-widest mt-1">
                                    {student.currentStreak} Active
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Bottom Navigation Bar: Docked to Mobile-Style Content Envelope */}
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-around items-center px-4 py-2 max-w-[430px] sm:max-w-lg mx-auto pb-safe bg-white rounded-t-xl border-t border-[#E5E1D8] shadow-[0_-4px_16px_rgba(39,34,26,0.06)]">
          {/* Home Tab */}
          <button
            onClick={() => navigate('/student')}
            className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-4 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">🎮</span>
            <span className="font-sans text-[11px] mt-0.5">Home</span>
          </button>
          
          {/* Compete Tab (ACTIVE) */}
          <button
            onClick={() => navigate('/social')}
            className="flex flex-col items-center justify-center bg-[#F59E0B] text-[#613B00] rounded-xl px-5 py-1.5 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">🏆</span>
            <span className="font-sans text-[11px] mt-0.5">Compete</span>
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => navigate('/stats')}
            className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-4 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">👤</span>
            <span className="font-sans text-[11px] mt-0.5">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
