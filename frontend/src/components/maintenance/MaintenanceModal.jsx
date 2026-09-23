import React, { useState } from 'react';
import { X, Wrench, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';

const MaintenanceModal = ({ isOpen, onClose, onSaved, vehicles = [] }) => {
  const [formData, setFormData] = useState({
    vehicle_id: '',
    service_type: 'SCHEDULED_GENERAL',
    status: 'SCHEDULED',
    description: '',
    cost: 350.0,
    service_center: 'Fleet Master Depot Service Bay',
    odometer_at_service: 50000,
    service_date: new Date().toISOString().split('T')[0],
    next_service_due_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    next_service_due_odometer: 60000,
    parts_replaced: '',
    technician_notes: '',
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
    const v = vehicles.find((item) => item.id === vId);
    setFormData((prev) => ({
      ...prev,
      vehicle_id: e.target.value,
      odometer_at_service: v ? v.odometer_km : prev.odometer_at_service,
      next_service_due_odometer: v ? v.odometer_km + 10000 : prev.next_service_due_odometer,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.vehicle_id || !formData.description) {
      setError('Please select a vehicle and enter a service description.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/maintenance', {
        ...formData,
        vehicle_id: parseInt(formData.vehicle_id),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record maintenance service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Schedule Workshop Maintenance</h2>
              <p className="text-xs text-slate-400">Log repair, inspection, parts replacement, and service costs</p>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Vehicle *</label>
              <select
                required
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleVehicleSelect}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="">Select Fleet Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} - {v.make} {v.model} ({v.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Category</label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="OIL_CHANGE">Oil & Filter Change</option>
                <option value="BRAKE_INSPECTION">Brake Inspection / Pad Replacement</option>
                <option value="TIRE_ROTATION">Tire Rotation & Wheel Alignment</option>
                <option value="BATTERY_CHECK">Battery & Electrical Check</option>
                <option value="ENGINE_OVERHAUL">Engine & Transmission Check</option>
                <option value="SCHEDULED_GENERAL">Scheduled Preventive Service</option>
                <option value="EMERGENCY_REPAIR">Emergency Roadside Repair</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Maintenance Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress (Vehicle In Workshop)</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Description *</label>
              <input
                type="text"
                required
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g. 50,000 km preventive inspection, brake pad replacement"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Cost (₹ INR)</label>
              <input
                type="number"
                step="0.01"
                required
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Odometer at Service (km)</label>
              <input
                type="number"
                required
                name="odometer_at_service"
                value={formData.odometer_at_service}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Date</label>
              <input
                type="date"
                required
                name="service_date"
                value={formData.service_date}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Next Service Due Date</label>
              <input
                type="date"
                name="next_service_due_date"
                value={formData.next_service_due_date}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Parts Replaced (Optional)</label>
              <input
                type="text"
                name="parts_replaced"
                value={formData.parts_replaced}
                onChange={handleChange}
                placeholder="e.g. Brake pads, Oil filter, Spark plugs"
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
              {loading ? 'Saving...' : 'Save Maintenance Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;
