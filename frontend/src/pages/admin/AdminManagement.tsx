import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api';
import type { Admin } from '../../api';

export default function AdminManagement() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New admin form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [creating, setCreating] = useState(false);

  const fetchAdmins = async () => {
    try {
      const data = await api.getAdmins();
      setAdmins(data);
    } catch (err: any) {
      if (err.status === 403 || err.status === 401) {
        navigate('/admin/dashboard');
      } else {
        setError('Failed to load admins');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [navigate]);

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
    try {
      await api.deleteAdmin(id);
      await fetchAdmins();
    } catch (err: any) {
      setError(err?.error || 'Failed to delete admin');
    }
  };

  const handleRoleChange = async (id: string, newRole: 'ADMIN' | 'SUPER_ADMIN') => {
    try {
      await api.updateAdminRole(id, newRole);
      await fetchAdmins();
    } catch (err: any) {
      setError(err?.error || 'Failed to update role');
    }
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
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="font-semibold text-gray-800">Admin Management</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Invite New Admin</h2>
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {creating ? 'Adding...' : 'Add Admin'}
            </button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Email</th>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Role</th>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Created At</th>
                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{admin.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={admin.role}
                      onChange={(e) => handleRoleChange(admin.id, e.target.value as 'ADMIN' | 'SUPER_ADMIN')}
                      className="px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:border-indigo-400 bg-white"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(admin.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(admin.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
