import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import VehicleModal from '../../components/vehicles/VehicleModal';
import {
  Truck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Fuel,
  Weight,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Zap,
  Info
} from 'lucide-react';

const VehicleManagement = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fuelFilter, setFuelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [notification, setNotification] = useState(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'FLEET_MANAGER';
  const canDelete = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, statsRes] = await Promise.all([
        apiClient.get('/vehicles', {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
            fuel_type: fuelFilter || undefined,
            vehicle_type: typeFilter || undefined,
          },
        }),
        apiClient.get('/vehicles/stats/summary'),
      ]);
      setVehicles(vehiclesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch vehicle data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, fuelFilter, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setModalOpen(true);
  };

  const handleQuickStatusChange = async (vehicleId, newStatus) => {
    try {
      const res = await apiClient.patch(`/vehicles/${vehicleId}/status`, { status: newStatus });
      setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? res.data : v)));
      setNotification({ type: 'success', text: `Vehicle status updated to ${newStatus}` });
      // Refresh summary stats
      const statsRes = await apiClient.get('/vehicles/stats/summary');
      setStats(statsRes.data);
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to update status.' });
    }
  };

  const handleDeleteVehicle = async (vehicleId, plate) => {
    if (!window.confirm(`Are you sure you want to permanently delete vehicle ${plate} from the fleet?`)) {
      return;
    }
    try {
      await apiClient.delete(`/vehicles/${vehicleId}`);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      setNotification({ type: 'success', text: `Vehicle ${plate} removed from fleet.` });
      const statsRes = await apiClient.get('/vehicles/stats/summary');
      setStats(statsRes.data);
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to delete vehicle.' });
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
      case 'ON_TRIP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span> On Trip
          </span>
        );
      case 'IN_MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> In Maintenance
          </span>
        );
      case 'DECOMMISSIONED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" /> Decommissioned
          </span>
        );
      default:
        return null;
    }
  };

  const getFuelBadge = (fuel, cap) => {
    const isEv = fuel === 'ELECTRIC';
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
        {isEv ? <Zap className="w-3 h-3 text-cyan-400" /> : <Fuel className="w-3 h-3 text-amber-400" />}
        {fuel} ({cap} {isEv ? 'kWh' : 'L'})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
            <Truck className="w-3.5 h-3.5" /> Fleet Asset Registry
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Vehicle Management System
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Register vehicles, manage fuel & payload specifications, track insurance/PUC renewals, and dispatch statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {canManage && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Total Fleet
          </div>
          <div className="text-2xl font-bold text-white">
            {stats ? stats.total_vehicles : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Active inventory</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Available
          </div>
          <div className="text-2xl font-bold text-emerald-300">
            {stats ? stats.available_vehicles : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Ready for dispatch</div>
        </div>

        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> On Trip
          </div>
          <div className="text-2xl font-bold text-blue-300">
            {stats ? stats.on_trip_vehicles : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Active on delivery</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Maintenance
          </div>
          <div className="text-2xl font-bold text-amber-300">
            {stats ? stats.in_maintenance_vehicles : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">In workshop</div>
        </div>

        <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Compliance Alert
          </div>
          <div className="text-2xl font-bold text-red-300">
            {stats ? stats.compliance_alerts : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Insurance/PUC due &lt;30d</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plate, VIN, make or model..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="IN_MAINTENANCE">In Maintenance</option>
            <option value="DECOMMISSIONED">Decommissioned</option>
          </select>

          {/* Fuel Filter */}
          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Fuels</option>
            <option value="DIESEL">Diesel</option>
            <option value="ELECTRIC">Electric (EV)</option>
            <option value="PETROL">Petrol</option>
            <option value="CNG">CNG</option>
            <option value="HYBRID">Hybrid</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="TRUCK">Trucks</option>
            <option value="VAN">Delivery Vans</option>
            <option value="TRAILER">Trailers</option>
            <option value="PICKUP">Pickups</option>
            <option value="CONTAINER">Containers</option>
          </select>
        </div>
      </div>

      {/* Vehicle Registry Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Vehicle Details</th>
                <th className="px-6 py-4">Category & Fuel</th>
                <th className="px-6 py-4">Max Payload & Odo</th>
                <th className="px-6 py-4">Operational Status</th>
                <th className="px-6 py-4">Compliance (Insurance & PUC)</th>
                {canManage && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading fleet vehicles...</span>
                    </div>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                    No vehicles found matching your criteria.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Vehicle Details */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {v.make} {v.model} ({v.year})
                          </div>
                          <div className="text-xs font-mono text-blue-400 font-semibold">
                            {v.license_plate}
                          </div>
                          <div className="text-[11px] text-slate-500">VIN: {v.vin}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Fuel */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="text-xs font-medium text-slate-200">{v.vehicle_type}</div>
                      <div>{getFuelBadge(v.fuel_type, v.fuel_capacity)}</div>
                    </td>

                    {/* Payload & Odometer */}
                    <td className="px-6 py-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Weight className="w-3.5 h-3.5 text-slate-400" />
                        <span>{v.max_payload_kg.toLocaleString()} kg</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                        <Gauge className="w-3.5 h-3.5 text-slate-500" />
                        <span>{v.odometer_km.toLocaleString()} km</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {canManage ? (
                        <select
                          value={v.status}
                          onChange={(e) => handleQuickStatusChange(v.id, e.target.value)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border outline-none cursor-pointer ${
                            v.status === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : v.status === 'ON_TRIP'
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                              : v.status === 'IN_MAINTENANCE'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="ON_TRIP">ON TRIP</option>
                          <option value="IN_MAINTENANCE">MAINTENANCE</option>
                          <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                        </select>
                      ) : (
                        getStatusBadge(v.status)
                      )}
                    </td>

                    {/* Compliance */}
                    <td className="px-6 py-4 text-xs space-y-1">
                      {/* Insurance Expiry */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-semibold text-slate-500">INS:</span>
                        {v.insurance_expiry ? (
                          <span
                            className={`font-medium ${
                              v.is_insurance_expired
                                ? 'text-red-400 font-bold'
                                : v.is_compliance_warning
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {v.insurance_expiry}
                            {v.is_insurance_expired && ' (Expired)'}
                          </span>
                        ) : (
                          <span className="text-slate-600">Not recorded</span>
                        )}
                      </div>

                      {/* PUC Expiry */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-semibold text-slate-500">PUC:</span>
                        {v.puc_expiry ? (
                          <span
                            className={`font-medium ${
                              v.is_puc_expired
                                ? 'text-red-400 font-bold'
                                : v.is_compliance_warning
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {v.puc_expiry}
                            {v.is_puc_expired && ' (Expired)'}
                          </span>
                        ) : (
                          <span className="text-slate-600">Not recorded</span>
                        )}
                      </div>

                      {v.is_compliance_warning && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1">
                          <AlertTriangle className="w-3 h-3" /> Renewal Due Soon
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-slate-700 transition-all"
                            title="Edit Vehicle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {canDelete && (
                            <button
                              onClick={() => handleDeleteVehicle(v.id, v.license_plate)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 transition-all"
                              title="Delete Vehicle"
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

      {/* Modal Dialog */}
      <VehicleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchData}
        editingVehicle={editingVehicle}
      />
    </div>
  );
};

export default VehicleManagement;
