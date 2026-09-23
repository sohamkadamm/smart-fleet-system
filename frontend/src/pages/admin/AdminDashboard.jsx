import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Navigation,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserPlus,
  AlertTriangle
} from 'lucide-react';

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        apiClient.get('/auth/users', {
          params: {
            search: searchQuery || undefined,
            role: roleFilter || undefined,
          },
        }),
        apiClient.get('/auth/stats'),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdminData();
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    setActionMessage(null);
    try {
      const res = await apiClient.patch(`/auth/users/${userId}`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
      setActionMessage({ type: 'success', text: `Updated user role to ${newRole}` });
      // Refresh stats
      const statsRes = await apiClient.get('/auth/stats');
      setStats(statsRes.data);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update user role.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    setUpdatingId(userId);
    setActionMessage(null);
    try {
      const res = await apiClient.patch(`/auth/users/${userId}`, { is_active: !currentStatus });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
      setActionMessage({
        type: 'success',
        text: `User account is now ${!currentStatus ? 'Active' : 'Disabled'}.`,
      });
      // Refresh stats
      const statsRes = await apiClient.get('/auth/stats');
      setStats(statsRes.data);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update user status.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-400" />
            User Directory & Access Control
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage system access, assign roles (Admin, Fleet Manager, Driver), and monitor staff status.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-all self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Total Users
          </div>
          <div className="text-2xl font-bold text-white">
            {stats ? stats.total_users : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">All accounts in system</div>
        </div>

        <div className="bg-slate-900 border border-purple-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Admins
          </div>
          <div className="text-2xl font-bold text-purple-300">
            {stats ? stats.admins : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Full system privilege</div>
        </div>

        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Managers
          </div>
          <div className="text-2xl font-bold text-blue-300">
            {stats ? stats.fleet_managers : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Fleet & Ops control</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5" /> Drivers
          </div>
          <div className="text-2xl font-bold text-emerald-300">
            {stats ? stats.drivers : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Field personnel</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active Rate
          </div>
          <div className="text-2xl font-bold text-emerald-300">
            {stats && stats.total_users > 0
              ? `${Math.round((stats.active_users / stats.total_users) * 100)}%`
              : '100%'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats ? `${stats.active_users} of ${stats.total_users} active` : '...'}
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-400 uppercase">Filter Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admins Only</option>
              <option value="FLEET_MANAGER">Fleet Managers Only</option>
              <option value="DRIVER">Drivers Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Current Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading user records...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = currentUser && currentUser.id === u.id;
                  const isUpdating = updatingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          {u.full_name}
                          {isSelf && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>

                      <td className="px-6 py-4 text-slate-300 text-xs">
                        {u.phone || <span className="text-slate-600">N/A</span>}
                      </td>

                      <td className="px-6 py-4">
                        <select
                          disabled={isSelf || isUpdating}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border outline-none cursor-pointer transition-all ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : u.role === 'FLEET_MANAGER'
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          } ${isSelf ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="FLEET_MANAGER">FLEET MANAGER</option>
                          <option value="DRIVER">DRIVER</option>
                        </select>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Inactive
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(u.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={isSelf || isUpdating}
                          onClick={() => handleStatusToggle(u.id, u.is_active)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                            u.is_active
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          } ${isSelf ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {isUpdating ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
