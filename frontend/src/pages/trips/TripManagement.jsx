import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import TripModal from '../../components/trips/TripModal';
import {
  MapPin,
  Plus,
  Search,
  RefreshCw,
  Truck,
  User,
  Package,
  Calendar,
  CheckCircle2,
  Play,
  Check,
  XCircle,
  Clock,
  ArrowRight,
  Weight
} from 'lucide-react';

const TripManagement = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const canDispatch = user?.role === 'ADMIN' || user?.role === 'FLEET_MANAGER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, vRes, dRes] = await Promise.all([
        apiClient.get('/trips', {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
          },
        }),
        apiClient.get('/trips/stats/summary'),
        apiClient.get('/vehicles'),
        apiClient.get('/drivers'),
      ]);
      setTrips(tRes.data);
      setStats(sRes.data);
      setVehicles(vRes.data);
      setDrivers(dRes.data);
    } catch (err) {
      console.error('Failed to load trips', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleStatusTransition = async (tripId, newStatus) => {
    try {
      const res = await apiClient.patch(`/trips/${tripId}/status`, { status: newStatus });
      setTrips((prev) => prev.map((t) => (t.id === tripId ? res.data : t)));
      setNotification({ type: 'success', text: `Trip updated to ${newStatus}` });
      const sRes = await apiClient.get('/trips/stats/summary');
      setStats(sRes.data);
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to update trip status.' });
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
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span> In Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
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
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
            <MapPin className="w-3.5 h-3.5" /> Freight Dispatch Operations
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Trip & Delivery Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch freight routes, track live cargo transit, and log proof of delivery completions.
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

          {canDispatch && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Dispatch Delivery
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Total Trips</div>
          <div className="text-2xl font-bold text-white mt-1">{stats ? stats.total_trips : '...'}</div>
        </div>

        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase text-blue-400">In Transit</div>
          <div className="text-2xl font-bold text-blue-300 mt-1">{stats ? stats.in_transit_trips : '...'}</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase text-amber-400">Scheduled</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{stats ? stats.scheduled_trips : '...'}</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase text-emerald-400">Delivered</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{stats ? stats.delivered_trips : '...'}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Distance Covered</div>
          <div className="text-xl font-bold text-white mt-1">
            {stats ? `${stats.total_distance_covered_km.toLocaleString()} km` : '...'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Delivered Cargo</div>
          <div className="text-xl font-bold text-white mt-1">
            {stats ? `${(stats.total_cargo_delivered_kg / 1000).toFixed(1)} Tons` : '...'}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trip code, origin, destination..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer w-full sm:w-auto"
        >
          <option value="">All Delivery Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.map((t) => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {t.trip_code}
                </span>
                <span className="text-xs text-slate-400">• {t.distance_km} km</span>
              </div>
              {getStatusBadge(t.status)}
            </div>

            {/* Route */}
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 flex-shrink-0"></span>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Origin</span>
                  <span className="text-white font-medium">{t.origin}</span>
                </div>
              </div>

              <div className="border-l-2 border-dashed border-slate-800 ml-1 pl-4 my-1 py-1">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Package className="w-3 h-3 text-slate-400" /> {t.cargo_type} ({t.cargo_weight_kg.toLocaleString()} kg)
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Destination</span>
                  <span className="text-white font-medium">{t.destination}</span>
                </div>
              </div>
            </div>

            {/* Assigned Assets */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <Truck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 block">Vehicle</span>
                  <span className="font-mono text-slate-200 font-semibold">{t.vehicle_plate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 block">Driver</span>
                  <span className="text-slate-200 font-semibold">{t.driver_name}</span>
                </div>
              </div>
            </div>

            {/* Lifecycle Controls */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {t.status === 'DELIVERED'
                  ? `Completed: ${new Date(t.actual_arrival || t.updated_at).toLocaleTimeString()}`
                  : `Est. Arr: ${new Date(t.estimated_arrival).toLocaleTimeString()}`}
              </span>

              <div className="flex items-center gap-2">
                {t.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleStatusTransition(t.id, 'IN_TRANSIT')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all"
                  >
                    <Play className="w-3 h-3" /> Start Transit
                  </button>
                )}

                {t.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => handleStatusTransition(t.id, 'DELIVERED')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all"
                  >
                    <Check className="w-3 h-3" /> Confirm Delivery
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <TripModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchData}
        vehicles={vehicles}
        drivers={drivers}
      />
    </div>
  );
};

export default TripManagement;
