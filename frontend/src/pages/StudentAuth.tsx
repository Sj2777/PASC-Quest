import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';

export default function StudentAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedNick = nickname.trim();
    if (!trimmedNick) {
      setError('Please enter a nickname');
      return;
    }

    if (mode === 'register') {
      if (trimmedNick.length < 3 || trimmedNick.length > 20) {
        setError('Nickname must be between 3 and 20 characters');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setSubmitting(true);
      try {
        await api.registerStudent(trimmedNick, password);
        navigate('/');
      } catch (err: any) {
        // Exact message from backend: reason or error
        setError(err?.reason ?? err?.error ?? 'Registration failed');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!password) {
        setError('Please enter your password');
        return;
      }

      setSubmitting(true);
      try {
        await api.loginStudent(trimmedNick, password);
        navigate('/');
      } catch (err: any) {
        // Exact message from backend: error or reason
        setError(err?.error ?? err?.reason ?? 'Login failed');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const switchMode = (newMode: 'register' | 'login') => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Ambient blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] mb-4"
            style={{ background: 'var(--primary)', boxShadow: '0 8px 32px rgba(255,77,141,0.35)' }}
          >
            <span className="text-4xl">🎯</span>
          </motion.div>
          <h1 className="font-display text-5xl font-extrabold" style={{ color: 'var(--ink)' }}>
            QuizPop
          </h1>
          <p className="mt-2 text-base font-medium" style={{ color: '#6B5B8E' }}>
            One question. One shot. Every day.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-[28px] p-8"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 40px rgba(36,27,58,0.12)',
          }}
        >
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-2xl p-1 mb-6" style={{ background: '#F5F0FF' }}>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                mode === 'register' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={{
                color: mode === 'register' ? 'var(--ink)' : '#8A7BA8',
              }}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                mode === 'login' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={{
                color: mode === 'login' ? 'var(--ink)' : '#8A7BA8',
              }}
            >
              Login
            </button>
          </div>

          <h2 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
            {mode === 'register' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6B5B8E' }}>
            {mode === 'register'
              ? 'Choose a nickname and password to track your streak.'
              : 'Sign in with your nickname and password to play.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
                Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. MathWizard99"
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-2xl text-base font-medium outline-none border-2 transition-colors"
                style={{
                  background: '#F5F0FF',
                  borderColor: nickname ? 'var(--primary)' : '#E4D9FF',
                  color: 'var(--ink)',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-2xl text-base font-medium outline-none border-2 transition-colors"
                style={{
                  background: '#F5F0FF',
                  borderColor: password ? 'var(--primary)' : '#E4D9FF',
                  color: 'var(--ink)',
                }}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-2xl text-base font-medium outline-none border-2 transition-colors"
                  style={{
                    background: '#F5F0FF',
                    borderColor: confirmPassword ? 'var(--primary)' : '#E4D9FF',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium pt-1"
                style={{ color: 'var(--error)' }}
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={submitting}
              className="w-full mt-3 py-4 rounded-2xl text-white font-bold text-lg font-display transition-opacity disabled:opacity-60"
              style={{ background: 'var(--primary)', boxShadow: '0 6px 24px rgba(255,77,141,0.4)' }}
            >
              {submitting ? (mode === 'register' ? 'Creating…' : 'Signing in…') : (mode === 'register' ? 'Register' : 'Login')}
            </motion.button>
          </form>

          <p className="mt-5 text-xs text-center" style={{ color: '#A89BC4' }}>
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-bold underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Register
                </button>
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
