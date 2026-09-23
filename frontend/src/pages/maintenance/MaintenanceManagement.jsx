import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import MaintenanceModal from '../../components/maintenance/MaintenanceModal';
import {
  Wrench,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar
} from 'lucide-react';

const MaintenanceManagement = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'FLEET_MANAGER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, sRes, vRes] = await Promise.all([
        apiClient.get('/maintenance', {
          params: { status: statusFilter || undefined },
        }),
        apiClient.get('/maintenance/stats/summary'),
        apiClient.get('/vehicles'),
      ]);
      setRecords(mRes.data);
      setStats(sRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      console.error('Failed to load maintenance records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleStatusChange = async (recordId, newStatus) => {
    try {
      const res = await apiClient.patch(`/maintenance/${recordId}/status`, { status: newStatus });
      setRecords((prev) => prev.map((r) => (r.id === recordId ? res.data : r)));
      setNotification({ type: 'success', text: `Service status updated to ${newStatus}` });
      const sRes = await apiClient.get('/maintenance/stats/summary');
      setStats(sRes.data);
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to update status.' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Scheduled
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Wrench className="w-3.5 h-3.5 animate-spin" /> In Workshop
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
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
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-500/30">
            <Wrench className="w-3.5 h-3.5" /> Preventive Workshop & Repairs
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Maintenance & Workshop Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Service histories, preventive repairs, workshop costs, and automated service reminders.
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
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Schedule Service
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Total Maintenance Cost</div>
          <div className="text-2xl font-bold text-white">
            ₹{stats ? (stats.total_maintenance_cost_inr ?? stats.total_maintenance_cost_usd ?? 0).toLocaleString('en-IN') : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Total workshop expenditure</div>
        </div>

        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-blue-400 mb-1">In Workshop</div>
          <div className="text-2xl font-bold text-blue-300">{stats ? stats.in_progress_count : '...'}</div>
          <div className="text-xs text-slate-500 mt-1">Currently being serviced</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-amber-400 mb-1">Scheduled Upcoming</div>
          <div className="text-2xl font-bold text-amber-300">{stats ? stats.scheduled_count : '...'}</div>
          <div className="text-xs text-slate-500 mt-1">Booked service bays</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-emerald-400 mb-1">Completed Services</div>
          <div className="text-2xl font-bold text-emerald-300">{stats ? stats.completed_count : '...'}</div>
          <div className="text-xs text-slate-500 mt-1">Logged past work orders</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <span className="text-sm font-semibold text-slate-300">Filter Service Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">All Services</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Maintenance Records List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {records.map((r) => (
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-xs">
                  {r.vehicle_plate}
                </span>
                <span className="text-xs font-semibold text-white">{r.service_type}</span>
              </div>
              {getStatusBadge(r.status)}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {r.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Service Cost</span>
                <span className="text-sm font-bold text-emerald-400">₹{r.cost.toFixed(2)}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Odometer at Service</span>
                <span className="font-mono text-slate-200 font-medium">{r.odometer_at_service.toLocaleString()} km</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Service Date</span>
                <span className="text-slate-300">{r.service_date}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Next Service Due</span>
                <span className="text-amber-400 font-medium">{r.next_service_due_date || 'N/A'}</span>
              </div>
            </div>

            {r.parts_replaced && (
              <div className="text-[11px] text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-lg">
                <span className="text-slate-500 font-semibold">Parts: </span>{r.parts_replaced}
              </div>
            )}

            {canManage && r.status !== 'COMPLETED' && (
              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                {r.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleStatusChange(r.id, 'IN_PROGRESS')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all"
                  >
                    Start Service
                  </button>
                )}
                {r.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleStatusChange(r.id, 'COMPLETED')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                  >
                    Mark Service Completed
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <MaintenanceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchData}
        vehicles={vehicles}
      />
    </div>
  );
};

export default MaintenanceManagement;
