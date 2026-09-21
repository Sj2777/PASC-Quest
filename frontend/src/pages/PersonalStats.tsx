import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, type StudentStats } from '../api';

function RankChart({ data }: { data: StudentStats['rankHistory'] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-10 bg-white/50 rounded-2xl border border-white/60">
        <span className="text-4xl mb-2 block">📊</span>
        <p className="text-sm font-medium" style={{ color: '#6B5B8E' }}>
          No ranking data yet. Answer a question to get ranked!
        </p>
      </div>
    );
  }

  const width = 300;
  const height = 150;
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
    <div className="rounded-2xl p-6 bg-white/70 backdrop-blur-md border border-white/60 shadow-sm mt-6">
      <div className="mb-4">
        <h3 className="font-display font-bold text-xl" style={{ color: 'var(--ink)' }}>Rank History</h3>
        <p className="text-sm font-medium mt-1 opacity-90">
          Rank {recent.rank} of {recent.totalStudents} students
        </p>
      </div>
      
      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <line x1={0} y1={padY} x2={width} y2={padY} stroke="#E5E7EB" strokeDasharray="4 4" />
          <line x1={0} y1={height - padY} x2={width} y2={height - padY} stroke="#E5E7EB" strokeDasharray="4 4" />
          
          {numPoints > 1 && (
            <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="var(--primary)" />
              <text x={p.x} y={p.y - 10} fontSize="12" textAnchor="middle" fill="var(--ink)" fontWeight="bold">
                {p.rank}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function PersonalStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div className="relative min-h-screen flex flex-col items-center py-12 px-4 overflow-x-hidden">
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={() => navigate('/student')}
          className="mb-6 flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to Home
        </button>

        <h1 className="font-display text-4xl font-extrabold mb-8" style={{ color: 'var(--ink)' }}>
          My Stats
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 font-medium py-8 bg-white/70 rounded-2xl">{error}</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Accuracy Card */}
              <div className="p-5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">🎯</span>
                <div className="font-display font-bold text-3xl" style={{ color: 'var(--ink)' }}>
                  {stats.accuracy}%
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: '#8A7BA8' }}>
                  Accuracy
                </div>
              </div>

              {/* Avg Time Card */}
              <div className="p-5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">⚡</span>
                <div className="font-display font-bold text-3xl" style={{ color: 'var(--ink)' }}>
                  {stats.avgTimeMs !== null ? `${(stats.avgTimeMs / 1000).toFixed(1)}s` : '-'}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: '#8A7BA8' }}>
                  {stats.avgTimeMs !== null ? 'Avg Time' : 'Not enough data yet'}
                </div>
              </div>
            </div>

            {/* Streaks Card */}
            <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🔥</span>
                  <h3 className="font-display font-bold text-xl" style={{ color: 'var(--ink)' }}>Streak</h3>
                </div>
                <p className="text-sm font-medium" style={{ color: '#6B5B8E' }}>
                  Keep it going!
                </p>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <div className="font-display font-bold text-2xl" style={{ color: 'var(--ink)' }}>
                    {stats.currentStreak}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8A7BA8' }}>
                    Current
                  </div>
                </div>
                <div>
                  <div className="font-display font-bold text-2xl text-gray-400">
                    {stats.bestStreak}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8A7BA8' }}>
                    Best
                  </div>
                </div>
              </div>
            </div>

            {/* Rank Chart */}
            <RankChart data={stats.rankHistory} />
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
