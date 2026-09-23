import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Check
} from 'lucide-react';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nRes, sRes] = await Promise.all([
        apiClient.get('/notifications'),
        apiClient.get('/notifications/stats/summary'),
      ]);
      setNotifications(nRes.data);
      setStats(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      const sRes = await apiClient.get('/notifications/stats/summary');
      setStats(sRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncAlerts = async () => {
    try {
      await apiClient.post('/notifications/sync-system-alerts');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      const sRes = await apiClient.get('/notifications/stats/summary');
      setStats(sRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
            <Bell className="w-3.5 h-3.5" /> Compliance & Safety Alarms
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Alerts & Notification Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time critical alarms, maintenance schedules, insurance/PUC document expirations, and delivery delay warnings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncAlerts}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" /> Scan & Sync Alerts
          </button>

          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30"
          >
            <Check className="w-4 h-4" /> Mark All Read
          </button>
        </div>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Total Notices</div>
          <div className="text-2xl font-bold text-white">{stats ? stats.total_notifications : '...'}</div>
        </div>

        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-blue-400 mb-1">Unread Alerts</div>
          <div className="text-2xl font-bold text-blue-300">{stats ? stats.unread_count : '...'}</div>
        </div>

        <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-red-400 mb-1">Critical Urgency</div>
          <div className="text-2xl font-bold text-red-300">{stats ? stats.critical_count : '...'}</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-amber-400 mb-1">Warnings (&lt;30d)</div>
          <div className="text-2xl font-bold text-amber-300">{stats ? stats.warning_count : '...'}</div>
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex items-start gap-4 transition-all ${
              !n.is_read
                ? 'border-blue-500/40 bg-gradient-to-r from-blue-500/5 to-slate-900 ring-1 ring-blue-500/20'
                : 'border-slate-800 opacity-80'
            }`}
          >
            <div className="mt-1 flex-shrink-0">{getSeverityIcon(n.severity)}</div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{n.title}</h3>
                <span className="text-xs text-slate-500">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>

              <div className="pt-2 flex items-center gap-3">
                {n.link_url && (
                  <button
                    onClick={() => navigate(n.link_url)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    View Resource <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark as Read
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;
