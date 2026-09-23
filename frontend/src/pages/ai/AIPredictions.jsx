import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  BrainCircuit,
  Wrench,
  Fuel,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Zap,
  TrendingDown,
  Gauge,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const AIPredictions = () => {
  const [activeTab, setActiveTab] = useState('maintenance');
  const [vehicles, setVehicles] = useState([]);
  const [aiOverview, setAiOverview] = useState(null);

  // Tab 1: Maintenance state
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [maintenancePrediction, setMaintenancePrediction] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);

  // Tab 2: Fuel state
  const [fuelParams, setFuelParams] = useState({
    distance_km: 350,
    cargo_weight_kg: 12000,
    vehicle_type: 'TRUCK',
    fuel_type: 'DIESEL',
  });
  const [fuelPrediction, setFuelPrediction] = useState(null);
  const [fuelLoading, setFuelLoading] = useState(false);

  // Tab 3: Route state
  const [routeParams, setRouteParams] = useState({
    origin: 'Chicago Central Hub',
    destination: 'Detroit Auto Terminal',
    distance_km: 450,
    cargo_weight_kg: 18000,
    fuel_type: 'DIESEL',
  });
  const [routeRecommendations, setRouteRecommendations] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [vRes, aiRes] = await Promise.all([
          apiClient.get('/vehicles'),
          apiClient.get('/ai/fleet-health-overview'),
        ]);
        setVehicles(vRes.data);
        setAiOverview(aiRes.data);
        if (vRes.data.length > 0) {
          setSelectedVehicleId(vRes.data[0].id);
          runMaintenancePrediction(vRes.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    initData();
    runFuelForecast();
    runRouteOptimization();
  }, []);

  const runMaintenancePrediction = async (vId) => {
    if (!vId) return;
    setMaintLoading(true);
    try {
      const res = await apiClient.post('/ai/predict-maintenance', { vehicle_id: parseInt(vId) });
      setMaintenancePrediction(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMaintLoading(false);
    }
  };

  const runFuelForecast = async () => {
    setFuelLoading(true);
    try {
      const res = await apiClient.post('/ai/forecast-fuel', fuelParams);
      setFuelPrediction(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFuelLoading(false);
    }
  };

  const runRouteOptimization = async () => {
    setRouteLoading(true);
    try {
      const res = await apiClient.post('/ai/optimize-route', routeParams);
      setRouteRecommendations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
          <BrainCircuit className="w-3.5 h-3.5" /> Machine Learning Intelligence
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-blue-400" /> AI & Predictive Analytics Engine
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Predictive maintenance failure risk, fuel consumption forecasting, and intelligent route recommendations.
        </p>
      </div>

      {/* AI Fleet Overview Banner */}
      {aiOverview && (
        <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-blue-300 font-bold mb-1">
                AI Intelligence Summary
              </div>
              <div className="text-3xl font-black text-white flex items-center gap-2">
                <span>{aiOverview.fleet_health_index}%</span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Optimal Fleet Health
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {aiOverview.high_risk_vehicles_count} High Risk Vehicles • Est. Fuel Optimization: ₹{(aiOverview.estimated_monthly_fuel_savings_inr ?? aiOverview.estimated_monthly_fuel_savings_usd ?? 0).toLocaleString('en-IN')}/mo
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 max-w-lg">
              {aiOverview.ai_recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'maintenance'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" /> 1. Predictive Maintenance Risk
        </button>

        <button
          onClick={() => setActiveTab('fuel')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'fuel'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fuel className="w-4 h-4" /> 2. Trip Fuel & Carbon Forecaster
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'routes'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" /> 3. Intelligent Route Optimizer
        </button>
      </div>

      {/* Tab 1: Predictive Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
              Select Fleet Vehicle
            </h3>
            <select
              value={selectedVehicleId}
              onChange={(e) => {
                setSelectedVehicleId(e.target.value);
                runMaintenancePrediction(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 outline-none focus:border-blue-500"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.license_plate} - {v.make} {v.model} ({v.odometer_km.toLocaleString()} km)
                </option>
              ))}
            </select>

            <button
              onClick={() => runMaintenancePrediction(selectedVehicleId)}
              disabled={maintLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <BrainCircuit className="w-4 h-4" />
              {maintLoading ? 'Analyzing Sensor Data...' : 'Run AI Diagnostic'}
            </button>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {maintenancePrediction ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{maintenancePrediction.make_model}</h3>
                    <span className="font-mono text-xs text-blue-400 font-bold">
                      {maintenancePrediction.license_plate}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
                      maintenancePrediction.risk_level === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : maintenancePrediction.risk_level === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    Risk: {maintenancePrediction.risk_level}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Health Index</span>
                    <span className="text-2xl font-black text-emerald-400">{maintenancePrediction.health_score}%</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Failure Probability</span>
                    <span className="text-2xl font-black text-amber-400">{maintenancePrediction.failure_probability_pct}%</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Predicted Days to Service</span>
                    <span className="text-2xl font-black text-white">{maintenancePrediction.predicted_days_to_service} Days</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">Critical Component Monitoring</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    {maintenancePrediction.critical_component}
                  </div>
                  <div className="text-slate-300 pt-1 leading-relaxed">
                    💡 <span className="font-semibold text-blue-300">Recommendation: </span>
                    {maintenancePrediction.recommendation}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-10 text-xs">Loading AI prediction...</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Fuel Consumption Forecaster */}
      {activeTab === 'fuel' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
              Trip Parameters
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Distance (km)</label>
              <input
                type="number"
                value={fuelParams.distance_km}
                onChange={(e) => setFuelParams({ ...fuelParams, distance_km: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Cargo Weight (kg)</label>
              <input
                type="number"
                value={fuelParams.cargo_weight_kg}
                onChange={(e) => setFuelParams({ ...fuelParams, cargo_weight_kg: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Vehicle Category</label>
              <select
                value={fuelParams.vehicle_type}
                onChange={(e) => setFuelParams({ ...fuelParams, vehicle_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 outline-none"
              >
                <option value="TRUCK">Heavy Truck</option>
                <option value="VAN">Delivery Van</option>
                <option value="TRAILER">Trailer</option>
                <option value="CONTAINER">Container Carrier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Fuel / Energy Type</label>
              <select
                value={fuelParams.fuel_type}
                onChange={(e) => setFuelParams({ ...fuelParams, fuel_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-2.5 outline-none"
              >
                <option value="DIESEL">BS-VI Diesel</option>
                <option value="CNG">Commercial CNG</option>
                <option value="ELECTRIC">Electric EV</option>
              </select>
            </div>

            <button
              onClick={runFuelForecast}
              disabled={fuelLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all"
            >
              Calculate AI Fuel Forecast
            </button>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {fuelPrediction && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-amber-400" /> AI Consumption & Cost Estimation (INR)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Predicted Volume</span>
                    <span className="text-2xl font-black text-amber-400">
                      {fuelPrediction.predicted_consumption} <span className="text-xs font-normal">{fuelPrediction.unit}</span>
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Estimated Fuel Cost</span>
                    <span className="text-2xl font-black text-emerald-400">₹{fuelPrediction.estimated_fuel_cost_inr ?? fuelPrediction.estimated_fuel_cost_usd}</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">CO2 Emissions</span>
                    <span className="text-2xl font-black text-cyan-400">{fuelPrediction.estimated_co2_emissions_kg} kg</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Predicted Efficiency:</span>
                    <span className="font-bold text-white">
                      {fuelPrediction.predicted_mileage_efficiency} km / {fuelPrediction.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Eco Certification Rating:</span>
                    <span className="font-bold text-emerald-400">{fuelPrediction.eco_rating}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Route Recommender */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {routeRecommendations.map((r) => (
              <div
                key={r.route_id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all space-y-3 ${
                  r.is_recommended
                    ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-500/5 to-slate-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      r.is_recommended
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {r.tag}
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">AI Score</span>
                    <span className="text-base font-black text-white">{r.ai_efficiency_score}/100</span>
                  </div>
                </div>

                <h4 className="font-bold text-white text-sm">{r.name}</h4>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Distance</span>
                    <span className="font-bold text-white">{r.distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Est. Time</span>
                    <span className="font-bold text-white">{r.duration_hours} hrs</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">{r.highlights}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPredictions;
