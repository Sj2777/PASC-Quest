import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api, type StudentStats } from '../api';

function RankChart({ data }: { data: StudentStats['rankHistory'] }) {
  if (data.length === 0) {
    return (
      <div className="tactile-card rounded-xl p-8 text-center bg-white border border-[#D8C3AD]/40 flex flex-col items-center mt-4">
        <span className="text-4xl mb-3 block opacity-90">📊</span>
        <h3 className="font-serif text-lg font-bold text-[#18181B] leading-snug">No rank history</h3>
        <p className="font-sans text-xs text-[#867461] mt-1 max-w-[200px]">
          Answer a question to establish your campus rank.
        </p>
      </div>
    );
  }

  const width = 300;
  const height = 140;
  const padX = 20;
  const padY = 24;

  const maxRank = Math.max(...data.map(d => d.totalStudents), 10);
  const numPoints = data.length;

  const points = data.map((d, i) => {
    const x = numPoints === 1 ? width / 2 : padX + (i / (numPoints - 1)) * (width - 2 * padX);
    const y = padY + ((d.rank - 1) / Math.max(maxRank - 1, 1)) * (height - 2 * padY);
    return { x, y, rank: d.rank };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const recent = data[data.length - 1];

  return (
    <div className="tactile-card rounded-xl p-5 sm:p-6 bg-white border border-[#D8C3AD]/60 shadow-[0_4px_0_#E2DDD2] mt-4 relative">
      <div className="mb-5 flex justify-between items-start">
        <div>
          <span className="font-sans text-[11px] font-bold text-[#867461] uppercase tracking-wider block">
            CAMPUS RANKING
          </span>
          <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#18181B] mt-0.5">Rank History</h3>
        </div>
        <div className="text-right">
          {recent.totalStudents > 9 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F0EDF1] border border-[#E5E1D8] font-sans text-[10px] font-bold text-[#534434] uppercase">
              Top {Math.max(1, Math.round((recent.rank / recent.totalStudents) * 100))}%
            </span>
          )}
        </div>
      </div>
      
      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Background grid lines */}
          <line x1={0} y1={padY} x2={width} y2={padY} stroke="#E5E1D8" strokeWidth="1" />
          <line x1={0} y1={height - padY} x2={width} y2={height - padY} stroke="#E5E1D8" strokeWidth="1" strokeDasharray="4 4" />
          
          {numPoints > 1 && (
            <path d={pathD} fill="none" stroke="#DB3320" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#DB3320" strokeWidth="2" />
              <text x={p.x} y={p.y - 12} fontSize="10" fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="middle" fill="#18181B" fontWeight="800">
                #{p.rank}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-4 pt-3 border-t border-[#E5E1D8]/60 text-center">
        <p className="font-sans text-xs font-semibold text-[#534434]">
          Currently Rank <strong className="text-[#18181B]">#{recent.rank}</strong> out of {recent.totalStudents}
        </p>
      </div>
    </div>
  );
}

export default function PersonalStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    api.getStudentStats()
      .then(setStats)
      .catch((err) => {
        if (err?.status === 401 || err?.error === 'not_authenticated') {
          navigate('/auth');
        } else {
          setError('Could not load stats.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="paper-texture min-h-screen text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] flex flex-col justify-between">
      {/* Centered tactile editorial envelope */}
      <div className="w-full max-w-[430px] sm:max-w-lg mx-auto min-h-screen flex flex-col bg-[#FAF8F5] relative shadow-[0_0_50px_rgba(39,34,26,0.06)] pb-28">
        
        {/* TopAppBar: Sticky editorial brand masthead */}
        <header className="w-full sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E1D8]/60 shadow-[0_2px_4px_rgba(39,34,26,0.04)]">
          <div className="flex justify-between items-center w-full px-5 py-2.5 max-w-[430px] sm:max-w-lg mx-auto">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl font-semibold text-[#855300] tracking-tight">
                Profile Stats
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
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin" />
            </div>
          ) : error ? (
            <div className="tactile-card rounded-xl p-5 text-center bg-[#FFF0EE] border-[#FFDAD4] text-[#B71607] font-sans text-sm font-semibold">
              {error}
            </div>
          ) : stats ? (
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              {/* Profile Overview */}
              <section>
                <h1 className="font-serif text-3xl sm:text-4xl text-[#18181B] font-bold tracking-tight leading-tight">
                  Academic Ledger
                </h1>
                <p className="font-sans text-xs text-[#867461] mt-1 uppercase tracking-wider font-bold">
                  Performance & History
                </p>
              </section>

              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2">
                {/* Accuracy Card */}
                <div className="tactile-card rounded-xl p-4 sm:p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col items-center justify-center text-center">
                  <span className="text-2xl mb-1 opacity-90">🎯</span>
                  <div className="font-sans font-extrabold text-3xl sm:text-4xl tabular-nums text-[#18181B] tracking-tight">
                    {stats.accuracy}<span className="text-lg text-[#867461]">%</span>
                  </div>
                  <div className="font-sans text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-1 text-[#867461]">
                    Accuracy
                  </div>
                </div>

                {/* Avg Time Card */}
                <div className="tactile-card rounded-xl p-4 sm:p-5 bg-white border border-[#D8C3AD]/60 shadow-[0_3px_0_#E2DDD2] flex flex-col items-center justify-center text-center">
                  <span className="text-2xl mb-1 opacity-90">⚡</span>
                  <div className="font-sans font-extrabold text-3xl sm:text-4xl tabular-nums text-[#18181B] tracking-tight">
                    {stats.avgTimeMs !== null ? `${(stats.avgTimeMs / 1000).toFixed(1)}` : '-'}
                    {stats.avgTimeMs !== null && <span className="text-lg text-[#867461]">s</span>}
                  </div>
                  <div className="font-sans text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-1 text-[#867461]">
                    {stats.avgTimeMs !== null ? 'Avg Time' : 'No Data'}
                  </div>
                </div>
              </div>

              {/* Streaks Card */}
              <div className="tactile-card rounded-xl p-4 sm:p-5 bg-white border border-[#FDBA74] shadow-[0_3px_0_#FED7AA] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-sans text-[11px] font-bold text-[#855300] uppercase tracking-wider">
                      ATTENDANCE
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-[#18181B]">Streaks</h3>
                </div>
                <div className="flex gap-4 sm:gap-6 text-right">
                  <div className="flex flex-col items-center bg-[#FFFBEB] px-3 py-1.5 rounded-lg border border-[#F59E0B]/30">
                    <div className="font-sans font-extrabold text-xl text-[#B45309] tabular-nums leading-none">
                      {stats.currentStreak}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#D97706] mt-1">
                      Current
                    </div>
                  </div>
                  <div className="flex flex-col items-center bg-[#F0EDF1] px-3 py-1.5 rounded-lg border border-[#E5E1D8]">
                    <div className="font-sans font-extrabold text-xl text-[#534434] tabular-nums leading-none">
                      {stats.bestStreak}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#867461] mt-1">
                      Best
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank Chart */}
              <RankChart data={stats.rankHistory} />

            </motion.div>
          ) : null}
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
          
          {/* Compete Tab */}
          <button
            onClick={() => navigate('/social')}
            className="flex flex-col items-center justify-center text-[#534434] hover:text-[#855300] px-4 py-1.5 font-semibold active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">🏆</span>
            <span className="font-sans text-[11px] mt-0.5">Compete</span>
          </button>

          {/* Profile Tab (ACTIVE) */}
          <button
            onClick={() => navigate('/stats')}
            className="flex flex-col items-center justify-center bg-[#F59E0B] text-[#613B00] rounded-xl px-5 py-1.5 font-bold shadow-[0_2px_0_#613B00] active:scale-95 transition-all select-none cursor-pointer"
          >
            <span className="text-base leading-none">👤</span>
            <span className="font-sans text-[11px] mt-0.5">Profile</span>
          </button>
        </nav>

      </div>
    </div>
  );
}

