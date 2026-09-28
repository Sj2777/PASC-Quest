import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { api, getExportCsvUrl } from '../../api';
import type { Stat, Question } from '../../api';
import { ADMIN_BASE_PATH } from '../../config';

const LAUNCH_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

function statusBadge(status: string) {
  switch (status) {
    case 'LIVE':
      return 'bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]';
    case 'SCHEDULED':
      return 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FDE68A]';
    case 'CLOSED':
      return 'bg-[#F4F4F5] text-[#71717A] border border-[#E4E4E7]';
    case 'DRAFT':
    default:
      return 'bg-[#F9FAFB] text-[#9CA3AF] border border-[#E5E7EB]';
  }
}

function formatShort(d: Date): string {
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function expiresInLabel(launchedAt: string): string {
  const expiresMs = new Date(launchedAt).getTime() + LAUNCH_LIFETIME_MS;
  const remainingMs = expiresMs - Date.now();
  if (remainingMs <= 0) return 'Expired (awaiting cleanup)';
  const totalMins = Math.floor(remainingMs / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `Auto-closes in ${hours}h ${mins}m`;
  return `Auto-closes in ${mins}m`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { secretKey } = useParams<{ secretKey?: string }>();
  const adminBase = secretKey ? `/${secretKey}/admin` : ADMIN_BASE_PATH;

  const [stats, setStats] = useState<Stat[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [closing, setClosing] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadData = useCallback(() => {
    return Promise.all([api.getAdminMe(), api.getStats(), api.getQuestions()])
      .then(([me, s, q]) => { setRole(me.role); setStats(s); setQuestions(q); });
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => navigate(adminBase))
      .finally(() => setLoading(false));
  }, [adminBase, loadData, navigate]);

  const handleLogout = async () => {
    await api.adminLogout().catch(() => {});
    navigate(adminBase);
  };

  const handleLaunch = async (id: string) => {
    setLaunching(id);
    try {
      await api.launchQuestion(id);
      await loadData();
    } catch (err: any) {
      alert(err?.error ?? 'Failed to launch');
    } finally {
      setLaunching(null);
    }
  };

  const handleCloseLaunch = async (pollLaunchId: string) => {
    setClosing((prev) => ({ ...prev, [pollLaunchId]: true }));
    try {
      await api.closeLaunch(pollLaunchId);
      const [s, q] = await Promise.all([api.getStats(), api.getQuestions()]);
      setStats(s);
      setQuestions(q);
    } catch (err: any) {
      alert(err?.error ?? 'Failed to close launch');
    } finally {
      setClosing((prev) => ({ ...prev, [pollLaunchId]: false }));
    }
  };

  const liveLaunches = stats.filter((s) => s.status === 'LIVE');
  const draftQuestions = questions.filter((q) => q.status === 'DRAFT' || q.status === 'SCHEDULED');
  const historicalStats = stats.filter((s) => s.status === 'CLOSED');

  const totalQuestions = questions.length;
  const totalAttempts = stats.reduce((acc, s) => acc + s.totalAttempts, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-[#867461] font-sans text-sm font-medium animate-pulse">Loading Command Center...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex font-sans text-[#18181B] selection:bg-[#E5E1D8]">
      {/* 1. ADMIN SHELL - LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-[#E5E1D8] flex flex-col flex-shrink-0 sticky top-0 h-screen hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-[#E5E1D8]">
          <span className="text-xl mr-2">🎯</span>
          <span className="font-serif font-semibold text-lg text-[#18181B]">PASC Quest Admin</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link to={`${adminBase}/dashboard`} className="flex items-center px-3 py-2.5 bg-[#FAF8F5] text-[#18181B] rounded-md font-bold text-sm">
            Dashboard
          </Link>
          <Link to={`${adminBase}/questions/new`} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
            Questions
          </Link>
          <a href="#poll-history" className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
            Analytics
          </a>
          {role === 'SUPER_ADMIN' && (
            <Link to={`${adminBase}/admins`} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
              Admin Management
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-[#E5E1D8]">
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 border border-[#E5E1D8] text-[#534434] rounded hover:bg-[#FAF8F5] transition-colors font-bold text-xs uppercase tracking-wider">
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. TOP BAR */}
        <header className="h-16 bg-white border-b border-[#E5E1D8] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="md:hidden flex items-center gap-2">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-[#534434] hover:bg-[#FAF8F5] rounded-md transition-colors" aria-label="Open mobile menu">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-xl">🎯</span>
            <span className="font-serif font-semibold text-lg text-[#18181B]">PASC Quest</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[#534434] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E5E1D8]">
              {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 md:p-10 lg:p-12 overflow-x-hidden">
          <div className="max-w-[1400px] mx-auto space-y-12">
            
            {/* 3. DASHBOARD HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-medium text-[#18181B]">Live Operations &amp; Poll Inspection</h1>
                <p className="font-sans text-sm text-[#534434] mt-1.5">Command center for active launches, drafts, and system telemetry.</p>
              </div>
              <button
                onClick={() => navigate(`${adminBase}/questions/new`)}
                className="bg-[#18181B] hover:bg-[#27221A] text-white px-5 py-2.5 rounded shadow-[0_2px_8px_rgba(39,34,26,0.08)] font-sans font-bold text-sm transition-colors cursor-pointer flex-shrink-0"
              >
                + New Question
              </button>
            </div>

            {/* 4. SUMMARY METRICS */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-[#E5E1D8] p-5 rounded-xl shadow-sm">
                <div className="text-xs font-bold text-[#867461] uppercase tracking-wider mb-1">Live Launches</div>
                <div className="text-3xl font-sans font-extrabold text-[#18181B]">{liveLaunches.length}</div>
              </div>
              <div className="bg-white border border-[#E5E1D8] p-5 rounded-xl shadow-sm">
                <div className="text-xs font-bold text-[#867461] uppercase tracking-wider mb-1">Total Questions</div>
                <div className="text-3xl font-sans font-extrabold text-[#18181B]">{totalQuestions}</div>
              </div>
              <div className="bg-white border border-[#E5E1D8] p-5 rounded-xl shadow-sm">
                <div className="text-xs font-bold text-[#867461] uppercase tracking-wider mb-1">Total Attempts</div>
                <div className="text-3xl font-sans font-extrabold text-[#18181B]">{totalAttempts}</div>
              </div>
            </section>

            {/* 5. LIVE OPERATIONS */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-bold text-[#18181B] uppercase tracking-widest">Live Operations</h2>
                <div className="h-px flex-1 bg-[#E5E1D8]"></div>
              </div>
              
              {liveLaunches.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E5E1D8] rounded-xl p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E5E1D8] flex items-center justify-center mb-3">
                    <span className="text-gray-400">⚡</span>
                  </div>
                  <p className="text-[#534434] font-medium text-sm">No polls currently live.</p>
                  <p className="text-[#867461] text-xs mt-1">Launch a draft question to begin collecting responses.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {liveLaunches.map((s) => {
                    const launchedAtDate = s.launchedAt ? new Date(s.launchedAt) : null;
                    const expiresAtDate = launchedAtDate
                      ? new Date(launchedAtDate.getTime() + LAUNCH_LIFETIME_MS)
                      : null;
                    const isClosing = closing[s.pollLaunchId] ?? false;

                    return (
                      <div
                        key={s.pollLaunchId}
                        className="bg-white border border-[#10B981] rounded-xl p-5 shadow-[0_4px_20px_rgba(16,185,129,0.06)] flex flex-col gap-4 relative overflow-hidden"
                      >
                        {/* Live indicator pip */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusBadge('LIVE')}`}>LIVE LAUNCH</span>
                              {launchedAtDate && (
                                <span className="text-[#DB3320] text-xs font-bold bg-[#FFF5F4] px-2 py-0.5 rounded border border-[#FCA5A5] animate-pulse">
                                  {expiresInLabel(launchedAtDate.toISOString())}
                                </span>
                              )}
                            </div>
                            <h3 className="font-serif text-lg font-medium text-[#18181B] leading-tight mb-2 truncate" title={s.questionText}>
                              {s.questionText}
                            </h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#867461]">
                              <span className="font-mono">ID: {s.pollLaunchId.slice(0, 8)}...</span>
                              {launchedAtDate && <span>Launched: {formatShort(launchedAtDate)}</span>}
                              {expiresAtDate && <span>Expires: {formatShort(expiresAtDate)}</span>}
                            </div>
                          </div>
                          
                          <div className="bg-[#FAF8F5] border border-[#E5E1D8] px-4 py-3 rounded-lg flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-2xl font-sans font-bold text-[#18181B]">{s.totalAttempts}</span>
                            <span className="text-[10px] font-bold text-[#867461] uppercase tracking-wider">Attempts</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E1D8]">
                          <a
                            href={getExportCsvUrl(s.questionId)}
                            download
                            className="px-4 py-2 rounded border border-[#E5E1D8] text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] text-xs font-bold transition-colors cursor-pointer"
                          >
                            Export CSV
                          </a>
                          <button
                            onClick={() => handleCloseLaunch(s.pollLaunchId)}
                            disabled={isClosing}
                            className="px-4 py-2 rounded bg-[#FFF5F4] hover:bg-[#FEE2E2] border border-[#FCA5A5] text-[#DB3320] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isClosing ? 'Closing...' : 'Close Launch'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 6. SCHEDULED / DRAFT QUESTIONS */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-bold text-[#18181B] uppercase tracking-widest">Question Library (Drafts &amp; Scheduled)</h2>
                <div className="h-px flex-1 bg-[#E5E1D8]"></div>
              </div>

              {draftQuestions.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-[#867461]">
                  No draft questions available.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {draftQuestions.map((q) => {
                    const hasLaunches = (q._count?.launches ?? q.launches?.length ?? 0) > 0;
                    return (
                      <div
                        key={q.id}
                        className="bg-white border border-[#E5E1D8] rounded-xl p-5 shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusBadge(q.status)}`}>
                                {q.status}
                              </span>
                              {q.status === 'SCHEDULED' && q.scheduledAt && (
                                <span className="text-xs text-[#F59E0B] font-medium">
                                  {formatShort(new Date(q.scheduledAt))}
                                </span>
                              )}
                            </div>
                            <p className="font-serif text-base font-medium text-[#18181B] truncate" title={q.text}>{q.text}</p>
                            <p className="text-xs text-[#867461] mt-1 font-mono">
                              {q.options.length} options • {q.timerSeconds}s
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
                          {hasLaunches && (
                            <a
                              href={getExportCsvUrl(q.id)}
                              download
                              className="px-3 py-1.5 rounded border border-[#E5E1D8] text-[#534434] hover:bg-[#FAF8F5] text-xs font-bold transition-colors cursor-pointer"
                            >
                              Export CSV
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`${adminBase}/questions/${q.id}/edit`)}
                            className="px-3 py-1.5 rounded border border-[#E5E1D8] text-[#534434] hover:bg-[#FAF8F5] text-xs font-bold transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleLaunch(q.id)}
                            disabled={launching === q.id}
                            className="px-3 py-1.5 rounded bg-[#18181B] text-white hover:bg-[#27221A] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {launching === q.id ? 'Launching...' : 'Launch Now'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 7. POLL HISTORY */}
            <section id="poll-history">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-bold text-[#18181B] uppercase tracking-widest">Analytics &amp; Poll History</h2>
                <div className="h-px flex-1 bg-[#E5E1D8]"></div>
              </div>

              {historicalStats.length === 0 ? (
                <div className="bg-white border border-[#E5E1D8] rounded-xl p-10 text-center">
                  <p className="text-[#867461] font-medium text-sm">No historical polls found.</p>
                </div>
              ) : (
                <div className="bg-white border border-[#E5E1D8] rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E5E1D8]">
                        <th className="px-4 py-3 text-[10px] font-bold text-[#867461] uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#867461] uppercase tracking-wider w-1/3">Question</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#867461] uppercase tracking-wider text-right">Attempts</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#867461] uppercase tracking-wider text-right">Correct</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#867461] uppercase tracking-wider text-right">Wrong</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#867461] uppercase tracking-wider text-right">Avg Time</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-[#867461] uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8]">
                      {historicalStats.map((s) => (
                        <tr key={s.pollLaunchId ?? s.questionId} className="hover:bg-[#FAF8F5] transition-colors group">
                          <td className="px-4 py-3 text-xs text-[#534434] font-mono align-middle">
                            {s.date ?? '—'}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="text-sm font-medium text-[#18181B] line-clamp-2" title={s.questionText}>
                              {s.questionText}
                            </div>
                            <div className="text-[10px] text-[#867461] font-mono mt-0.5">
                              Launch ID: {s.pollLaunchId.slice(0,8)}...
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-[#18181B] align-middle">{s.totalAttempts}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-[#10B981] align-middle">{s.correctCount}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-[#DB3320] align-middle">{s.wrongCount}</td>
                          <td className="px-4 py-3 text-right text-xs font-mono text-[#534434] align-middle">
                            {s.avgTimeTakenMs != null ? `${(s.avgTimeTakenMs / 1000).toFixed(1)}s` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right align-middle">
                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <a
                                href={getExportCsvUrl(s.questionId)}
                                download
                                className="px-3 py-1.5 rounded border border-[#E5E1D8] text-[#534434] hover:bg-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                CSV
                              </a>
                              <button
                                onClick={() => handleLaunch(s.questionId)}
                                disabled={launching === s.questionId}
                                className="px-3 py-1.5 rounded border border-[#E5E1D8] bg-white text-[#18181B] hover:bg-[#FAF8F5] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Relaunch
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            
          </div>
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left-4 duration-200">
            <div className="h-16 flex items-center justify-between px-6 border-b border-[#E5E1D8]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span className="font-serif font-semibold text-lg text-[#18181B]">PASC Quest Admin</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-[#867461] hover:bg-[#FAF8F5] rounded-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              <Link to={`${adminBase}/dashboard`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 bg-[#FAF8F5] text-[#18181B] rounded-md font-bold text-sm">
                Dashboard
              </Link>
              <Link to={`${adminBase}/questions/new`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
                Questions
              </Link>
              <a href="#poll-history" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
                Analytics
              </a>
              {role === 'SUPER_ADMIN' && (
                <Link to={`${adminBase}/admins`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
                  Admin Management
                </Link>
              )}
            </nav>
            <div className="p-4 border-t border-[#E5E1D8]">
              <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="w-full flex items-center justify-center px-4 py-2 border border-[#E5E1D8] text-[#534434] rounded hover:bg-[#FAF8F5] transition-colors font-bold text-xs uppercase tracking-wider">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

