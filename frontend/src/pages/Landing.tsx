import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';
import type { PollCurrent } from '../api';

export default function Landing() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [poll, setPoll] = useState<PollCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCurrent()
      .then(setPoll)
      .catch(() => setPoll({ status: 'none' }))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async () => {
    if (!nickname.trim()) { setError('Please enter a nickname'); return; }
    if (!poll?.questionId) return;
    setStarting(true);
    setError('');
    try {
      const { token, timerSeconds } = await api.startPoll(poll.questionId, nickname.trim());
      navigate('/play', { state: { poll, token, timerSeconds, nickname: nickname.trim() } });
    } catch (err: any) {
      if (err?.reason === 'already_played') {
        setError("You've already answered today's question! Come back tomorrow.");
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setStarting(false);
    }
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
        <div className="text-center mb-10">
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
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 40px rgba(36,27,58,0.12)' }}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
            </div>
          ) : poll?.status === 'none' ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">☕</div>
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Nothing live yet
              </h2>
              <p className="mt-2 text-sm" style={{ color: '#6B5B8E' }}>
                No poll is active right now. Check back soon!
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
                Ready to play?
              </h2>
              <p className="text-sm mb-6" style={{ color: '#6B5B8E' }}>
                Enter a nickname to start today's question. No account needed.
              </p>

              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                Your nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="e.g. MathWizard99"
                maxLength={50}
                className="w-full px-4 py-3 rounded-2xl text-base font-medium outline-none border-2 transition-colors"
                style={{
                  background: '#F5F0FF',
                  borderColor: nickname ? 'var(--primary)' : '#E4D9FF',
                  color: 'var(--ink)',
                }}
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-sm font-medium"
                  style={{ color: 'var(--error)' }}
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleStart}
                disabled={starting}
                className="w-full mt-5 py-4 rounded-2xl text-white font-bold text-lg font-display transition-opacity disabled:opacity-60"
                style={{ background: 'var(--primary)', boxShadow: '0 6px 24px rgba(255,77,141,0.4)' }}
              >
                {starting ? 'Starting…' : 'Start'}
              </motion.button>

              <p className="mt-5 text-xs text-center" style={{ color: '#A89BC4' }}>
                One attempt per device. Timer is {poll?.timerSeconds}s — answer fast!
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
