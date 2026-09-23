import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  BarChart3,
  TrendingUp,
  Truck,
  DollarSign,
  Fuel,
  Wrench,
  CheckCircle2,
  PieChart,
  RefreshCw,
  Award
} from 'lucide-react';

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/analytics/overview');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
            <BarChart3 className="w-3.5 h-3.5" /> Enterprise Intelligence & KPI Radar
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive BI Analytics Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time business intelligence, fleet utilization rates, delivery volume trends, and expenditure breakdowns.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Analytics
        </button>
      </div>

      {loading && !data && (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <span className="text-slate-400 text-sm">Loading analytics data...</span>
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No Analytics Data</h3>
          <p className="text-sm text-slate-500 mt-1">Add vehicles, trips, and fuel logs to see analytics here.</p>
        </div>
      )}

      {data && (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Fleet Utilization</span>
              <div className="text-3xl font-black text-blue-400">{data.fleet_utilization_pct}%</div>
              <div className="text-xs text-slate-500 mt-1">{data.active_fleet_count} of {data.total_vehicles} vehicles active</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Completed Deliveries</span>
              <div className="text-3xl font-black text-emerald-400">{data.total_completed_trips}</div>
              <div className="text-xs text-slate-500 mt-1">{data.total_completed_trips > 0 ? `${(data.total_cargo_delivered_kg / 1000).toFixed(1)} Tons freight delivered` : 'No deliveries yet'}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Fuel & Energy Spend</span>
              <div className="text-3xl font-black text-amber-400">
                {(data.total_fuel_expenditure_inr ?? data.total_fuel_expenditure_usd ?? 0) > 0
                  ? `₹${(data.total_fuel_expenditure_inr ?? data.total_fuel_expenditure_usd).toLocaleString('en-IN')}`
                  : '₹0'}
              </div>
              <div className="text-xs text-slate-500 mt-1">{data.total_distance_km > 0 ? `${data.total_distance_km.toLocaleString('en-IN')} km total distance` : 'No distance recorded'}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Workshop Maintenance</span>
              <div className="text-3xl font-black text-white">
                {(data.total_maintenance_expenditure_inr ?? data.total_maintenance_expenditure_usd ?? 0) > 0
                  ? `₹${(data.total_maintenance_expenditure_inr ?? data.total_maintenance_expenditure_usd).toLocaleString('en-IN')}`
                  : '₹0'}
              </div>
              <div className="text-xs text-slate-500 mt-1">{data.average_driver_score > 0 ? `Avg Driver Safety: ${data.average_driver_score}%` : 'No driver data'}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Deliveries Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Monthly Delivery Volume & Cargo Tonnage
                </h3>
                <span className="text-xs text-slate-400">Past 6 Months</span>
              </div>

              {data.monthly_deliveries_trend.every(m => m.deliveries === 0) ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                  No deliveries recorded in the last 6 months.
                </div>
              ) : (
                <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
                  {data.monthly_deliveries_trend.map((m, idx) => {
                    const maxDeliv = Math.max(1, ...data.monthly_deliveries_trend.map(x => x.deliveries));
                    const heightPct = Math.min(100, Math.round((m.deliveries / maxDeliv) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="text-[10px] font-bold text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.deliveries} trips
                        </div>
                        <div className="w-full bg-slate-800 rounded-t-xl overflow-hidden h-44 flex items-end">
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-xl transition-all duration-1000 group-hover:from-blue-500 group-hover:to-cyan-300"
                            style={{ height: `${heightPct}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                          {m.month.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vehicle Status Distribution & Fleet Fuel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" /> Operational Fleet Distribution
                </h3>
                <span className="text-xs text-slate-400">Current Status</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {data.vehicle_status_distribution.map((s, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-xs font-semibold text-slate-400">{s.status}</span>
                    <div className="text-2xl font-black text-white">{s.count}</div>
                    <div className="text-[10px] text-slate-500">
                      {data.total_vehicles > 0 ? Math.round((s.count / data.total_vehicles) * 100) : 0}% of fleet
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="text-xs font-bold uppercase text-slate-400 mb-2">Fuel Spend Distribution</div>
                {data.fuel_consumption_by_type.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">No fuel logs recorded yet.</div>
                ) : (
                  <div className="space-y-2">
                    {data.fuel_consumption_by_type.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-950/40 p-2 rounded-lg">
                        <span className="text-slate-300 font-medium">{f.type}</span>
                        <span className="font-mono text-emerald-400 font-semibold">₹{(f.cost_inr ?? f.cost_usd ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
