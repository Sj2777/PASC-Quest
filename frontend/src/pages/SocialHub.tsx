import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { BranchBattleEntry } from '../api';

export default function SocialHub() {
  const navigate = useNavigate();
  
  const [branchLeaderboard, setBranchLeaderboard] = useState<BranchBattleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const bRes = await api.getBranchBattle().catch(() => ({ leaderboard: [] }));
      setBranchLeaderboard(bRes.leaderboard);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between">
      {/* Widescreen 16:9 responsive container */}
      <div className="w-full min-h-screen flex flex-col bg-[#FAF8F5] relative pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/80 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="screen-container flex justify-between items-center py-3.5 sm:py-4">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#855300] tracking-tight">
                Competition & Rivals
              </span>
            </div>
            {/* Minimal Back to Home Action */}
            <button
              onClick={() => navigate('/student')}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-full border border-[#D8C3AD]/60 text-[#867461] hover:text-[#18181B] bg-white/70 hover:bg-white shadow-[0_1px_0_#E2DDD2] transition-all active:translate-y-0.5 cursor-pointer"
            >
              Home ➔
            </button>
          </div>
        </header>

        <main className="screen-container pt-6 sm:pt-8 md:pt-10 flex-1 flex flex-col gap-6 sm:gap-8">
          {/* Header section */}
          <section className="flex flex-col gap-1">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#18181B] font-bold tracking-tight leading-tight">
              The Arena
            </h1>
            <p className="font-sans text-xs sm:text-sm text-[#867461] uppercase tracking-wider font-bold">
              Campus Branch Standings & Rivalries
            </p>
          </section>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin" />
            </div>
          ) : (
            <div className="flex-1 space-y-6">
              <div className="tactile-card bg-white rounded-2xl p-5 sm:p-6 border border-[#D8C3AD] shadow-[0_3px_0_#E2DDD2]">
                <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#18181B] flex items-center gap-2.5">
                  <span className="text-[#855300] text-2xl">⚔️</span> Weekly Branch Accuracy Battle
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#534434] mt-1 font-semibold">
                  Which campus academic division is dominating this week?
                </p>
              </div>
              
              {branchLeaderboard.length === 0 ? (
                <div className="tactile-card rounded-2xl p-10 text-center bg-white border border-[#D8C3AD]/40">
                  <p className="font-sans text-sm font-semibold text-[#867461]">No attempts this week yet!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {branchLeaderboard.map((entry, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div
                        key={entry.branch}
                        className={`relative bg-white rounded-2xl p-5 sm:p-6 flex items-center justify-between border shadow-[0_3px_0_#E2DDD2] ${
                          isFirst ? 'border-[#FDBA74]' : 'border-[#E5E1D8]'
                        }`}
                      >
                        {isFirst && <div className="absolute top-0 bottom-0 left-0 w-2 rounded-l-2xl bg-[#F59E0B]" />}
                        <div className={`flex items-center gap-4 ${isFirst ? 'ml-1' : ''}`}>
                          <span className={`font-serif font-extrabold text-2xl sm:text-3xl w-8 text-center ${isFirst ? 'text-[#F59E0B]' : 'text-[#D8C3AD]'}`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-sans font-bold text-[#18181B] text-lg sm:text-xl leading-tight">{entry.branch}</div>
                            <div className="text-xs font-bold text-[#867461] uppercase tracking-wide mt-1">
                              {entry.totalAttempts} total attempt{entry.totalAttempts !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`font-sans font-extrabold text-2xl sm:text-3xl tabular-nums ${isFirst ? 'text-[#B45309]' : 'text-[#18181B]'}`}>
                            {entry.accuracy}<span className="text-sm sm:text-base ml-0.5">%</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#867461] uppercase">Accuracy</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
            
            {/* Compete Tab (ACTIVE) */}
            <button
              onClick={() => navigate('/social')}
              className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 bg-[#F59E0B] text-[#613B00] rounded-xl px-3.5 sm:px-5 py-1.5 sm:py-2 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
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
