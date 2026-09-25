import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, getExportCsvUrl } from '../../api';
import type { QuestionInput } from '../../api';

export default function AdminQuestion() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [scheduledAt, setScheduledAt] = useState('');
  const [hasLaunches, setHasLaunches] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 1. Fetch user role for sidebar
    api.getAdminMe()
      .then((me) => setRole(me.role))
      .catch(() => navigate('/admin'));

    // 2. Fetch question data if editing
    if (!isEdit || !id) {
      setLoading(false);
      return;
    }

    api.getQuestions()
      .then((qs) => {
        const q = qs.find((q) => q.id === id);
        if (!q) { navigate('/admin/dashboard'); return; }
        setText(q.text);
        setOptions(q.options as string[]);
        setCorrectIndex(q.correctIndex);
        setTimerSeconds(q.timerSeconds);
        const launchCount = q._count?.launches ?? q.launches?.length ?? 0;
        setHasLaunches(launchCount > 0);
        if (q.scheduledAt) {
          const d = new Date(q.scheduledAt);
          const pad = (n: number) => n.toString().padStart(2, '0');
          setScheduledAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      })
      .catch(() => navigate('/admin'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const handleLogout = async () => {
    await api.adminLogout().catch(() => {});
    navigate('/admin');
  };

  const validate = (): boolean => {
    if (!text.trim()) { setError('Question text is required.'); return false; }
    if (options.length < 2) { setError('At least 2 options required.'); return false; }
    if (options.some((o) => !o.trim())) { setError('All options must be filled in.'); return false; }
    if (correctIndex >= options.length) { setError('Correct option is out of range.'); return false; }
    if (timerSeconds < 5 || timerSeconds > 300) { setError('Timer must be between 5 and 300 seconds.'); return false; }
    return true;
  };

  const body = (): QuestionInput => ({
    text: text.trim(),
    options: options.map((o) => o.trim()),
    correctIndex,
    timerSeconds,
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
  });

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await api.updateQuestion(id, body());
      } else {
        await api.createQuestion(body());
      }
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err?.error ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    if (!validate()) return;
    setLaunching(true);
    setError('');
    try {
      let questionId = id;
      if (!isEdit) {
        const created = await api.createQuestion(body());
        questionId = created.id;
      } else if (id) {
        await api.updateQuestion(id, body());
        questionId = id;
      }
      await api.launchQuestion(questionId!);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err?.error ?? 'Failed to launch.');
    } finally {
      setLaunching(false);
    }
  };

  const addOption = () => {
    if (options.length < 5) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    if (correctIndex >= next.length) setCorrectIndex(next.length - 1);
  };

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-[#867461] font-sans text-sm font-medium animate-pulse">Loading Question...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex font-sans text-[#18181B] selection:bg-[#E5E1D8]">
      {/* 1. ADMIN SHELL - LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-[#E5E1D8] flex flex-col flex-shrink-0 sticky top-0 h-screen hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-[#E5E1D8]">
          <span className="text-xl mr-2">🎯</span>
          <span className="font-serif font-semibold text-lg text-[#18181B]">QuizPop Admin</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link to="/admin/dashboard" className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
            Dashboard
          </Link>
          <Link to="/admin/questions/new" className="flex items-center px-3 py-2.5 bg-[#FAF8F5] text-[#18181B] rounded-md font-bold text-sm">
            Questions
          </Link>
          <a href="/admin/dashboard#poll-history" className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
            Analytics
          </a>
          {role === 'SUPER_ADMIN' && (
            <Link to="/admin/admins" className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
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
            <span className="font-serif font-semibold text-lg text-[#18181B]">QuizPop</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[#534434] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E5E1D8]">
              {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 md:p-10 lg:p-12 overflow-x-hidden">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="mt-1 flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#E5E1D8] text-[#534434] transition-colors"
                  title="Back to Dashboard"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                  <h1 className="font-serif text-3xl font-medium text-[#18181B]">
                    {isEdit ? 'Edit Question' : 'New Question'}
                  </h1>
                  <p className="font-sans text-sm text-[#534434] mt-1.5">
                    {isEdit ? 'Modify an existing authored question.' : 'Author a new question for future launches.'}
                  </p>
                </div>
              </div>
              
              {isEdit && id && hasLaunches && (
                <a
                  href={getExportCsvUrl(id)}
                  download
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded border border-[#E5E1D8] text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                  title="Export all attempts for this question as CSV"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export Data
                </a>
              )}
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="bg-[#FFF5F4] border border-[#FCA5A5] rounded-xl p-4 flex items-start gap-3">
                <span className="text-[#DB3320] mt-0.5">⚠️</span>
                <p className="text-sm font-bold text-[#DB3320]">{error}</p>
              </div>
            )}

            {/* HAS LAUNCHES ALERT */}
            {isEdit && id && hasLaunches && (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-3">
                <span className="text-[#F59E0B] mt-0.5">ℹ️</span>
                <p className="text-sm font-medium text-[#B45309]">
                  This question has historical launches. Editing it will update the canonical question text for future launches, but past analytics are retained.
                </p>
              </div>
            )}

            {/* MAIN FORM */}
            <div className="bg-white border border-[#E5E1D8] rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 space-y-10">
                
                {/* SECTION 1 - QUESTION */}
                <section>
                  <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest mb-3">
                    Question Text
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    placeholder="Enter the question..."
                    className="w-full px-5 py-4 rounded-lg border border-[#E5E1D8] text-[#18181B] text-base font-medium focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors resize-y bg-[#FAF8F5]"
                  />
                </section>

                <hr className="border-[#E5E1D8]" />

                {/* SECTION 2 - OPTIONS */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                      Answer Options ({options.length}/5)
                    </label>
                  </div>
                  
                  <div className="space-y-3">
                    {options.map((opt, idx) => {
                      const isCorrect = correctIndex === idx;
                      return (
                        <div key={idx} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border ${isCorrect ? 'border-[#10B981] bg-[#ECFDF5]' : 'border-[#E5E1D8] bg-white'} transition-colors`}>
                          
                          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                            {/* Letter Indicator */}
                            <div className={`w-8 h-8 flex-shrink-0 rounded flex items-center justify-center font-bold text-sm ${isCorrect ? 'bg-[#10B981] text-white shadow-sm' : 'bg-[#FAF8F5] text-[#867461] border border-[#E5E1D8]'}`}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            
                            {/* Input */}
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(idx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                              className={`flex-1 bg-transparent border-none outline-none text-sm font-medium px-1 min-w-0 ${isCorrect ? 'text-[#065F46] placeholder-[#34D399]' : 'text-[#18181B] placeholder-[#A8A29E]'}`}
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 w-full sm:w-auto pl-11 sm:pl-0">
                            {/* Correct Toggle */}
                            <button
                              onClick={() => setCorrectIndex(idx)}
                              className={`flex-1 sm:flex-none flex-shrink-0 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                isCorrect 
                                  ? 'bg-white text-[#10B981] shadow-sm border border-[#A7F3D0]' 
                                  : 'bg-[#FAF8F5] text-[#867461] hover:bg-[#E5E1D8] border border-[#E5E1D8]'
                              }`}
                            >
                              {isCorrect ? 'Correct Answer' : 'Mark Correct'}
                            </button>

                            {/* Remove */}
                            {options.length > 2 && (
                              <button
                                onClick={() => removeOption(idx)}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#A8A29E] hover:text-[#DB3320] hover:bg-[#FFF5F4] rounded transition-colors"
                                title="Remove option"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                            {options.length <= 2 && (
                              <div className="hidden sm:block w-8 flex-shrink-0" /> // Spacer to align fields on desktop
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {options.length < 5 && (
                      <button
                        onClick={addOption}
                        className="w-full py-3 rounded-lg border border-dashed border-[#E5E1D8] text-[#534434] hover:bg-[#FAF8F5] font-bold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Option
                      </button>
                    )}
                  </div>
                </section>

                <hr className="border-[#E5E1D8]" />

                {/* SECTION 3 - TIMING & SCHEDULING */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                      Timer
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={timerSeconds}
                        onChange={(e) => setTimerSeconds(Number(e.target.value))}
                        min={5}
                        max={300}
                        className="w-full px-4 py-3 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] font-mono text-sm focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#867461] text-xs font-bold uppercase tracking-wider pointer-events-none">
                        SEC
                      </div>
                    </div>
                    <p className="text-xs text-[#867461] font-medium">Must be between 5 and 300 seconds.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                      Schedule Launch
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] font-mono text-sm focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors"
                    />
                    <p className="text-xs text-[#867461] font-medium">Optional. Automates the launch later.</p>
                  </div>
                </section>

              </div>

              {/* ACTION FOOTER */}
              <div className="bg-[#FAF8F5] border-t border-[#E5E1D8] px-6 py-5 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  disabled={saving || launching}
                  className="w-full sm:w-auto px-5 py-2.5 rounded text-[#534434] hover:bg-[#E5E1D8] font-bold text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || launching}
                  className="w-full sm:w-auto px-6 py-2.5 rounded border border-[#E5E1D8] bg-white text-[#18181B] hover:bg-gray-50 shadow-sm font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : scheduledAt ? 'Save Schedule' : 'Save as Draft'}
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={saving || launching}
                  className="w-full sm:w-auto px-6 py-2.5 rounded bg-[#18181B] hover:bg-[#27221A] text-white shadow-sm font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {launching ? 'Launching...' : 'Launch Now'}
                </button>
              </div>
            </div>

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
                <span className="font-serif font-semibold text-lg text-[#18181B]">QuizPop Admin</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-[#867461] hover:bg-[#FAF8F5] rounded-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              <Link to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
                Dashboard
              </Link>
              <Link to="/admin/questions/new" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 bg-[#FAF8F5] text-[#18181B] rounded-md font-bold text-sm">
                Questions
              </Link>
              <a href="/admin/dashboard#poll-history" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
                Analytics
              </a>
              {role === 'SUPER_ADMIN' && (
                <Link to="/admin/admins" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
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

