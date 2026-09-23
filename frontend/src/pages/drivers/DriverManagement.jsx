import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import DriverModal from '../../components/drivers/DriverModal';
import {
  UserCheck,
  Plus,
  Search,
  RefreshCw,
  Award,
  Shield,
  Phone,
  Mail,
  Truck,
  Star,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2
} from 'lucide-react';

const DriverManagement = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [notification, setNotification] = useState(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'FLEET_MANAGER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, sRes, vRes] = await Promise.all([
        apiClient.get('/drivers', {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
          },
        }),
        apiClient.get('/drivers/stats/summary'),
        apiClient.get('/vehicles'),
      ]);
      setDrivers(dRes.data);
      setStats(sRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      console.error('Failed to load drivers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleDeleteDriver = async (driverId, name) => {
    if (!window.confirm(`Are you sure you want to remove driver ${name}?`)) return;
    try {
      await apiClient.delete(`/drivers/${driverId}`);
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
      setNotification({ type: 'success', text: `Driver ${name} removed.` });
      const sRes = await apiClient.get('/drivers/stats/summary');
      setStats(sRes.data);
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to delete driver.' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Available
          </span>
        );
      case 'ON_DUTY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span> On Duty
          </span>
        );
      case 'OFF_DUTY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Off Duty
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            Suspended
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
            <UserCheck className="w-3.5 h-3.5" /> Commercial CDL Personnel
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Driver Management & Roster</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage certified drivers, commercial licenses, vehicle assignments, and safety scores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          {canManage && (
            <button
              onClick={() => {
                setEditingDriver(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Onboard Driver
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Total Drivers</div>
          <div className="text-2xl font-bold text-white">{stats ? stats.total_drivers : '...'}</div>
          <div className="text-xs text-slate-500 mt-1">Active roster</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-emerald-400 mb-1">Available on Standby</div>
          <div className="text-2xl font-bold text-emerald-300">{stats ? stats.available_drivers : '...'}</div>
          <div className="text-xs text-slate-500 mt-1">Ready for dispatch</div>
        </div>

        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-blue-400 mb-1">On Active Duty</div>
          <div className="text-2xl font-bold text-blue-300">{stats ? stats.on_duty_drivers : '...'}</div>
          <div className="text-xs text-slate-500 mt-1">Driving / In Transit</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-amber-400 mb-1 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> Fleet Safety Avg
          </div>
          <div className="text-2xl font-bold text-amber-300">
            {stats ? `${stats.avg_safety_score}%` : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Based on telemetry & trips</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search driver name, license, email..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer w-full sm:w-auto"
        >
          <option value="">All Driver Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ON_DUTY">On Duty</option>
          <option value="OFF_DUTY">Off Duty</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Drivers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Driver Profile</th>
                <th className="px-6 py-4">CDL License & Expiry</th>
                <th className="px-6 py-4">Assigned Vehicle</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Safety & AI Score</th>
                {canManage && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading drivers...</span>
                    </div>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                    No drivers found.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold">
                          {d.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {d.full_name}
                            <span className="text-[11px] text-amber-400 flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400" /> {d.rating}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">{d.email}</div>
                          <div className="text-[11px] text-slate-500">{d.phone} • {d.experience_years} yrs exp</div>
                        </div>
                      </div>
                    </td>

                    {/* License */}
                    <td className="px-6 py-4 text-xs space-y-1">
                      <div className="font-mono text-slate-200 font-medium">{d.license_number}</div>
                      <div className="text-[11px] text-slate-400">{d.license_type}</div>
                      <div>
                        {d.is_license_expired ? (
                          <span className="text-red-400 font-bold">Expired: {d.license_expiry}</span>
                        ) : d.is_license_expiring_soon ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Expiring {d.license_expiry}
                          </span>
                        ) : (
                          <span className="text-slate-500">Exp: {d.license_expiry}</span>
                        )}
                      </div>
                    </td>

                    {/* Assigned Vehicle */}
                    <td className="px-6 py-4 text-xs">
                      {d.assigned_vehicle_plate ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                          <Truck className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-mono font-semibold text-blue-300">{d.assigned_vehicle_plate}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">{getStatusBadge(d.status)}</td>

                    {/* Safety Score */}
                    <td className="px-6 py-4 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{d.performance_score}/100</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Grade {d.performance_grade}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Safety: {d.safety_score}% • Trips: {d.total_trips}
                      </div>
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingDriver(d);
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-slate-700"
                            title="Edit Driver"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {user?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleDeleteDriver(d.id, d.full_name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700"
                              title="Delete Driver"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DriverModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchData}
        editingDriver={editingDriver}
        availableVehicles={vehicles}
      />
    </div>
  );
};

export default DriverManagement;
