import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  Compass,
  Truck,
  Gauge,
  Zap,
  Fuel,
  Play,
  Pause,
  RefreshCw,
  Navigation,
  MapPin,
  ShieldAlert,
  Radio
} from 'lucide-react';

const LiveMapTracking = () => {
  const [gpsData, setGpsData] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [corridors, setCorridors] = useState(null);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchGPS = async () => {
    try {
      const [gpsRes, corrRes] = await Promise.all([
        apiClient.get('/gps/live'),
        apiClient.get('/gps/routes/corridors'),
      ]);
      setGpsData(gpsRes.data);
      setCorridors(corrRes.data);
      if (!selectedVehicle && gpsRes.data.length > 0) {
        setSelectedVehicle(gpsRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to load GPS telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGPS();
  }, []);

  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(fetchGPS, 3000);
    return () => clearInterval(interval);
  }, [isLiveActive]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
            <Compass className="w-3.5 h-3.5" /> Realtime GPS Telematics
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>GPS & Live Fleet Telematics</span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30 font-medium">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Feed
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time GPS coordinates, vehicle velocity, ignition telematics, and transit corridor tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
              isLiveActive
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isLiveActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isLiveActive ? 'Live Polling ON' : 'Paused'}</span>
          </button>

          <button
            onClick={fetchGPS}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
            title="Force Telematics Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Map Visualizer & Telematics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Map Canvas / Telematics Radar */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative flex flex-col min-h-[460px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Logistics Radar
              </span>
              <span className="text-[11px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                USA Midwest Network
              </span>
            </div>
            <span className="text-xs text-blue-400 font-mono">
              {gpsData.filter((g) => g.status === 'ON_TRIP').length} Moving Vehicles
            </span>
          </div>

          {/* Interactive Radar Grid Canvas */}
          <div className="flex-1 bg-slate-950/80 rounded-xl border border-slate-800/80 relative overflow-hidden flex items-center justify-center p-6 select-none">
            {/* Grid Lines */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #3b82f6 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            ></div>

            {/* Simulated Logistics Hub Markers */}
            {corridors?.hubs &&
              Object.entries(corridors.hubs).map(([key, hub], index) => {
                const positions = [
                  { top: '25%', left: '30%' }, // Chicago
                  { top: '20%', left: '75%' }, // Detroit
                  { top: '70%', left: '45%' }, // Indianapolis
                  { top: '65%', left: '80%' }, // Columbus
                  { top: '15%', left: '20%' }, // Milwaukee
                ];
                const pos = positions[index % positions.length];

                return (
                  <div
                    key={key}
                    className="absolute flex flex-col items-center pointer-events-none"
                    style={{ top: pos.top, left: pos.left }}
                  >
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 whitespace-nowrap bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                      {hub.name}
                    </span>
                  </div>
                );
              })}

            {/* Vehicle Markers */}
            {gpsData.map((v, i) => {
              const isSelected = selectedVehicle?.vehicle_id === v.vehicle_id;
              // Map simulated coordinates to radar space
              const topOffset = `${30 + (i * 18)}%`;
              const leftOffset = `${35 + (i * 15) + (v.speed_kmh > 0 ? (v.speed_kmh % 20) : 0)}%`;

              return (
                <div
                  key={v.vehicle_id}
                  onClick={() => setSelectedVehicle(v)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-1000 group z-20`}
                  style={{ top: topOffset, left: leftOffset }}
                >
                  <div
                    className={`relative p-2 rounded-2xl flex items-center gap-2 border shadow-xl transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-white text-white scale-110 shadow-blue-500/40 ring-4 ring-blue-500/20'
                        : v.status === 'ON_TRIP'
                        ? 'bg-blue-900/90 border-blue-400 text-blue-200'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span className="text-xs font-mono font-bold">{v.license_plate}</span>
                    {v.speed_kmh > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    )}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                    {v.speed_kmh} km/h • {v.location_name}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Click any vehicle pin to inspect live telematics
            </span>
            <span>Simulated Highway GPS Tracker v1.0</span>
          </div>
        </div>

        {/* Selected Vehicle Telematics Detail Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Telematics Inspector</h3>
                  <p className="text-[11px] text-slate-400">OBD-II Realtime Telemetry</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedVehicle?.status === 'ON_TRIP'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {selectedVehicle?.status || 'SELECT'}
              </span>
            </div>

            {selectedVehicle ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vehicle</span>
                  <div className="text-base font-bold text-white mt-0.5">
                    {selectedVehicle.make_model}
                  </div>
                  <div className="font-mono text-xs text-blue-400 font-bold">
                    {selectedVehicle.license_plate}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" /> Velocity
                    </span>
                    <div className="text-xl font-bold text-white mt-1">
                      {selectedVehicle.speed_kmh} <span className="text-xs font-normal text-slate-400">km/h</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      {selectedVehicle.fuel_type === 'ELECTRIC' ? (
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {selectedVehicle.fuel_type === 'ELECTRIC' ? 'Battery' : 'Fuel'}
                    </span>
                    <div className="text-xl font-bold text-white mt-1">
                      {selectedVehicle.battery_or_fuel_pct}%
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-mono text-slate-200 font-medium">
                      {selectedVehicle.latitude}, {selectedVehicle.longitude}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ignition Status:</span>
                    <span className="font-medium text-emerald-400">
                      {selectedVehicle.ignition_on ? '🟢 Engine Running' : '⚪ Parked'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                      Current Waypoint Location
                    </span>
                    <span className="text-slate-300 font-medium">{selectedVehicle.location_name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Select a vehicle from the radar to inspect live telematics.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Updated via GPS API: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapTracking;
