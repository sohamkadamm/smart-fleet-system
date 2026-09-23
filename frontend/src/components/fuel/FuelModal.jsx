import React, { useState } from 'react';
import { X, Fuel, Zap, DollarSign, Gauge, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';

const FuelModal = ({ isOpen, onClose, onSaved, vehicles = [], drivers = [] }) => {
  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    fuel_quantity: 120,
    unit_cost: 1.48,
    odometer_km: 42500,
    station_name: 'Pilot Flying J Travel Plaza',
    invoice_number: `INV-FUEL-${Math.floor(1000 + Math.random() * 9000)}`,
    fuel_type: 'DIESEL',
    refill_date: new Date().toISOString().slice(0, 16),
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

  const handleVehicleSelect = (e) => {
    const vId = parseInt(e.target.value);
    const selectedV = vehicles.find((v) => v.id === vId);
    setFormData((prev) => ({
      ...prev,
      vehicle_id: e.target.value,
      fuel_type: selectedV ? selectedV.fuel_type : 'DIESEL',
      odometer_km: selectedV ? selectedV.odometer_km : prev.odometer_km,
      unit_cost: selectedV?.fuel_type === 'ELECTRIC' ? 0.18 : 1.48,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.vehicle_id) {
      setError('Please select a vehicle.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/fuel', {
        ...formData,
        vehicle_id: parseInt(formData.vehicle_id),
        driver_id: formData.driver_id ? parseInt(formData.driver_id) : null,
        refill_date: new Date(formData.refill_date).toISOString(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to log fuel refill.');
    } finally {
      setLoading(false);
    }
  };

  const totalCost = (formData.fuel_quantity * formData.unit_cost).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Fuel / Energy Refill</h2>
              <p className="text-xs text-slate-400">Log fuel volume, unit cost, and odometer reading</p>
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Select Fleet Vehicle *</label>
              <select
                required
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleVehicleSelect}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="">Choose Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} - {v.make} {v.model} ({v.fuel_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Driver (Optional)</label>
              <select
                name="driver_id"
                value={formData.driver_id}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="">Select Driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Volume ({formData.fuel_type === 'ELECTRIC' ? 'kWh' : 'Liters'}) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                name="fuel_quantity"
                value={formData.fuel_quantity}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Unit Rate (₹ per unit) *</label>
              <input
                type="number"
                step="0.01"
                required
                name="unit_cost"
                value={formData.unit_cost}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Odometer at Refill (km) *</label>
              <input
                type="number"
                step="0.1"
                required
                name="odometer_km"
                value={formData.odometer_km}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Fuel Station / Depot (IOCL / BPCL / HPCL / Jio-bp)</label>
              <input
                type="text"
                name="station_name"
                value={formData.station_name}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Cost Summary Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Computed Total Amount:</span>
            <span className="text-base font-bold text-emerald-400">₹{totalCost} INR</span>
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
              {loading ? 'Saving...' : 'Save Fuel Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FuelModal;
