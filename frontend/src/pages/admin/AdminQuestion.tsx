import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import type { QuestionInput } from '../../api';

export default function AdminQuestion() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    api.getQuestions()
      .then((qs) => {
        const q = qs.find((q) => q.id === id);
        if (!q) { navigate('/admin/dashboard'); return; }
        setText(q.text);
        setOptions(q.options as string[]);
        setCorrectIndex(q.correctIndex);
        setTimerSeconds(q.timerSeconds);
      })
      .catch(() => navigate('/admin'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-gray-400 hover:text-gray-700 transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="font-semibold text-gray-800">
            {isEdit ? 'Edit question' : 'New question'}
          </h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          {/* Question text */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="What is the capital of France?"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-indigo-400 transition-colors resize-none"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Answer options ({options.length}/5)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctIndex === idx}
                    onChange={() => setCorrectIndex(idx)}
                    className="flex-shrink-0 accent-indigo-600"
                    title="Mark as correct"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-indigo-400 transition-colors"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(idx)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                      title="Remove option"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Select the radio button next to the correct answer.
            </p>
            {options.length < 5 && (
              <button
                onClick={addOption}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                + Add option
              </button>
            )}
          </div>

          {/* Timer */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Timer (seconds)
            </label>
            <input
              type="number"
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))}
              min={5}
              max={300}
              className="w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-indigo-400 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1.5">Between 5 and 300 seconds.</p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving || launching}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save as draft'}
            </button>
            <button
              onClick={handleLaunch}
              disabled={saving || launching}
              className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {launching ? 'Launching…' : 'Launch now'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
