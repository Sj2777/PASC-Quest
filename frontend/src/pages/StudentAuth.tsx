import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';

const BRANCH_OPTIONS = [
  { value: 'COMP', label: 'Computer Engineering' },
  { value: 'IT', label: 'Information Technology' },
  { value: 'AIDS', label: 'Artificial Intelligence and Data Science' },
  { value: 'ENTC', label: 'Electronics and Computer Engineering' },
  { value: 'EXTC', label: 'Electronics and Telecommunication' },
];

export default function StudentAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [nickname, setNickname] = useState('');
  const [branch, setBranch] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isDropdownOpen) {
      const idx = BRANCH_OPTIONS.findIndex(o => o.value === branch);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [isDropdownOpen, branch]);

  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      return;
    }
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
        return;
      }
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setFocusedIndex((prev) => {
        let next = prev + dir;
        if (next < 0) next = BRANCH_OPTIONS.length - 1;
        if (next >= BRANCH_OPTIONS.length) next = 0;
        return next;
      });
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      if (isDropdownOpen) {
        e.preventDefault(); // prevent form submit
        if (focusedIndex >= 0) {
          setBranch(BRANCH_OPTIONS[focusedIndex].value);
        }
        setIsDropdownOpen(false);
      }
    }
  };

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
      if (!branch) {
        setError('Please select your branch');
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
        await api.registerStudent(trimmedNick, password, branch);
        navigate('/student');
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
        navigate('/student');
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
    setBranch('');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#FAF8F5] font-sans text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFF5F4] border border-[#FCA5A5] mb-5 shadow-sm">
            <span className="text-3xl">🎯</span>
          </div>
          <h1 className="font-serif text-4xl font-medium text-[#18181B]">
            QuizPop
          </h1>
          <p className="mt-2 text-sm text-[#534434] font-medium">
            Available questions. One shot each.
          </p>
        </div>

        {/* Tactical Auth Envelope */}
        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-[0_0_50px_rgba(39,34,26,0.06)] p-6 sm:p-8">
          
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg p-1 mb-8 bg-[#F0EDF1] border border-[#E5E1D8]">
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                mode === 'register' ? 'bg-white shadow-sm border border-[#E5E1D8] text-[#18181B]' : 'text-[#867461] hover:text-[#534434]'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                mode === 'login' ? 'bg-white shadow-sm border border-[#E5E1D8] text-[#18181B]' : 'text-[#867461] hover:text-[#534434]'
              }`}
            >
              Login
            </button>
          </div>

          <h2 className="font-serif text-2xl font-medium text-[#18181B] mb-2">
            {mode === 'register' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-[#534434] mb-8">
            {mode === 'register'
              ? 'Choose a nickname and password to track your streak.'
              : 'Sign in with your nickname and password to play.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. MathWizard99"
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm focus:outline-none focus:border-[#DB3320] focus:ring-1 focus:ring-[#DB3320] transition-colors"
              />
            </div>

            {mode === 'register' && (
              <div className="relative space-y-1.5" ref={dropdownRef}>
                <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                  Branch
                </label>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  onKeyDown={handleDropdownKeyDown}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                  aria-controls={isDropdownOpen ? "branch-listbox" : undefined}
                  aria-activedescendant={isDropdownOpen && focusedIndex >= 0 ? `branch-option-${focusedIndex}` : undefined}
                  className={`w-full pl-4 pr-10 py-3 rounded-lg border bg-[#FAF8F5] text-sm transition-colors text-left flex items-center outline-none ${
                    isDropdownOpen ? 'border-[#DB3320] ring-1 ring-[#DB3320]' : 'border-[#E5E1D8] hover:border-[#18181B]'
                  }`}
                >
                  <span className={`truncate flex-1 ${branch ? 'text-[#18181B] font-medium' : 'text-[#867461]'}`}>
                    {branch ? BRANCH_OPTIONS.find((o) => o.value === branch)?.label : 'Select your branch'}
                  </span>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="absolute right-4 shrink-0 transition-transform duration-200" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path d="M1.5 1.5L6 6L10.5 1.5" stroke="#867461" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {isDropdownOpen && (
                  <ul
                    id="branch-listbox"
                    role="listbox"
                    className="absolute z-50 w-full mt-1.5 rounded-lg border border-[#E5E1D8] bg-white shadow-lg overflow-y-auto"
                    style={{ maxHeight: '240px' }}
                  >
                    {BRANCH_OPTIONS.map((option, index) => {
                      const isSelected = branch === option.value;
                      const isFocused = focusedIndex === index;
                      return (
                        <li
                          key={option.value}
                          id={`branch-option-${index}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setBranch(option.value);
                            setIsDropdownOpen(false);
                          }}
                          onMouseEnter={() => setFocusedIndex(index)}
                          className={`px-4 py-3 cursor-pointer text-sm transition-colors ${
                            isFocused ? 'bg-[#F0EDF1]' : 'bg-transparent'
                          } ${
                            isSelected ? 'text-[#DB3320] font-bold' : 'text-[#18181B] font-medium'
                          }`}
                        >
                          {option.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm focus:outline-none focus:border-[#DB3320] focus:ring-1 focus:ring-[#DB3320] transition-colors"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm focus:outline-none focus:border-[#DB3320] focus:ring-1 focus:ring-[#DB3320] transition-colors"
                />
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#FFF5F4] border border-[#FCA5A5] rounded-lg p-3 flex items-start gap-2.5 mt-2"
              >
                <span className="text-[#DB3320] text-sm mt-0.5">⚠️</span>
                <p className="text-xs font-bold text-[#DB3320] leading-snug">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-3.5 rounded-lg bg-[#DB3320] hover:bg-[#B91C1C] text-white font-bold text-sm uppercase tracking-wide transition-colors disabled:opacity-50"
            >
              {submitting ? (mode === 'register' ? 'Creating…' : 'Signing in…') : (mode === 'register' ? 'Register' : 'Login')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E5E1D8] space-y-4">
            <p className="text-xs text-center text-[#867461] font-medium">
              {mode === 'register' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-[#DB3320] hover:underline"
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
                    className="font-bold text-[#DB3320] hover:underline"
                  >
                    Register
                  </button>
                </>
              )}
            </p>
            

          </div>
        </div>
      </motion.div>
    </div>
  );
}
