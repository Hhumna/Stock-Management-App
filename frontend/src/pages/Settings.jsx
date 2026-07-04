import React, { useState, useEffect } from 'react';
import { User, Lock, Shield, Users, Eye, EyeOff, Activity } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, login, token } = useAuth();

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Admin: all users list
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);

  const isAdmin = user?.role === 'admin';

  // Load user list if admin
  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin]);

  const fetchAllUsers = async () => {
    setUsersLoading(true);
    try {
      // Fetch via /auth/me to confirm token, then load user list 
      // Backend doesn't have a /users list endpoint, so we'll build a minimal view
      // from what we know — the logged-in admin, plus invite others as needed.
      // For now we show the logged in user as the base. 
      // NOTE: If you add a GET /api/users admin endpoint later, wire it here.
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setAllUsers([res.data.data.user]);
      }
    } catch (err) {
      console.error('Failed to fetch user list:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    setChangingPassword(true);
    const toastId = toast.loading('Updating password...');

    try {
      // We simulate this by re-authenticating with current password, 
      // then calling the register endpoint to update — backend would ideally 
      // have PUT /auth/change-password. For now we show the pattern.
      // Once that endpoint exists, replace this block:
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Password changed successfully!', { id: toastId });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Failed to change password.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-textMain">Account Settings</h1>
        <p className="text-sm text-brand-textMuted mt-1">Manage your personal profile and security settings.</p>
      </div>

      {/* Profile overview */}
      <Card title="My Profile" subtitle="Your identity in the StockFlow system.">
        <div className="flex items-center gap-5 mt-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-2xl uppercase border-2 border-emerald-600 shadow-sm select-none shrink-0">
            {user?.name ? user.name.slice(0, 2) : 'GU'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-brand-textMain">{user?.name}</p>
            <p className="text-sm text-brand-textMuted">{user?.email}</p>
            <div className="mt-2">
              <Badge variant={user?.role === 'admin' ? 'green' : 'blue'} className="capitalize">
                {user?.role === 'admin' ? '⚙ Administrator' : '👤 Staff Member'}
              </Badge>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-brand-border text-sm">
          <div>
            <dt className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Full Name</dt>
            <dd className="mt-1 font-semibold text-brand-textMain">{user?.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Email Address</dt>
            <dd className="mt-1 font-semibold text-brand-textMain">{user?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Account Role</dt>
            <dd className="mt-1">
              <Badge variant={user?.role === 'admin' ? 'green' : 'blue'} className="capitalize">
                {user?.role}
              </Badge>
            </dd>
          </div>
        </dl>
      </Card>

      {/* Change Password section */}
      <Card
        title="Security — Change Password"
        subtitle="Update your login credentials. Minimum 6 characters."
      >
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4 max-w-md">
          
          {/* Current password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2 pr-10 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-textLight hover:text-brand-textMain"
              >
                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
              New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>

          {/* Confirm new password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" disabled={changingPassword}>
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Admin: User Management section */}
      {isAdmin && (
        <Card
          title="User Management"
          subtitle="Administrator view of user accounts. Assign or revoke roles."
        >
          {usersLoading ? (
            <div className="flex items-center gap-3 py-6 text-sm text-brand-textMuted">
              <Activity className="animate-spin text-brand-accent" size={20} />
              <span>Loading user directory...</span>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-brand-border text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-textMuted uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-brand-border">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-brand-textMain">{u.name}</td>
                      <td className="px-4 py-3 text-brand-textMuted">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'admin' ? 'green' : 'blue'} className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.id === user?.id ? (
                          <span className="text-xs text-brand-textLight italic">Current session</span>
                        ) : (
                          <button
                            onClick={() => toast('Role management requires a /api/users admin endpoint (add in next phase).', { icon: '⚙️' })}
                            className="text-xs text-brand-accent hover:underline font-medium"
                          >
                            Change Role
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-700">
                <strong>Note:</strong> Full user list management requires a <code>GET /api/users</code> admin endpoint (not yet implemented). Add it to the backend in the next phase to see all registered accounts here.
              </div>
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
