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
      {/* Centered tactile editorial envelope */}
      <div className="w-full max-w-[430px] sm:max-w-lg md:max-w-none mx-auto min-h-screen flex flex-col bg-[#FAF8F5] relative shadow-[0_0_50px_rgba(39,34,26,0.06)] md:shadow-none pb-28">
        
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

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin" />
            </div>
          ) : (
            <div className="flex-1 space-y-4">
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
            </div>
          )}
        </main>

        {/* Bottom Navigation Bar: Docked to Mobile-Style Content Envelope */}
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-around md:justify-center md:gap-8 items-center px-2 py-2 max-w-[430px] sm:max-w-lg md:max-w-none mx-auto pb-safe bg-white rounded-t-xl border-t border-[#E5E1D8] shadow-[0_-4px_16px_rgba(39,34,26,0.06)]">
          {/* Home Tab */}
          <button
            onClick={() => navigate('/student')}
            className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-3 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">🎮</span>
            <span className="font-sans text-[11px] mt-0.5">Home</span>
          </button>
          
          {/* Compete Tab (ACTIVE) */}
          <button
            onClick={() => navigate('/social')}
            className="flex flex-col items-center justify-center bg-[#F59E0B] text-[#613B00] rounded-xl px-4 py-1.5 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">🏆</span>
            <span className="font-sans text-[11px] mt-0.5">Compete</span>
          </button>

          {/* Leaderboard Tab */}
          <button
            onClick={() => navigate('/student/leaderboard')}
            className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-3 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">🏅</span>
            <span className="font-sans text-[11px] mt-0.5">Leaderboard</span>
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => navigate('/stats')}
            className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-3 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">👤</span>
            <span className="font-sans text-[11px] mt-0.5">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
