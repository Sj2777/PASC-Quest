import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div className="relative min-h-screen flex flex-col items-center py-12 px-4 overflow-x-hidden">
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to Home
        </button>

        <h1 className="font-display text-4xl font-extrabold mb-6" style={{ color: 'var(--ink)' }}>
          Social Hub
        </h1>

        {/* Tabs */}
        <div className="flex bg-white/50 p-1 rounded-2xl mb-6 backdrop-blur-md border border-white/60 shadow-sm">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'friends' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => setActiveTab('branch')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'branch' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Branch Battles
          </button>
          <button
            onClick={() => setActiveTab('hallOfFame')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'hallOfFame' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Hall of Fame
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-sm mb-4">
                  <h3 className="font-bold mb-4 text-gray-800">Add a Friend</h3>
                  <form onSubmit={handleFollow} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Friend's nickname"
                      value={followInput}
                      onChange={(e) => setFollowInput(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white/50 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700">
                      Follow
                    </button>
                  </form>
                  {followMessage && <p className="text-green-600 text-sm mt-2">{followMessage}</p>}
                  {followError && <p className="text-red-500 text-sm mt-2">{followError}</p>}
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-gray-800 pl-2">Following ({friends.length})</h3>
                  {friends.length === 0 ? (
                    <p className="text-gray-500 text-sm pl-2">You aren't following anyone yet.</p>
                  ) : (
                    friends.map((friend) => (
                      <div key={friend.id} className="bg-white/80 backdrop-blur-md rounded-xl p-4 flex items-center justify-between shadow-sm border border-white">
                        <div>
                          <div className="font-bold text-gray-900">{friend.nickname}</div>
                          <div className="text-xs text-gray-500 flex gap-3 mt-1">
                            <span>🔥 {friend.currentStreak} Streak</span>
                            {friend.branch && <span>🎓 {friend.branch}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleUnfollow(friend.nickname)} className="text-xs text-red-500 font-semibold px-2 py-1 hover:bg-red-50 rounded-lg">
                          Unfollow
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Branch Battles Tab */}
            {activeTab === 'branch' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="bg-blue-50/80 rounded-2xl p-4 mb-4 border border-blue-100">
                  <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <span>⚔️</span> Weekly Accuracy Battle
                  </h3>
                  <p className="text-sm text-blue-600 mt-1">Which branch is dominating this week?</p>
                </div>
                
                {branchLeaderboard.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No attempts this week yet!</p>
                ) : (
                  branchLeaderboard.map((entry, idx) => (
                    <div key={entry.branch} className="relative bg-white/80 backdrop-blur-md rounded-xl p-4 flex items-center justify-between shadow-sm border border-white overflow-hidden">
                      {idx === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}
                      <div className="flex items-center gap-4 z-10">
                        <span className="font-bold text-2xl text-gray-300 w-6 text-center">{idx + 1}</span>
                        <div>
                          <div className="font-bold text-gray-900 text-lg">{entry.branch}</div>
                          <div className="text-xs text-gray-500">{entry.totalAttempts} total attempts</div>
                        </div>
                      </div>
                      <div className="font-display font-extrabold text-2xl text-blue-600 z-10">
                        {entry.accuracy}%
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* Hall of Fame Tab */}
            {activeTab === 'hallOfFame' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="bg-orange-50/80 rounded-2xl p-4 mb-4 border border-orange-100 text-center">
                  <h3 className="font-bold text-orange-800 text-lg">🏆 Hall of Fame</h3>
                  <p className="text-sm text-orange-600 mt-1">Top streaks of all time.</p>
                </div>

                {hallOfFame.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No one has built a streak yet!</p>
                ) : (
                  hallOfFame.map((student, idx) => (
                    <div key={student.id} className="bg-gradient-to-r from-orange-50/50 to-white backdrop-blur-md rounded-xl p-4 flex items-center justify-between shadow-sm border border-orange-100/50">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-xl text-orange-200 w-6 text-center">#{idx + 1}</span>
                        <div>
                          <div className="font-bold text-gray-900">{student.nickname}</div>
                          {student.branch && <div className="text-xs text-gray-500">{student.branch}</div>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-display font-extrabold text-xl text-orange-500 flex items-center gap-1">
                          {student.bestStreak} <span className="text-sm">🔥</span>
                        </div>
                        {student.currentStreak > 0 && (
                          <div className="text-[10px] text-orange-400 font-bold uppercase tracking-wide">
                            ({student.currentStreak} active)
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
