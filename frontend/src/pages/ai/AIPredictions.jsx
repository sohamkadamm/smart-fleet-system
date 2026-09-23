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
  ShieldCheck,
  Cpu,
  BarChart3,
  Layers,
  Database,
  Box,
  Package,
  Milestone,
  Plus,
  Trash2,
  Play,
  Truck,
  MapPin,
  TrendingUp,
  Scale
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';

const ROUTE_COLORS = ['#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];

const createDepotIcon = (name) => {
  return L.divIcon({
    className: 'custom-depot-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="background:#eab308; color:#0f172a; font-weight:800; font-size:10px; padding:2px 6px; border-radius:6px; font-family:monospace; border:2px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.5);">
          DEPOT: ${name}
        </div>
        <div style="width:10px; height:10px; background:#eab308; border-radius:9999px; border:2px solid white; margin-top:2px;"></div>
      </div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 28]
  });
};

const createStopIcon = (num, name) => {
  return L.divIcon({
    className: 'custom-stop-pin',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="background:#06b6d4; color:#0f172a; font-weight:800; font-size:10px; padding:2px 6px; border-radius:6px; font-family:monospace; border:2px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.5);">
          #${num} ${name}
        </div>
        <div style="width:8px; height:8px; background:#06b6d4; border-radius:9999px; border:2px solid white; margin-top:2px;"></div>
      </div>
    `,
    iconSize: [70, 28],
    iconAnchor: [35, 26]
  });
};

const AIPredictions = () => {
  const [activeTab, setActiveTab] = useState('maintenance');
  const [vehicles, setVehicles] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [aiOverview, setAiOverview] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);

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
    origin: 'JNPT Port, Navi Mumbai',
    destination: 'Talegaon MIDC, Pune',
    distance_km: 135,
    cargo_weight_kg: 16000,
    fuel_type: 'DIESEL',
  });
  const [routeRecommendations, setRouteRecommendations] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  // Tab 4: OR-Tools CVRP & 3D Cargo Packing state
  const [vrpDepot, setVrpDepot] = useState('Mumbai (JNPT)');
  const [vrpStops, setVrpStops] = useState([
    { name: 'Pune (Chakan)', cargo_weight_kg: 2500 },
    { name: 'Ahmedabad (Sanand)', cargo_weight_kg: 3800 },
    { name: 'Bengaluru (Peenya)', cargo_weight_kg: 3200 },
    { name: 'Hyderabad (Shamshabad)', cargo_weight_kg: 2400 }
  ]);
  const [newStopHub, setNewStopHub] = useState('');
  const [newStopWeight, setNewStopWeight] = useState(1500);
  const [vrpSelectedVehicles, setVrpSelectedVehicles] = useState([]);
  const [vrpLoading, setVrpLoading] = useState(false);
  const [vrpResult, setVrpResult] = useState(null);

  // 3D Cargo Packing state
  const [cargoBoxes, setCargoBoxes] = useState([
    { label: 'Engine Blocks Pallet', length_cm: 120, width_cm: 100, height_cm: 80, weight_kg: 850, fragile: false },
    { label: 'Transmission Gearboxes', length_cm: 100, width_cm: 80, height_cm: 70, weight_kg: 550, fragile: false },
    { label: 'Brake Disc Calipers', length_cm: 80, width_cm: 60, height_cm: 50, weight_kg: 320, fragile: false },
    { label: 'High-Density Battery Packs', length_cm: 90, width_cm: 70, height_cm: 60, weight_kg: 420, fragile: false },
    { label: 'Sensitive Electronic ECUs', length_cm: 50, width_cm: 40, height_cm: 30, weight_kg: 45, fragile: true }
  ]);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingResult, setPackingResult] = useState(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const [vRes, aiRes, metricsRes, hubsRes] = await Promise.all([
          apiClient.get('/vehicles'),
          apiClient.get('/ai/fleet-health-overview'),
          apiClient.get('/ai/model-metrics').catch(() => ({ data: null })),
          apiClient.get('/trips/hubs').catch(() => ({ data: [] }))
        ]);
        setVehicles(vRes.data);
        setAiOverview(aiRes.data);
        if (metricsRes?.data) setModelMetrics(metricsRes.data);
        if (hubsRes?.data) setHubs(hubsRes.data);

        if (vRes.data.length > 0) {
          setSelectedVehicleId(vRes.data[0].id);
          runMaintenancePrediction(vRes.data[0].id);
          // Preselect first 2-3 available vehicles for VRP
          setVrpSelectedVehicles(vRes.data.slice(0, 3).map((v) => v.id));
        }
      } catch (err) {
        console.error("AI Init Error:", err);
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

  // Tab 4: VRP Solver Handler
  const runVrpOptimization = async () => {
    setVrpLoading(true);
    try {
      const payload = {
        depot_name: vrpDepot,
        stops: vrpStops,
        vehicle_ids: vrpSelectedVehicles.length > 0 ? vrpSelectedVehicles : undefined
      };
      const res = await apiClient.post('/ai/optimize-vrp', payload);
      setVrpResult(res.data);
    } catch (err) {
      console.error("VRP Solver error:", err);
    } finally {
      setVrpLoading(false);
    }
  };

  // Tab 4: 3D Cargo Packing Handler
  const runCargoPacking = async () => {
    setPackingLoading(true);
    try {
      const payload = {
        boxes: cargoBoxes
      };
      const res = await apiClient.post('/ai/cargo-packing', payload);
      setPackingResult(res.data);
    } catch (err) {
      console.error("Packing error:", err);
    } finally {
      setPackingLoading(false);
    }
  };

  const handleAddStop = () => {
    if (!newStopHub) return;
    setVrpStops([...vrpStops, { name: newStopHub, cargo_weight_kg: parseFloat(newStopWeight) || 1000 }]);
    setNewStopHub('');
  };

  const handleRemoveStop = (idx) => {
    setVrpStops(vrpStops.filter((_, i) => i !== idx));
  };

  const toggleVrpVehicle = (vId) => {
    if (vrpSelectedVehicles.includes(vId)) {
      setVrpSelectedVehicles(vrpSelectedVehicles.filter((id) => id !== vId));
    } else {
      setVrpSelectedVehicles([...vrpSelectedVehicles, vId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Phase 5.1 Scikit-Learn Engine
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Phase 4 Google OR-Tools CVRP
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            OpenStreetMap Road Routing
          </span>
        </div>
        <h1 className="text-2xl font-black text-white mt-1">AI & Predictive Analytics Cockpit</h1>
        <p className="text-slate-400 text-sm">
          Scikit-Learn Random Forest failure classifier, Google OR-Tools fleet optimization, and 3D cargo packing heuristics.
        </p>
      </div>

      {/* Fleet Overview Header */}
      {aiOverview && (
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
                <BrainCircuit className="w-4 h-4" /> Live Fleet Telematics Health
              </div>
              <div className="text-3xl font-black text-white flex items-center gap-2">
                <span>{aiOverview.fleet_health_index}%</span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Optimal Fleet Health
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {aiOverview.high_risk_vehicles_count} High Risk Vehicles • Est. Fuel Optimization: ₹{(aiOverview.estimated_monthly_fuel_savings_inr ?? 0).toLocaleString('en-IN')}/mo
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
      <div className="flex flex-wrap border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'maintenance'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" /> 1. Predictive Maintenance ML
        </button>

        <button
          onClick={() => setActiveTab('fuel')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'fuel'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fuel className="w-4 h-4" /> 2. Fuel & Carbon Forecaster
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'routes'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" /> 3. Single-Leg Highway Routes
        </button>

        <button
          onClick={() => setActiveTab('vrp')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'vrp'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> 4. OR-Tools CVRP & 3D Packing
        </button>
      </div>

      {/* Tab 1: Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Academic Model Verification Card */}
          {modelMetrics && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Academic ML Model Card</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {modelMetrics.model_name}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Benchmark: {modelMetrics.dataset_name} ({modelMetrics.benchmark_id})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Test Samples:</span>
                  <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                    {modelMetrics.test_samples?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Verified Metrics Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">ROC-AUC Score</span>
                  <span className="text-xl font-black text-purple-400">
                    {modelMetrics.metrics?.roc_auc}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Sensitivity / Recall</span>
                  <span className="text-xl font-black text-emerald-400">
                    {(modelMetrics.metrics?.recall * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Precision</span>
                  <span className="text-xl font-black text-blue-400">
                    {(modelMetrics.metrics?.precision * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Cost Reduction</span>
                  <span className="text-xl font-black text-cyan-400">
                    {modelMetrics.baseline_comparisons?.cost_reduction_vs_baseline_pct}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Vehicle Selector & Prediction Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Fleet Asset</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVehicleId(v.id);
                      runMaintenancePrediction(v.id);
                    }}
                    className={`w-full p-3 rounded-xl text-left border transition-all text-xs ${
                      selectedVehicleId === v.id
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">{v.license_plate}</span>
                      <span className="text-[10px] font-mono">{v.vehicle_type}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{v.make} {v.model} ({v.year})</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {maintLoading ? (
                <div className="py-20 text-center text-slate-400">Evaluating telemetry via Scikit-Learn...</div>
              ) : maintenancePrediction ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{maintenancePrediction.make_model}</h3>
                      <p className="text-xs font-mono text-blue-400">{maintenancePrediction.license_plate}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      maintenancePrediction.risk_level === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {maintenancePrediction.risk_level} RISK
                    </span>
                  </div>

                  {/* Dual-Model Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/80 p-4 rounded-xl border border-purple-500/30">
                      <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">
                        Scikit-Learn ML Model Probability
                      </span>
                      <div className="text-3xl font-black text-white">
                        {maintenancePrediction.failure_probability_pct}%
                      </div>
                      <span className="text-[10px] text-slate-400">Random Forest Classifier (100 Estimators)</span>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                        Rule-Based Baseline Comparator
                      </span>
                      <div className="text-3xl font-black text-slate-300">
                        {((maintenancePrediction.rule_based_baseline_probability || 0.3) * 100).toFixed(0)}%
                      </div>
                      <span className="text-[10px] text-slate-500">Heuristic Schedule Baseline</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Top Contributing Telematics Risk Factors</h4>
                    {maintenancePrediction.top_contributing_factors?.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Fuel */}
      {activeTab === 'fuel' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Trip Parameters</h3>

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
                <option value="TRUCK">Heavy Commercial Truck</option>
                <option value="CONTAINER">Container Carrier</option>
                <option value="TRAILER">Multi-Axle Trailer</option>
                <option value="VAN">Light Delivery Van</option>
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
                <option value="ELECTRIC">Commercial EV</option>
              </select>
            </div>

            <button
              onClick={runFuelForecast}
              disabled={fuelLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all"
            >
              {fuelLoading ? 'Calculating...' : 'Forecast Consumption'}
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
                    <span className="text-2xl font-black text-emerald-400">₹{fuelPrediction.estimated_fuel_cost_inr}</span>
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

      {/* Tab 3: Route Evaluator */}
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

      {/* Tab 4: Google OR-Tools CVRP & 3D Cargo Packing */}
      {activeTab === 'vrp' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-2 border border-purple-500/30">
                  <Layers className="w-3.5 h-3.5" /> Operations Research Engine
                </div>
                <h2 className="text-xl font-black text-white">Google OR-Tools Multi-Stop Dispatch Optimizer (CVRP)</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Partitions multi-customer consignments across available fleet vehicles minimizing total road distance and diesel costs, respecting individual truck payload limits (Q_k).
                </p>
              </div>

              <button
                onClick={runVrpOptimization}
                disabled={vrpLoading}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50 transition-all flex-shrink-0"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{vrpLoading ? 'Solving with OR-Tools...' : 'Run Google OR-Tools CVRP'}</span>
              </button>
            </div>
          </div>

          {/* Interactive CVRP Dispatch Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Depot & Stop Builder */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" /> Central Dispatch Depot
                </label>
                <select
                  value={vrpDepot}
                  onChange={(e) => setVrpDepot(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs rounded-xl p-2.5 outline-none"
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.name}>{h.name} - {h.city}</option>
                  ))}
                  {hubs.length === 0 && (
                    <option value="Mumbai (JNPT)">Mumbai (JNPT Port)</option>
                  )}
                </select>
              </div>

              {/* Delivery Stops Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Customer Delivery Stops ({vrpStops.length})
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {vrpStops.map((stop, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="font-bold text-slate-200">#{i+1} {stop.name}</span>
                        <div className="text-[10px] text-cyan-400 font-mono">{stop.cargo_weight_kg} kg cargo</div>
                      </div>
                      <button
                        onClick={() => handleRemoveStop(i)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded"
                        title="Remove stop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Stop Form */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] text-slate-400 font-medium block">Add Destination Stop</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newStopHub}
                      onChange={(e) => setNewStopHub(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2 outline-none"
                    >
                      <option value="">Select Hub</option>
                      {hubs.map((h) => (
                        <option key={h.id} value={h.name}>{h.city}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={newStopWeight}
                      onChange={(e) => setNewStopWeight(e.target.value)}
                      placeholder="Demand (kg)"
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddStop}
                    disabled={!newStopHub}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Customer Stop
                  </button>
                </div>
              </div>

              {/* Fleet Selection */}
              <div className="pt-3 border-t border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-cyan-400" /> Assign Fleet Capacity
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {vehicles.map((v) => (
                    <label
                      key={v.id}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                        vrpSelectedVehicles.includes(v.id)
                          ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={vrpSelectedVehicles.includes(v.id)}
                          onChange={() => toggleVrpVehicle(v.id)}
                          className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                        />
                        <span className="font-mono font-bold">{v.license_plate}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{v.max_payload_kg} kg cap</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 2 Columns: OR-Tools Solution, Map, and Academic Benchmark */}
            <div className="lg:col-span-2 space-y-6">
              {/* Academic Benchmark Card */}
              {vrpResult?.academic_comparison && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Academic Optimization Benchmark (Viva Defense)</h4>
                        <p className="text-[11px] text-slate-400">
                          {vrpResult.academic_comparison.solver_algorithm} vs {vrpResult.academic_comparison.baseline_algorithm}
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      -{vrpResult.academic_comparison.distance_saved_pct}% Kilometers
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">OR-Tools Fleet Path</span>
                      <span className="text-lg font-black text-purple-400">
                        {vrpResult.academic_comparison.or_tools_total_distance_km} km
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Greedy Baseline</span>
                      <span className="text-lg font-black text-slate-400">
                        {vrpResult.academic_comparison.baseline_total_distance_km} km
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Fuel Cost Saved</span>
                      <span className="text-lg font-black text-emerald-400">
                        ₹{vrpResult.academic_comparison.operating_cost_saved_inr.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">CO2 Prevented</span>
                      <span className="text-lg font-black text-cyan-400">
                        {vrpResult.academic_comparison.carbon_emissions_prevented_kg} kg
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>{vrpResult.academic_comparison.viva_talking_point}</span>
                  </div>
                </div>
              )}

              {/* Leaflet Multi-Vehicle Route Map */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-white uppercase tracking-wider">
                    Partitioned Multi-Vehicle Route Geometry
                  </span>
                  <span className="text-slate-400 font-mono">
                    {vrpResult?.vehicle_routes?.length || 0} Vehicle Corridors
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-800 relative z-0 h-80">
                  <MapContainer
                    center={[19.5, 76.5]}
                    zoom={5}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%', background: '#0b1120' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Depot Marker */}
                    <Marker
                      position={[18.9496, 72.9525]}
                      icon={createDepotIcon(vrpDepot)}
                    >
                      <Popup>Central Dispatch Depot: {vrpDepot}</Popup>
                    </Marker>

                    {/* Customer Stop Pins */}
                    {vrpStops.map((stop, i) => (
                      <Marker
                        key={`stop-${i}`}
                        position={[
                          hubs.find(h => h.name === stop.name)?.latitude || 18.5 + (i * 0.8),
                          hubs.find(h => h.name === stop.name)?.longitude || 73.5 + (i * 0.8)
                        ]}
                        icon={createStopIcon(i+1, stop.name)}
                      >
                        <Popup>
                          <div className="font-bold text-xs">Stop #{i+1}: {stop.name}</div>
                          <div className="text-[10px] text-slate-600">Cargo Demand: {stop.cargo_weight_kg} kg</div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Vehicle Polylines */}
                    {vrpResult?.vehicle_routes?.map((vRoute, idx) => (
                      vRoute.route_geometry && vRoute.route_geometry.length > 0 && (
                        <Polyline
                          key={`vrp-poly-${idx}`}
                          positions={vRoute.route_geometry}
                          pathOptions={{
                            color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
                            weight: 5,
                            opacity: 0.85
                          }}
                        >
                          <Tooltip sticky>
                            Truck: {vRoute.license_plate} ({vRoute.total_distance_km} km • {vRoute.payload_utilized_kg} kg)
                          </Tooltip>
                        </Polyline>
                      )
                    ))}
                  </MapContainer>
                </div>
              </div>

              {/* Stop-by-Stop Dispatch Schedule */}
              {vrpResult?.vehicle_routes && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Vehicle Dispatch Schedules & Payload Utilization
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {vrpResult.vehicle_routes.map((vRoute, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ background: ROUTE_COLORS[idx % ROUTE_COLORS.length] }}
                            ></span>
                            <span className="font-mono font-bold text-white text-xs">
                              {vRoute.license_plate}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-purple-400">
                            {vRoute.total_distance_km} km • {vRoute.total_duration_hours} hrs
                          </span>
                        </div>

                        {/* Capacity Utilization Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Payload Utilized:</span>
                            <span className="font-mono font-bold text-slate-200">
                              {vRoute.payload_utilized_kg} / {vRoute.max_payload_kg} kg ({vRoute.payload_utilization_pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, vRoute.payload_utilization_pct)}%`,
                                background: ROUTE_COLORS[idx % ROUTE_COLORS.length]
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Visited Stops Sequence */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Visiting Sequence</span>
                          {vRoute.stops.map((st, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between text-[11px] text-slate-300">
                              <span className="truncate max-w-[150px]">
                                {st.is_depot ? '🏢 ' : `${st.stop_index}. `}{st.location_name}
                              </span>
                              <span className="font-mono text-slate-500 text-[10px]">
                                {st.cumulative_load_kg} kg cumul.
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: 3D Cargo / Bin Packing Heuristic Engine */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">3D Cargo / Bin Packing Heuristic (First-Fit Decreasing)</h3>
                  <p className="text-xs text-slate-400">
                    Calculates container cubic volume fill, axle load distribution, and 3D spatial box placement.
                  </p>
                </div>
              </div>

              <button
                onClick={runCargoPacking}
                disabled={packingLoading}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all"
              >
                <Package className="w-4 h-4" />
                <span>{packingLoading ? 'Simulating Packing...' : 'Run 3D Cargo Packer'}</span>
              </button>
            </div>

            {/* Packing Results View */}
            {packingResult && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Volumetric Efficiency</span>
                    <span className="text-2xl font-black text-cyan-400">
                      {packingResult.summary.volumetric_efficiency_pct}%
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {packingResult.summary.total_packed_volume_m3} / {packingResult.container_profile.total_volume_m3} m³
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Weight Capacity Fill</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {packingResult.summary.weight_utilization_pct}%
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {packingResult.summary.total_packed_weight_kg} / {packingResult.container_profile.max_payload_kg} kg
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Axle Balance Score</span>
                    <span className="text-2xl font-black text-purple-400">
                      {packingResult.summary.axle_balance_score}/100
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Optimal Chassis Distribution</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Consignments Packed</span>
                    <span className="text-2xl font-black text-white">
                      {packingResult.summary.boxes_packed_count} <span className="text-xs text-slate-500 font-normal">/ {packingResult.summary.total_boxes_requested}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{packingResult.summary.packing_density_category}</span>
                  </div>
                </div>

                {/* Spatial Layout Coordinates Table */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Computed 3D Spatial Shelf Coordinates (cm)</span>
                    <span className="font-mono text-[10px] text-slate-500">Origin: Front-Bottom-Left (0, 0, 0)</span>
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                          <th className="pb-2">Box ID & Label</th>
                          <th className="pb-2">Dimensions (L x W x H)</th>
                          <th className="pb-2">Weight</th>
                          <th className="pb-2 font-mono text-cyan-400">Placement (X, Y, Z)</th>
                          <th className="pb-2 text-right">Handling</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300">
                        {packingResult.packed_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="py-2.5 font-medium flex items-center gap-1.5">
                              <Box className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{item.label}</span>
                            </td>
                            <td className="py-2.5 font-mono text-slate-400">
                              {item.length_cm} × {item.width_cm} × {item.height_cm} cm
                            </td>
                            <td className="py-2.5 font-mono">{item.weight_kg} kg</td>
                            <td className="py-2.5 font-mono font-bold text-cyan-300">
                              ({item.position_x_cm}, {item.position_y_cm}, {item.position_z_cm})
                            </td>
                            <td className="py-2.5 text-right">
                              {item.fragile ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  FRAGILE
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">Standard</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPredictions;
