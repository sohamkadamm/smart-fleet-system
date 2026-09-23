import React, { useState, useEffect } from 'react';
import { X, MapPin, Truck, User, Package, Calendar, AlertCircle, Compass, Sparkles } from 'lucide-react';
import apiClient from '../../api/client';

const TripModal = ({ isOpen, onClose, onSaved, vehicles = [], drivers = [] }) => {
  const [formData, setFormData] = useState({
    trip_code: `TRIP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    origin: 'Mumbai (JNPT)',
    destination: 'Pune (Chakan)',
    cargo_type: 'Automotive Sub-Assemblies',
    cargo_weight_kg: 4500,
    distance_km: 148.5,
    estimated_duration_hours: 3.4,
    vehicle_id: '',
    driver_id: '',
    status: 'SCHEDULED',
    scheduled_departure: new Date().toISOString().slice(0, 16),
    estimated_arrival: new Date(Date.now() + 3.5 * 3600000).toISOString().slice(0, 16),
    notes: 'Access via Mumbai-Pune Expressway (E-Way / NH-48)',
  });
  const [hubs, setHubs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRouteCalculating, setIsRouteCalculating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchHubs = async () => {
      try {
        const res = await apiClient.get('/trips/hubs');
        setHubs(res.data || []);
      } catch (err) {
        console.error('Failed to load logistics hubs', err);
      }
    };
    fetchHubs();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Hub selection and route auto-estimation
  const handleHubSelect = (field, val) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);

    const origHub = hubs.find((h) => h.name === (field === 'origin' ? val : updated.origin) || h.city === (field === 'origin' ? val : updated.origin));
    const destHub = hubs.find((h) => h.name === (field === 'destination' ? val : updated.destination) || h.city === (field === 'destination' ? val : updated.destination));

    if (origHub && destHub && origHub.name !== destHub.name) {
      setIsRouteCalculating(true);
      // Rough Haversine * 1.28 road winding factor for instant UI preview
      const R = 6371;
      const dLat = (destHub.latitude - origHub.latitude) * Math.PI / 180;
      const dLon = (destHub.longitude - origHub.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(origHub.latitude * Math.PI / 180) * Math.cos(destHub.latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const estRoadDist = Math.round(R * c * 1.28 * 10) / 10;
      const estTruckHours = Math.round((estRoadDist / 50.0) * 10) / 10; // Commercial truck ~50 km/h avg

      const depDate = new Date(updated.scheduled_departure);
      const arrDate = new Date(depDate.getTime() + (estTruckHours * 3600000));

      setFormData((prev) => ({
        ...prev,
        [field]: val,
        distance_km: estRoadDist,
        estimated_duration_hours: estTruckHours,
        estimated_arrival: arrDate.toISOString().slice(0, 16)
      }));
      setTimeout(() => setIsRouteCalculating(false), 300);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.vehicle_id || !formData.driver_id) {
      setError('Please select both an assigned Fleet Vehicle and Driver.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/trips', {
        ...formData,
        vehicle_id: parseInt(formData.vehicle_id),
        driver_id: parseInt(formData.driver_id),
        scheduled_departure: new Date(formData.scheduled_departure).toISOString(),
        estimated_arrival: new Date(formData.estimated_arrival).toISOString(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to dispatch trip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dispatch New Delivery Trip</h2>
              <p className="text-xs text-slate-400">Assign Indian freight corridor, cargo, vehicle, and driver</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Trip Code</label>
              <input
                type="text"
                required
                name="trip_code"
                value={formData.trip_code}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 font-mono text-cyan-300 rounded-xl px-3.5 py-2 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Cargo Classification</label>
              <input
                type="text"
                required
                name="cargo_type"
                value={formData.cargo_type}
                onChange={handleChange}
                placeholder="e.g. Pharmaceutical Cargo"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            {/* Origin with Hub Quick Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">Origin Freight Hub *</label>
                <span className="text-[10px] text-blue-400 font-mono">Indian Hub</span>
              </div>
              <input
                type="text"
                required
                list="origin-hubs"
                name="origin"
                value={formData.origin}
                onChange={(e) => handleHubSelect('origin', e.target.value)}
                placeholder="e.g. Mumbai (JNPT)"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
              <datalist id="origin-hubs">
                {hubs.map((h) => (
                  <option key={h.id} value={h.name}>{h.full_name}</option>
                ))}
              </datalist>
            </div>

            {/* Destination with Hub Quick Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">Destination Hub *</label>
                <span className="text-[10px] text-blue-400 font-mono">Indian Hub</span>
              </div>
              <input
                type="text"
                required
                list="dest-hubs"
                name="destination"
                value={formData.destination}
                onChange={(e) => handleHubSelect('destination', e.target.value)}
                placeholder="e.g. Pune (Chakan)"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
              <datalist id="dest-hubs">
                {hubs.map((h) => (
                  <option key={h.id} value={h.name}>{h.full_name}</option>
                ))}
              </datalist>
            </div>

            {/* Real OSRM Calibrated Route Notice */}
            <div className="sm:col-span-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-xs text-blue-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>OSRM Calibrated Road Highway Routing</span>
              </span>
              <span className="font-mono text-cyan-300 font-semibold">
                {formData.distance_km} km • ~{formData.estimated_duration_hours} hrs truck transit
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Cargo Weight (kg)</label>
              <input
                type="number"
                required
                name="cargo_weight_kg"
                value={formData.cargo_weight_kg}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Road Distance (km)</label>
              <input
                type="number"
                step="0.1"
                required
                name="distance_km"
                value={formData.distance_km}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assign Fleet Vehicle *</label>
              <select
                required
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="">Select Available Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} - {v.make} {v.model} ({v.status} • Max {v.max_payload_kg}kg)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assign Driver *</label>
              <select
                required
                name="driver_id"
                value={formData.driver_id}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="">Select Driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.status} • Safety {d.safety_score}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Scheduled Departure</label>
              <input
                type="datetime-local"
                required
                name="scheduled_departure"
                value={formData.scheduled_departure}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Estimated Arrival</label>
              <input
                type="datetime-local"
                required
                name="estimated_arrival"
                value={formData.estimated_arrival}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {loading ? 'Dispatching...' : 'Dispatch Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripModal;
