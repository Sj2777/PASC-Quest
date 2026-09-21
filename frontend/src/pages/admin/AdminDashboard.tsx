import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getExportCsvUrl } from '../../api';
import type { Stat, Question } from '../../api';

const LAUNCH_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours — mirrors backend constant

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SCHEDULED: 'bg-indigo-100 text-indigo-700',
    LIVE: 'bg-green-100 text-green-700',
    CLOSED: 'bg-slate-100 text-slate-500',
  };
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[status] ?? colors.DRAFT}`;
}

/** Format a Date as "22 Sep, 10:00" — e.g. "Expires 22 Sep, 10:00" */
function formatShort(d: Date): string {
  return d.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Compute a human-readable "expires in X h Y m" string, or "Expired" if past. */
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
  const [stats, setStats] = useState<Stat[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  // Phase 7B: track per-launch close loading state (keyed by pollLaunchId)
  const [closing, setClosing] = useState<Record<string, boolean>>({});

  const [role, setRole] = useState<string | null>(null);

  const loadData = useCallback(() => {
    return Promise.all([api.getAdminMe(), api.getStats(), api.getQuestions()])
      .then(([me, s, q]) => { setRole(me.role); setStats(s); setQuestions(q); });
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => navigate('/admin'))
      .finally(() => setLoading(false));
  }, [loadData, navigate]);

  const handleLogout = async () => {
    await api.adminLogout().catch(() => {});
    navigate('/admin');
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

  // Phase 7B: close one specific PollLaunch; leave all other launches untouched.
  const handleCloseLaunch = async (pollLaunchId: string) => {
    setClosing((prev) => ({ ...prev, [pollLaunchId]: true }));
    try {
      await api.closeLaunch(pollLaunchId);
      // Refresh only stats + questions; do not reset the entire page.
      const [s, q] = await Promise.all([api.getStats(), api.getQuestions()]);
      setStats(s);
      setQuestions(q);
    } catch (err: any) {
      alert(err?.error ?? 'Failed to close launch');
    } finally {
      setClosing((prev) => ({ ...prev, [pollLaunchId]: false }));
    }
  };

  // Phase 7B: LIVE launches are launches where the stat status is LIVE.
  // Because a question can have multiple LIVE launches simultaneously (from Phase 7A),
  // we show ALL LIVE rows here — never just one.
  const liveLaunches = stats.filter((s) => s.status === 'LIVE');

  const draftQuestions = questions.filter((q) => q.status === 'DRAFT' || q.status === 'SCHEDULED');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="font-semibold text-gray-800">QuizPop Admin</span>
        </div>
        <div className="flex items-center gap-3">
          {role === 'SUPER_ADMIN' && (
            <button
              onClick={() => navigate('/admin/admins')}
              className="px-4 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-semibold transition-colors"
            >
              Manage Admins
            </button>
          )}
          <button
            onClick={() => navigate('/admin/questions/new')}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            Add question
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Phase 7B: Live questions section ─────────────────────────────── */}
        {liveLaunches.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
              Live questions ({liveLaunches.length})
            </h2>
            <div className="space-y-2">
              {liveLaunches.map((s) => {
                const launchedAtDate = s.launchedAt ? new Date(s.launchedAt) : null;
                const expiresAtDate = launchedAtDate
                  ? new Date(launchedAtDate.getTime() + LAUNCH_LIFETIME_MS)
                  : null;
                const isClosing = closing[s.pollLaunchId] ?? false;

                return (
                  <div
                    key={s.pollLaunchId}
                    className="bg-white border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={statusBadge('LIVE')}>LIVE</span>
                        <p className="font-medium text-gray-900 truncate">{s.questionText}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {launchedAtDate && (
                          <>Launched: {formatShort(launchedAtDate)}</>
                        )}
                        {expiresAtDate && (
                          <> &nbsp;·&nbsp; Expires: {formatShort(expiresAtDate)}</>
                        )}
                      </p>
                      {launchedAtDate && (
                        <p className="text-xs text-green-600 mt-0.5 font-medium">
                          {expiresInLabel(launchedAtDate.toISOString())}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 font-mono">
                        {s.totalAttempts} attempt{s.totalAttempts !== 1 ? 's' : ''}
                      </span>
                      <a
                        href={getExportCsvUrl(s.questionId)}
                        download
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-sm"
                        title="Export all attempts as CSV"
                      >
                        Export CSV
                      </a>
                      <button
                        onClick={() => handleCloseLaunch(s.pollLaunchId)}
                        disabled={isClosing}
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors disabled:opacity-60"
                        title="Manually close this launch early. It will auto-close after 24 hours otherwise."
                      >
                        {isClosing ? 'Closing…' : 'Close'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Draft / Scheduled questions ready to launch */}
        {draftQuestions.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
              Draft questions
            </h2>
            <div className="space-y-2">
              {draftQuestions.map((q) => {
                const hasLaunches = (q._count?.launches ?? q.launches?.length ?? 0) > 0;
                return (
                  <div
                    key={q.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{q.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {q.options.length} options • {q.timerSeconds}s timer
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={statusBadge(q.status)}>
                        {q.status === 'SCHEDULED' && q.scheduledAt
                          ? `Scheduled for ${new Date(q.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                          : 'Draft'}
                      </span>
                      {hasLaunches && (
                        <a
                          href={getExportCsvUrl(q.id)}
                          download
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-sm"
                          title="Export all attempts for this question as CSV"
                        >
                          Export CSV
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/admin/questions/${q.id}/edit`)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleLaunch(q.id)}
                        disabled={launching === q.id}
                        className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                      >
                        {launching === q.id ? 'Launching…' : 'Launch'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Stats table — Poll history */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
            Poll history
          </h2>
          {stats.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No polls launched yet. Add a question and launch it to see stats here.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Expires</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Correct</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Wrong</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Timeout</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Avg time</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.map((s) => {
                    const expiresAt = s.launchedAt
                      ? new Date(new Date(s.launchedAt).getTime() + LAUNCH_LIFETIME_MS)
                      : null;
                    const isClosing = closing[s.pollLaunchId] ?? false;

                    return (
                      <tr key={s.pollLaunchId ?? s.questionId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.date ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-800 font-medium max-w-xs truncate">{s.questionText}</td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(s.status)}>{s.status}</span>
                        </td>
                        {/* Phase 7B: expiry column — shows expiry for LIVE rows, dash otherwise */}
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {s.status === 'LIVE' && expiresAt
                            ? formatShort(expiresAt)
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{s.totalAttempts}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">{s.correctCount}</td>
                        <td className="px-4 py-3 text-right text-orange-500 font-semibold">{s.wrongCount}</td>
                        <td className="px-4 py-3 text-right text-gray-400 font-semibold">{s.timeoutCount}</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs font-mono">
                          {s.avgTimeTakenMs != null ? `${(s.avgTimeTakenMs / 1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={getExportCsvUrl(s.questionId)}
                              download
                              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-sm"
                              title="Export all attempts for this question as CSV"
                            >
                              Export CSV
                            </a>
                            {/* Phase 7B: per-launch Close button for LIVE rows in the history table */}
                            {s.status === 'LIVE' && (
                              <button
                                onClick={() => handleCloseLaunch(s.pollLaunchId)}
                                disabled={isClosing}
                                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors disabled:opacity-60"
                              >
                                {isClosing ? 'Closing…' : 'Close'}
                              </button>
                            )}
                            {s.status === 'CLOSED' && (
                              <button
                                onClick={() => handleLaunch(s.questionId)}
                                disabled={launching === s.questionId}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                              >
                                {launching === s.questionId ? 'Relaunching…' : 'Relaunch'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
