import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, Phone, Mail, Award, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';

const initialFormData = {
  full_name: '',
  email: '',
  phone: '',
  license_number: '',
  license_type: 'Class A Commercial CDL',
  license_expiry: '',
  experience_years: 4,
  emergency_contact: '',
  status: 'AVAILABLE',
  assigned_vehicle_id: '',
};

const DriverModal = ({ isOpen, onClose, onSaved, editingDriver, availableVehicles = [] }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingDriver) {
      setFormData({
        full_name: editingDriver.full_name || '',
        email: editingDriver.email || '',
        phone: editingDriver.phone || '',
        license_number: editingDriver.license_number || '',
        license_type: editingDriver.license_type || 'Class A Commercial CDL',
        license_expiry: editingDriver.license_expiry ? editingDriver.license_expiry.split('T')[0] : '',
        experience_years: editingDriver.experience_years || 3,
        emergency_contact: editingDriver.emergency_contact || '',
        status: editingDriver.status || 'AVAILABLE',
        assigned_vehicle_id: editingDriver.assigned_vehicle_id || '',
      });
    } else {
      setFormData(initialFormData);
    }
    setError('');
  }, [editingDriver, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        assigned_vehicle_id: formData.assigned_vehicle_id ? parseInt(formData.assigned_vehicle_id) : null,
      };

      if (editingDriver) {
        await apiClient.put(`/drivers/${editingDriver.id}`, payload);
      } else {
        await apiClient.post('/drivers', payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save driver profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingDriver ? 'Edit Driver Profile' : 'Onboard New Fleet Driver'}
              </h2>
              <p className="text-xs text-slate-400">
                {editingDriver ? `Updating ${editingDriver.full_name}` : 'Register driver certifications & assign fleet vehicle'}
              </p>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Robert Smith"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="robert@fleet.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Contact *</label>
              <input
                type="tel"
                required
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91-98112-54011"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Commercial Driving License (HMV / LMV-TR) *</label>
              <input
                type="text"
                required
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                placeholder="DL-0420180023419"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">License Expiry Date *</label>
              <input
                type="date"
                required
                name="license_expiry"
                value={formData.license_expiry}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Experience (Years)</label>
              <input
                type="number"
                name="experience_years"
                min="0"
                max="40"
                value={formData.experience_years}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Driver Shift Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="AVAILABLE">AVAILABLE (On Standby)</option>
                <option value="ON_DUTY">ON DUTY (Active Trip)</option>
                <option value="OFF_DUTY">OFF DUTY (Shift Off)</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Vehicle</label>
              <select
                name="assigned_vehicle_id"
                value={formData.assigned_vehicle_id}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              >
                <option value="">No Vehicle Assigned</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} - {v.make} {v.model} ({v.status})
                  </option>
                ))}
              </select>
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
              {loading ? 'Saving...' : editingDriver ? 'Update Driver' : 'Register Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverModal;
