import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import FuelModal from '../../components/fuel/FuelModal';
import {
  Fuel,
  Plus,
  RefreshCw,
  Zap,
  DollarSign,
  TrendingDown,
  Gauge,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Search
} from 'lucide-react';

const FuelManagement = () => {
  const { user } = useAuth();
  const [fuelLogs, setFuelLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const canLog = user?.role === 'ADMIN' || user?.role === 'FLEET_MANAGER' || user?.role === 'DRIVER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, sRes, vRes, dRes, anomRes] = await Promise.all([
        apiClient.get('/fuel'),
        apiClient.get('/fuel/stats/summary'),
        apiClient.get('/vehicles'),
        apiClient.get('/drivers'),
        apiClient.get('/fuel/anomalies').catch(() => ({ data: null }))
      ]);
      setFuelLogs(fRes.data);
      setStats(sRes.data);
      setVehicles(vRes.data);
      setDrivers(dRes.data);
      if (anomRes?.data) {
        setAnomalies(anomRes.data);
      }
    } catch (err) {
      console.error('Failed to load fuel data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-500/30">
            <Fuel className="w-3.5 h-3.5" /> Energy & Consumption Metrics
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Fuel & Energy Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor refill logs, detect fuel theft/pilferage anomalies, and analyze vehicle-wise mileage efficiency (km/L & km/kWh).
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

          {canLog && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Log Refill / Charge
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Total Fuel Spend</div>
          <div className="text-2xl font-bold text-emerald-400">
            ₹{stats ? (stats.total_fuel_spent_inr ?? stats.total_fuel_spent_usd ?? 0).toLocaleString('en-IN') : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">All logged refills</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Volume Consumed</div>
          <div className="text-2xl font-bold text-white">
            {stats ? `${stats.total_fuel_units_consumed.toLocaleString('en-IN')} Units` : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Liters, kg & kWh combined</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Average Unit Price</div>
          <div className="text-2xl font-bold text-blue-300">
            ₹{stats ? stats.average_fuel_cost_per_liter : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Average per L / kg / kWh</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase text-amber-400 mb-1 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5" /> Fleet Mileage
          </div>
          <div className="text-2xl font-bold text-amber-300">
            {stats ? `${stats.average_fleet_efficiency_km_per_unit} km/unit` : '...'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Average mileage efficiency</div>
        </div>
      </div>

      {/* Fuel Theft & Anomaly Detection Radar Card */}
      {anomalies && (
        <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Fuel Theft & Anomaly Radar (Statistical Detection)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                    {anomalies.total_anomalies_detected} Outliers Detected
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Flags severe efficiency drops (&lt;65% baseline), suspected siphoning, injector leaks, and invoice over-billing.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estimated Pilferage Exposure</span>
              <span className="text-xl font-black text-red-400">
                ₹{anomalies.total_estimated_pilferage_loss_inr.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {anomalies.anomalous_logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="pb-2">Vehicle & Driver</th>
                    <th className="pb-2">Station & Refill</th>
                    <th className="pb-2">Mileage vs Expected</th>
                    <th className="pb-2">Suspected Issue</th>
                    <th className="pb-2">Est. Financial Loss</th>
                    <th className="pb-2 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {anomalies.anomalous_logs.map((anom, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5">
                        <span className="font-mono font-bold text-white block">{anom.license_plate}</span>
                        <span className="text-[11px] text-slate-400">{anom.driver_name}</span>
                      </td>
                      <td className="py-2.5">
                        <div className="text-slate-300">{anom.station_name}</div>
                        <div className="text-[10px] text-slate-500">{anom.fuel_quantity_liters} L • {anom.invoice_number || 'No Invoice'}</div>
                      </td>
                      <td className="py-2.5 font-mono">
                        <div className="text-red-400 font-bold">
                          {anom.recorded_efficiency_km_l ? `${anom.recorded_efficiency_km_l} km/L` : '0.0 km/L'}
                        </div>
                        <div className="text-[10px] text-slate-500">Expected: {anom.expected_baseline_km_l} km/L (-{anom.efficiency_deviation_pct}%)</div>
                      </td>
                      <td className="py-2.5">
                        <span className="font-medium text-amber-300">{anom.suspected_cause}</span>
                      </td>
                      <td className="py-2.5 font-mono font-bold text-red-400">
                        ₹{anom.estimated_financial_loss_inr.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          anom.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {anom.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>All logged fuel refills conform to expected vehicle mileage baselines. Zero fuel anomalies detected.</span>
            </div>
          )}
        </div>
      )}

      {/* Fuel Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Fuel className="w-4 h-4 text-amber-400" /> Diesel, CNG & EV Refill History
          </h3>
          <span className="text-xs text-slate-400">{fuelLogs.length} Records Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Fuel / Energy Type</th>
                <th className="px-6 py-4">Volume & Rate</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Odometer & Mileage</th>
                <th className="px-6 py-4">Station & Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading fuel logs...</td>
                </tr>
              ) : fuelLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">No fuel records logged yet.</td>
                </tr>
              ) : (
                fuelLogs.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-white text-sm block">{f.vehicle_plate}</span>
                      <span className="text-xs text-slate-400">Driver: {f.driver_name || 'Fleet Pilot'}</span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                        {f.fuel_type === 'ELECTRIC' ? <Zap className="w-3 h-3 text-cyan-400" /> : <Fuel className="w-3 h-3 text-amber-400" />}
                        {f.fuel_type}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs space-y-0.5">
                      <div className="font-semibold text-slate-200">
                        {f.fuel_quantity} {f.fuel_type === 'ELECTRIC' ? 'kWh' : f.fuel_type === 'CNG' ? 'kg' : 'L'}
                      </div>
                      <div className="text-slate-500">₹{f.unit_cost} / unit</div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-emerald-400">₹{f.total_cost.toFixed(2)}</span>
                    </td>

                    <td className="px-6 py-4 text-xs space-y-0.5">
                      <div className="font-mono text-slate-300">{f.odometer_km.toLocaleString()} km</div>
                      {f.efficiency_km_per_unit && (
                        <div className="text-emerald-400 font-semibold text-[11px]">
                          ⚡ {f.efficiency_km_per_unit} km/{f.fuel_type === 'ELECTRIC' ? 'kWh' : 'L'}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs space-y-0.5">
                      <div className="text-slate-300">{f.station_name}</div>
                      <div className="text-slate-500">{new Date(f.refill_date).toLocaleDateString()}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FuelModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchData}
        vehicles={vehicles}
        drivers={drivers}
      />
    </div>
  );
};

export default FuelManagement;
