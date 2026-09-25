import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.adminLogin(email, password);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 font-sans text-[#18181B] selection:bg-[#E5E1D8]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="text-4xl">🎯</span>
          <h1 className="font-serif text-3xl font-medium mt-4 text-[#18181B]">
            Admin Console
          </h1>
          <p className="text-sm text-[#534434] mt-2 font-medium">
            Secure administrative entry point
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-[0_2px_8px_rgba(39,34,26,0.04)] p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors"
              />
            </div>
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-[#FFF5F4] border border-[#FCA5A5] rounded-lg p-3 flex items-start gap-2.5">
                <span className="text-[#DB3320] text-sm mt-0.5">⚠️</span>
                <p className="text-xs font-bold text-[#DB3320] leading-snug">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded bg-[#DB3320] hover:bg-[#B91C1C] text-white shadow-sm font-bold text-sm tracking-wide transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-xs font-medium text-[#867461]">
            QuizPop Administrative Operations
          </p>
        </div>
      </div>
    </div>
  );
}
