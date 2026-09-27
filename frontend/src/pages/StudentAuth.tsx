import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';

const BRANCH_OPTIONS = [
  { value: 'COMP', label: 'Computer Engineering', icon: '💻' },
  { value: 'IT', label: 'Information Technology', icon: '🖥️' },
  { value: 'AIDS', label: 'Artificial Intelligence and Data Science', icon: '🤖' },
  { value: 'ENTC', label: 'Electronics and Computer Engineering', icon: '📡' },
  { value: 'EXTC', label: 'Electronics and Telecommunication', icon: '📶' },
];

const TAGLINES = [
  "One question. One chance. Infinite glory.",
  "Zero to hero in 30 seconds.",
  "Are you the smartest on campus?",
  "May the best engineer win."
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
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;
    api.getMe()
      .then(() => {
        if (active) navigate('/student');
      })
      .catch(() => {
        if (active) setIsCheckingAuth(false);
      });
    return () => { active = false; };
  }, [navigate]);

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

  if (isCheckingAuth) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-8 h-8 rounded-full border-3 border-[#D8C3AD] border-t-[#DB3320] animate-spin" />
      </div>
    );
  }

  return (
    <div className="paper-texture min-h-screen flex items-center justify-center px-4 sm:px-8 py-10 lg:py-16 bg-[#FAF8F5] font-sans text-[#18181B] selection:bg-[#FFDAD4] selection:text-[#400100] relative overflow-hidden">
      
      {/* Ambient Gradient Blobs */}
      <div className="blob absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="blob absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-rose-200/15 rounded-full blur-3xl pointer-events-none" />
      <div className="blob absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-blue-200/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-6xl mx-auto relative z-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Left Column: Brand & Literary Campus Showcase */}
          <div className="lg:col-span-6 text-center lg:text-left flex flex-col items-center lg:items-start relative">
            
            {/* Floating Emoji Particles */}
            <span className="absolute -top-10 left-10 text-3xl float-gentle opacity-80" style={{ animationDelay: '0s' }}>🎯</span>
            <span className="absolute top-20 -left-6 text-2xl float-gentle opacity-70" style={{ animationDelay: '1s' }}>⚡</span>
            <span className="absolute top-40 right-10 text-4xl float-gentle opacity-90" style={{ animationDelay: '2s' }}>🔥</span>
            <span className="absolute -bottom-10 left-1/3 text-3xl float-gentle opacity-80" style={{ animationDelay: '1.5s' }}>🏆</span>

            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FFF5F4] border border-[#FCA5A5] mb-5 shadow-sm shimmer relative overflow-hidden">
              <span className="text-3xl sm:text-4xl relative z-10">🎯</span>
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#18181B] tracking-tight">
              QuizPop
            </h1>
            <p className="mt-3 text-base sm:text-lg text-[#534434] font-medium max-w-md">
              Daily aptitude polls for engineers. One live question per round. One shot to claim glory.
            </p>
            <p className="mt-2 text-sm sm:text-base text-[#F59E0B] font-bold italic tracking-wide">
              "{tagline}"
            </p>

            {/* Feature Highlights on Desktop */}
            <div className="hidden lg:flex flex-col gap-4 mt-8 w-full max-w-md">
              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white border border-[#E5E1D8] shadow-sm card-lift option-strip-a relative overflow-hidden">
                <span className="text-2xl z-10 relative">⚡</span>
                <div className="z-10 relative">
                  <h4 className="font-sans font-bold text-sm text-[#18181B]">Server-Timed Sprints</h4>
                  <p className="font-sans text-xs text-[#534434] mt-0.5">Rapid 30-second MCQs with authoritative anti-cheat timestamps.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white border border-[#E5E1D8] shadow-sm card-lift option-strip-c relative overflow-hidden">
                <span className="text-2xl z-10 relative">🔥</span>
                <div className="z-10 relative">
                  <h4 className="font-sans font-bold text-sm text-[#18181B]">Steal the Streak</h4>
                  <p className="font-sans text-xs text-[#534434] mt-0.5">Missed a day? Complete 3 consecutive challenges to restore your full streak.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white border border-[#E5E1D8] shadow-sm card-lift option-strip-b relative overflow-hidden">
                <span className="text-2xl z-10 relative">🏆</span>
                <div className="z-10 relative">
                  <h4 className="font-sans font-bold text-sm text-[#18181B]">Branch Battles & Speed King</h4>
                  <p className="font-sans text-xs text-[#534434] mt-0.5">Rival campus branches compete for podium dominance.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tactical Auth Form Plaque */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="glass-card glow-amber rounded-2xl border border-[#E5E1D8] shadow-[0_4px_0_#E2DDD2,0_8px_30px_rgba(245,158,11,0.15)] p-6 sm:p-8">
              
              {/* Mode Switcher Tabs */}
              <div className="flex rounded-xl p-1 mb-6 sm:mb-8 bg-[#F0EDF1] border border-[#E5E1D8] relative">
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer z-10 ${
                    mode === 'register' ? 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-white shadow-md border-none' : 'text-[#867461] hover:text-[#534434]'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer z-10 ${
                    mode === 'login' ? 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-white shadow-md border-none' : 'text-[#867461] hover:text-[#534434]'
                  }`}
                >
                  Login
                </button>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#18181B] mb-2">
                {mode === 'register' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-xs sm:text-sm text-[#534434] mb-6">
                {mode === 'register'
                  ? 'Choose a nickname, select your branch, and set a password.'
                  : 'Sign in with your nickname and password to play.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                    className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm sm:text-base focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/50 focus:scale-[1.02] transition-all"
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
                      className={`w-full pl-4 pr-10 py-3 sm:py-3.5 rounded-xl border bg-[#FAF8F5] text-sm sm:text-base transition-all text-left flex items-center outline-none cursor-pointer focus:scale-[1.02] ${
                        isDropdownOpen ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/50' : 'border-[#E5E1D8] hover:border-[#18181B]'
                      }`}
                    >
                      <span className={`truncate flex-1 flex items-center gap-2 ${branch ? 'text-[#18181B] font-medium' : 'text-[#867461]'}`}>
                        {branch ? (
                          <>
                            <span>{BRANCH_OPTIONS.find((o) => o.value === branch)?.icon}</span>
                            {BRANCH_OPTIONS.find((o) => o.value === branch)?.label}
                          </>
                        ) : 'Select your branch'}
                      </span>
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="absolute right-4 shrink-0 transition-transform duration-200" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <path d="M1.5 1.5L6 6L10.5 1.5" stroke="#867461" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <ul
                        id="branch-listbox"
                        role="listbox"
                        className="absolute z-50 w-full mt-1.5 rounded-xl border border-[#E5E1D8] bg-white shadow-xl overflow-y-auto"
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
                              className={`px-4 py-3 cursor-pointer text-sm sm:text-base transition-colors flex items-center gap-2 ${
                                isFocused ? 'bg-[#F0EDF1]' : 'bg-transparent'
                              } ${
                                isSelected ? 'text-[#F59E0B] font-bold' : 'text-[#18181B] font-medium'
                              }`}
                            >
                              <span>{option.icon}</span>
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
                    className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm sm:text-base focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/50 focus:scale-[1.02] transition-all"
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
                      className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm sm:text-base focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/50 focus:scale-[1.02] transition-all"
                    />
                  </div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: [-10, 10, -10, 10, 0] }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-[#FFF5F4] border border-[#FCA5A5] rounded-xl p-3.5 flex items-start gap-2.5 mt-2 overflow-hidden"
                    >
                      <span className="text-[#DB3320] text-sm mt-0.5">⚠️</span>
                      <p className="text-xs sm:text-sm font-bold text-[#DB3320] leading-snug">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 py-3.5 sm:py-4 rounded-xl bg-[#DB3320] hover:bg-[#B91C1C] text-white font-bold text-sm sm:text-base uppercase tracking-wider transition-all disabled:opacity-50 shadow-[0_4px_0_#920700] active:translate-y-1 active:shadow-none cursor-pointer shimmer-fast relative overflow-hidden"
                >
                  <span className="relative z-10">{submitting ? (mode === 'register' ? 'Creating…' : 'Signing in…') : (mode === 'register' ? 'Register' : 'Login')}</span>
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-[#E5E1D8] space-y-4">
                <p className="text-xs sm:text-sm text-center text-[#867461] font-medium">
                  {mode === 'register' ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="font-bold text-[#DB3320] hover:underline cursor-pointer"
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
                        className="font-bold text-[#DB3320] hover:underline cursor-pointer"
                      >
                        Register
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
