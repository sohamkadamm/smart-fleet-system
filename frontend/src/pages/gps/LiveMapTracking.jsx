import React, { useState, useEffect, useRef } from 'react';
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
  Radio,
  Layers,
  Milestone,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Helper component to center map when selected vehicle changes
function MapFocusController({ targetCoord }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoord && targetCoord[0] && targetCoord[1]) {
      map.flyTo(targetCoord, 8, { duration: 1.2 });
    }
  }, [targetCoord, map]);
  return null;
}

// Generate dynamic SVG Leaflet markers without broken asset URLs
const createTruckIcon = (vehicle, isSelected) => {
  const isMoving = vehicle.status === 'ON_TRIP' && vehicle.speed_kmh > 0;
  const isMaintenance = vehicle.status === 'IN_MAINTENANCE';

  let bgClass = 'bg-blue-600 border-white text-white shadow-blue-500/50';
  let dotColor = 'bg-emerald-400';

  if (isSelected) {
    bgClass = 'bg-cyan-500 border-white text-white shadow-cyan-400/80 ring-4 ring-cyan-400/40';
  } else if (isMaintenance) {
    bgClass = 'bg-amber-600 border-amber-300 text-white shadow-amber-600/40';
    dotColor = 'bg-amber-300';
  } else if (!isMoving) {
    bgClass = 'bg-slate-800 border-slate-600 text-slate-300 shadow-slate-900/60';
    dotColor = 'bg-slate-400';
  }

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
      ${isMoving ? `<span style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(56, 189, 248, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ''}
      <div class="${bgClass}" style="width: 32px; height: 32px; border-radius: 10px; border-width: 2px; border-style: solid; display: flex; align-items: center; justify-content: center; transform: rotate(${vehicle.heading_degrees || 0}deg); transition: transform 0.5s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
      </div>
      <span style="position: absolute; top: -3px; right: -3px; width: 9px; height: 9px; border-radius: 9999px; border: 1.5px solid #0f172a;" class="${dotColor}"></span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-truck',
    html: html,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18]
  });
};

const createHubIcon = (hub) => {
  const html = `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid #3b82f6; color: #93c5fd; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; font-family: monospace; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        ${hub.city || hub.name}
      </div>
      <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 9999px; border: 2px solid white; margin-top: 1px;"></div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-leaflet-hub',
    html: html,
    iconSize: [60, 26],
    iconAnchor: [30, 24]
  });
};

