import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import type { Admin } from '../../api';
import { ADMIN_BASE_PATH } from '../../config';

export default function AdminManagement() {
  const navigate = useNavigate();
  const { secretKey } = useParams<{ secretKey?: string }>();
  const adminBase = secretKey ? `/${secretKey}/admin` : ADMIN_BASE_PATH;

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New admin form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [creating, setCreating] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const data = await api.getAdmins();
      setAdmins(data);
    } catch (err: any) {
      if (err.status === 403 || err.status === 401) {
        navigate(`${adminBase}/dashboard`);
      } else {
        setError('Failed to load admins');
      }
    } finally {
      setLoading(false);
    }
  }, [adminBase, navigate]);

  useEffect(() => {
    api.getAdminMe()
      .then((me) => setMyRole(me.role))
      .catch(() => navigate(adminBase));

    fetchAdmins();
  }, [adminBase, fetchAdmins, navigate]);

  const handleLogout = async () => {
    await api.adminLogout().catch(() => {});
    navigate(adminBase);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.createAdmin({ email, password, role });
      setEmail('');
      setPassword('');
      setRole('ADMIN');
      await fetchAdmins();
    } catch (err: any) {
      setError(err?.error || err?.reason || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    setError('');
    try {
      await api.deleteAdmin(id);
      await fetchAdmins();
    } catch (err: any) {
      setError(err?.error || 'Failed to delete admin');
    }
  };

  const handleRoleChange = async (id: string, newRole: 'ADMIN' | 'SUPER_ADMIN') => {
    setError('');
    try {
      await api.updateAdminRole(id, newRole);
      await fetchAdmins();
    } catch (err: any) {
      setError(err?.error || 'Failed to update role');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-[#867461] font-sans text-sm font-medium animate-pulse">Loading Admin Directory...</div>
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
          <Link to={`${adminBase}/dashboard`} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
            Dashboard
          </Link>
          <Link to={`${adminBase}/questions/new`} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
            Questions
          </Link>
          <a href={`${adminBase}/dashboard#poll-history`} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
            Analytics
          </a>
          {myRole === 'SUPER_ADMIN' && (
            <Link to={`${adminBase}/admins`} className="flex items-center px-3 py-2.5 bg-[#FAF8F5] text-[#18181B] rounded-md font-bold text-sm">
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
              {myRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 md:p-10 lg:p-12 overflow-x-hidden">
          <div className="max-w-5xl mx-auto space-y-10">
            
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-medium text-[#18181B]">Admin Management</h1>
                <p className="font-sans text-sm text-[#534434] mt-1.5">Provision and manage QuizPop administrative access.</p>
              </div>
            </div>

            {/* ERRORS */}
            {error && (
              <div className="bg-[#FFF5F4] border border-[#FCA5A5] rounded-xl p-4 flex items-start gap-3">
                <span className="text-[#DB3320] mt-0.5">⚠️</span>
                <p className="text-sm font-bold text-[#DB3320]">{error}</p>
              </div>
            )}

            {/* PROVISIONING FORM */}
            <section className="bg-white border border-[#E5E1D8] rounded-xl shadow-sm p-6 md:p-8">
              <h2 className="text-sm font-bold text-[#18181B] uppercase tracking-widest mb-5">Provision New Admin</h2>
              <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-5 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@university.edu"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] text-sm focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors"
                  />
                </div>
                <div className="w-full md:w-48">
                  <label className="block text-xs font-bold text-[#867461] uppercase tracking-widest mb-2">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#FAF8F5] text-[#18181B] font-bold text-sm focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full md:w-auto px-6 py-2.5 rounded bg-[#18181B] hover:bg-[#27221A] text-white shadow-sm font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {creating ? 'Adding...' : 'Add Admin'}
                </button>
              </form>
            </section>

            {/* ADMINS LIST */}
            <section className="bg-white border border-[#E5E1D8] rounded-xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E5E1D8]">
                    <th className="px-6 py-4 text-[10px] font-bold text-[#867461] uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[#867461] uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[#867461] uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[#867461] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8]">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-[#FAF8F5] transition-colors group">
                      <td className="px-6 py-4 font-medium text-[#18181B] align-middle">{admin.email}</td>
                      <td className="px-6 py-4 align-middle">
                        <select
                          value={admin.role}
                          onChange={(e) => handleRoleChange(admin.id, e.target.value as 'ADMIN' | 'SUPER_ADMIN')}
                          className="px-3 py-1.5 rounded-md border border-[#E5E1D8] bg-white text-[#18181B] font-bold text-xs focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors cursor-pointer"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[#534434] align-middle">
                        {new Date(admin.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right align-middle">
                        <button
                          onClick={() => handleDelete(admin.id)}
                          className="px-4 py-2 rounded border border-[#FCA5A5] bg-[#FFF5F4] text-[#DB3320] hover:bg-[#FEE2E2] font-bold text-xs transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <span className="font-serif font-semibold text-lg text-[#18181B]">QuizPop Admin</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-[#867461] hover:bg-[#FAF8F5] rounded-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              <Link to={`${adminBase}/dashboard`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
                Dashboard
              </Link>
              <Link to={`${adminBase}/questions/new`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
                Questions
              </Link>
              <a href={`${adminBase}/dashboard#poll-history`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 text-[#534434] hover:bg-[#FAF8F5] hover:text-[#18181B] rounded-md font-semibold text-sm transition-colors">
                Analytics
              </a>
              {myRole === 'SUPER_ADMIN' && (
                <Link to={`${adminBase}/admins`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-3 py-2.5 bg-[#FAF8F5] text-[#18181B] rounded-md font-bold text-sm">
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
