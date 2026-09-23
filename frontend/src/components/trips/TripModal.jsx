import React, { useState } from 'react';
import { X, MapPin, Truck, User, Package, Calendar, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';

const TripModal = ({ isOpen, onClose, onSaved, vehicles = [], drivers = [] }) => {
  const [formData, setFormData] = useState({
    trip_code: `TRIP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    origin: '',
    destination: '',
    cargo_type: 'General Industrial Freight',
    cargo_weight_kg: 5000,
    distance_km: 250,
    estimated_duration_hours: 4.0,
    vehicle_id: '',
    driver_id: '',
    status: 'SCHEDULED',
    scheduled_departure: new Date().toISOString().slice(0, 16),
    estimated_arrival: new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16),
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
      setError('Please select both an assigned Vehicle and Driver.');
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
              <p className="text-xs text-slate-400">Assign cargo, vehicle, driver, and delivery route</p>
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
                className="w-full bg-slate-950 border border-slate-700 font-mono text-blue-300 rounded-xl px-3.5 py-2 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Cargo Type</label>
              <input
                type="text"
                required
                name="cargo_type"
                value={formData.cargo_type}
                onChange={handleChange}
                placeholder="e.g. Perishable Groceries"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Origin Location *</label>
              <input
                type="text"
                required
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                placeholder="e.g. Chicago Logistics Depot"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Destination Location *</label>
              <input
                type="text"
                required
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="e.g. Detroit Auto Terminal"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Distance (km)</label>
              <input
                type="number"
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
                    {v.license_plate} - {v.make} {v.model} (Max {v.max_payload_kg}kg - {v.status})
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
                    {d.full_name} ({d.status} - Safety {d.safety_score}%)
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