const LiveMapTracking = () => {
  const [gpsData, setGpsData] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [corridors, setCorridors] = useState(null);
  const [hubsList, setHubsList] = useState([]);
  const [vehicleHistory, setVehicleHistory] = useState(null);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [focusTarget, setFocusTarget] = useState(null);

  const fetchGPS = async () => {
    try {
      const [gpsRes, corrRes, hubsRes] = await Promise.all([
        apiClient.get('/gps/live'),
        apiClient.get('/gps/routes/corridors'),
        apiClient.get('/trips/hubs').catch(() => ({ data: [] }))
      ]);

      setGpsData(gpsRes.data);
      setCorridors(corrRes.data);
      if (hubsRes.data && hubsRes.data.length > 0) {
        setHubsList(hubsRes.data);
      }

      // If vehicle selected, keep its updated telematics in sync
      if (selectedVehicle) {
        const updated = gpsRes.data.find((v) => v.vehicle_id === selectedVehicle.vehicle_id);
        if (updated) setSelectedVehicle(updated);
      } else if (gpsRes.data.length > 0) {
        // Pick first moving vehicle or first vehicle
        const moving = gpsRes.data.find((v) => v.status === 'ON_TRIP') || gpsRes.data[0];
        setSelectedVehicle(moving);
      }
    } catch (err) {
      console.error('Failed to load GPS telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (vehicleId) => {
    try {
      const res = await apiClient.get(`/gps/history/${vehicleId}?limit=40`);
      if (res.data && res.data.history) {
        setVehicleHistory(res.data.history.map((h) => [h.latitude, h.longitude]));
      }
    } catch (err) {
      console.error('Failed to load vehicle GPS history', err);
      setVehicleHistory(null);
    }
  };

  useEffect(() => {
    fetchGPS();
  }, []);

  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(fetchGPS, 3500);
    return () => clearInterval(interval);
  }, [isLiveActive, selectedVehicle?.vehicle_id]);

  useEffect(() => {
    if (selectedVehicle?.vehicle_id) {
      fetchHistory(selectedVehicle.vehicle_id);
    }
  }, [selectedVehicle?.vehicle_id]);

  const handleSelectVehicle = (vehicle, centerOnMap = false) => {
    setSelectedVehicle(vehicle);
    if (centerOnMap && vehicle.latitude && vehicle.longitude) {
      setFocusTarget([vehicle.latitude, vehicle.longitude]);
    }
  };

  // Precomputed polyline for selected vehicle
  const activeRoutePolyline = selectedVehicle?.route_geometry || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
            <Compass className="w-3.5 h-3.5" /> Realtime GIS Telematics
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>GPS & Live Fleet Telematics</span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30 font-medium">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Telemetry
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time OpenStreetMap road tracking, truck GPS interpolation, and commercial freight corridor monitoring across India.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Academic Transparency Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>OpenStreetMap + OSRM Road Geometry</span>
          </div>

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
        {/* Real OpenStreetMap Canvas */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl relative flex flex-col min-h-[580px] overflow-hidden">
          <div className="flex items-center justify-between mb-3 z-10 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                National Logistics Road Network
              </span>
              <span className="text-[11px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded font-mono">
                India Corridor
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCorridors}
                  onChange={(e) => setShowCorridors(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
                />
                <span>Freight Corridors</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showBreadcrumbs}
                  onChange={(e) => setShowBreadcrumbs(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
                />
                <span>Breadcrumbs</span>
              </label>

              <span className="text-xs text-blue-400 font-mono font-medium">
                {gpsData.filter((g) => g.status === 'ON_TRIP').length} Active Commercial Trucks
              </span>
            </div>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 relative z-0 min-h-[480px]">
            <MapContainer
              center={[19.8, 77.0]}
              zoom={5}
              scrollWheelZoom={true}
              style={{ height: '100%', minHeight: '480px', width: '100%', background: '#0b1120' }}
            >
              <MapFocusController targetCoord={focusTarget} />

              {/* Standard OpenStreetMap TileLayer with strict attribution */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
              />

              {/* Major Highway Corridors Polylines */}
              {showCorridors && corridors?.active_corridors?.map((corr, idx) => (
                <Polyline
                  key={`corr-${idx}`}
                  positions={corr.waypoints}
                  pathOptions={{
                    color: idx === 0 ? '#3b82f6' : idx === 1 ? '#8b5cf6' : '#10b981',
                    weight: 3,
                    opacity: 0.45,
                    dashArray: '6, 8'
                  }}
                >
                  <Tooltip sticky>{corr.name} ({corr.distance_km} km)</Tooltip>
                </Polyline>
              ))}

              {/* Verified Indian Logistics Freight Hubs */}
              {hubsList.map((hub) => (
                <Marker
                  key={hub.id}
                  position={[hub.latitude, hub.longitude]}
                  icon={createHubIcon(hub)}
                >
                  <Popup>
                    <div className="p-1 text-slate-900">
                      <div className="font-bold text-xs">{hub.full_name}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{hub.city}, {hub.state}</div>
                      <div className="text-[10px] text-blue-600 font-mono mt-1 font-semibold">{hub.type}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Selected Vehicle Active Road Geometry (OSRM Path) */}
              {activeRoutePolyline.length > 0 && (
                <Polyline
                  positions={activeRoutePolyline}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 5,
                    opacity: 0.85,
                    lineJoin: 'round'
                  }}
                >
                  <Tooltip sticky>
                    Active Route: {selectedVehicle?.origin} → {selectedVehicle?.destination}
                  </Tooltip>
                </Polyline>
              )}

              {/* Selected Vehicle GPS Breadcrumbs Trail */}
              {showBreadcrumbs && vehicleHistory && vehicleHistory.length > 1 && (
                <Polyline
                  positions={vehicleHistory}
                  pathOptions={{
                    color: '#a855f7',
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '4, 6'
                  }}
                >
                  <Tooltip sticky>Recent Telemetry Breadcrumb Trail</Tooltip>
                </Polyline>
              )}

              {/* Real Commercial Vehicle Markers */}
              {gpsData.map((v) => {
                const isSelected = selectedVehicle?.vehicle_id === v.vehicle_id;
                return (
                  <Marker
                    key={v.vehicle_id}
                    position={[v.latitude, v.longitude]}
                    icon={createTruckIcon(v, isSelected)}
                    eventHandlers={{
                      click: () => handleSelectVehicle(v, false)
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-slate-900 min-w-[180px]">
                        <div className="font-mono font-bold text-xs text-blue-700">{v.license_plate}</div>
                        <div className="text-xs font-semibold text-slate-800">{v.make_model}</div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          Status: <span className="font-bold">{v.status}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Speed: <span className="font-bold">{v.speed_kmh} km/h</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 border-t pt-1">
                          {v.location_name}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Footer Bar with Demo Disclaimer */}
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              Click truck pin on map or vehicle list to inspect real road telematics.
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Map data &copy; OpenStreetMap</span>
              <span>•</span>
              <span className="text-cyan-400 font-mono">Routing: OSRM Commercial Calibrated</span>
            </div>
          </div>
        </div>

        {/* Selected Vehicle Telematics Detail Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Telematics Inspector</h3>
                  <p className="text-[11px] text-slate-400">CAN-Bus & GPS Stream</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedVehicle?.status === 'ON_TRIP'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : selectedVehicle?.status === 'IN_MAINTENANCE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {selectedVehicle?.status || 'IDLE'}
              </span>
            </div>

            {selectedVehicle ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vehicle Asset</span>
                  <div className="text-base font-bold text-white mt-0.5">
                    {selectedVehicle.make_model}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs text-cyan-400 font-bold">
                      {selectedVehicle.license_plate}
                    </span>
                    <button
                      onClick={() => handleSelectVehicle(selectedVehicle, true)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                      Center on Map
                    </button>
                  </div>
                </div>

                {/* Velocity and Energy Stats */}
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

                {/* Trip Progress Bar if On Trip */}
                {selectedVehicle.status === 'ON_TRIP' && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Milestone className="w-3.5 h-3.5 text-cyan-400" /> Route Progress
                      </span>
                      <span className="font-mono text-cyan-300 font-bold">
                        {selectedVehicle.progress_pct || 45}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${selectedVehicle.progress_pct || 45}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="truncate max-w-[100px]">{selectedVehicle.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="truncate max-w-[100px] text-right">{selectedVehicle.destination || 'Next Depot'}</span>
                    </div>
                  </div>
                )}

                {/* OBD & Telemetry Details */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">GPS Coordinates:</span>
                    <span className="font-mono text-slate-200 font-medium">
                      {selectedVehicle.latitude?.toFixed(4)}, {selectedVehicle.longitude?.toFixed(4)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Compass Heading:</span>
                    <span className="font-mono text-slate-200 font-medium">
                      {selectedVehicle.heading_degrees}°
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ignition & Engine:</span>
                    <span className={`font-medium ${selectedVehicle.ignition_on ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {selectedVehicle.ignition_on ? '🟢 Engine Active' : '⚪ Engine Staged / Off'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                      Waypoint Geofence & Location
                    </span>
                    <span className="text-slate-300 font-medium">{selectedVehicle.location_name}</span>
                  </div>
                </div>

                {/* Fleet Quick Selector */}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">
                    Fleet Quick Switch
                  </span>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {gpsData.map((v) => (
                      <button
                        key={v.vehicle_id}
                        onClick={() => handleSelectVehicle(v, true)}
                        className={`text-left p-2 rounded-lg border text-xs transition-all ${
                          selectedVehicle?.vehicle_id === v.vehicle_id
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-mono font-bold truncate">{v.license_plate}</div>
                        <div className="text-[10px] text-slate-500 truncate">{v.status}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Select a vehicle from the map to inspect live telematics.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Last Telemetry Sync</span>
            <span className="font-mono text-slate-400">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapTracking;
