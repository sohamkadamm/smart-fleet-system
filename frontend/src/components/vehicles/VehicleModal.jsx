import React, { useState, useEffect } from 'react';
import { X, Truck, Shield, Fuel, Gauge, AlertCircle, Calendar } from 'lucide-react';
import apiClient from '../../api/client';

const initialFormData = {
  license_plate: '',
  vin: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  vehicle_type: 'TRUCK',
  fuel_type: 'DIESEL',
  fuel_capacity: 300,
  max_payload_kg: 10000,
  odometer_km: 0,
  status: 'AVAILABLE',
  insurance_number: '',
  insurance_expiry: '',
  puc_number: '',
  puc_expiry: '',
};

const VehicleModal = ({ isOpen, onClose, onSaved, editingVehicle }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingVehicle) {
      setFormData({
        license_plate: editingVehicle.license_plate || '',
        vin: editingVehicle.vin || '',
        make: editingVehicle.make || '',
        model: editingVehicle.model || '',
        year: editingVehicle.year || new Date().getFullYear(),
        vehicle_type: editingVehicle.vehicle_type || 'TRUCK',
        fuel_type: editingVehicle.fuel_type || 'DIESEL',
        fuel_capacity: editingVehicle.fuel_capacity || 100,
        max_payload_kg: editingVehicle.max_payload_kg || 5000,
        odometer_km: editingVehicle.odometer_km || 0,
        status: editingVehicle.status || 'AVAILABLE',
        insurance_number: editingVehicle.insurance_number || '',
        insurance_expiry: editingVehicle.insurance_expiry ? editingVehicle.insurance_expiry.split('T')[0] : '',
        puc_number: editingVehicle.puc_number || '',
        puc_expiry: editingVehicle.puc_expiry ? editingVehicle.puc_expiry.split('T')[0] : '',
      });
    } else {
      setFormData(initialFormData);
    }
    setError('');
  }, [editingVehicle, isOpen]);

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
    setLoading(true);

    try {
      const payload = {
        ...formData,
        insurance_expiry: formData.insurance_expiry || null,
        puc_expiry: formData.puc_expiry || null,
        insurance_number: formData.insurance_number || null,
        puc_number: formData.puc_number || null,
      };

      if (editingVehicle) {
        await apiClient.put(`/vehicles/${editingVehicle.id}`, payload);
      } else {
        await apiClient.post('/vehicles', payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save vehicle. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingVehicle ? 'Edit Vehicle Profile' : 'Register New Fleet Vehicle'}
              </h2>
              <p className="text-xs text-slate-400">
                {editingVehicle ? `Updating vehicle ${editingVehicle.license_plate}` : 'Add a new vehicle to the operational fleet inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Vehicle Identifiers */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> 1. Vehicle Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">License Plate *</label>
                <input
                  type="text"
                  required
                  name="license_plate"
                  value={formData.license_plate}
                  onChange={handleChange}
                  placeholder="e.g. FL-TRK-101"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">VIN (Chassis No.) *</label>
                <input
                  type="text"
                  required
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  placeholder="e.g. 1V9HG8392KL001201"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Manufacturer Make *</label>
                <input
                  type="text"
                  required
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  placeholder="e.g. Volvo, Ford, Scania"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g. FH16 Heavy, Transit Van"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Year of Manufacture</label>
                <input
                  type="number"
                  name="year"
                  min="2000"
                  max="2030"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Vehicle Category</label>
                <select
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                >
                  <option value="TRUCK">Heavy Truck</option>
                  <option value="VAN">Delivery Van</option>
                  <option value="TRAILER">Trailer / Semi</option>
                  <option value="PICKUP">Pickup Truck</option>
                  <option value="CONTAINER">Container Carrier</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Fuel, Capacity & Status */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Fuel className="w-4 h-4" /> 2. Fuel, Payload & Operational Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fuel / Energy Type</label>
                <select
                  name="fuel_type"
                  value={formData.fuel_type}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                >
                  <option value="DIESEL">Diesel</option>
                  <option value="PETROL">Petrol</option>
                  <option value="ELECTRIC">Electric (EV)</option>
                  <option value="CNG">CNG</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tank/Battery Cap. ({formData.fuel_type === 'ELECTRIC' ? 'kWh' : 'Liters'})
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="fuel_capacity"
                  value={formData.fuel_capacity}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Max Payload (kg)</label>
                <input
                  type="number"
                  name="max_payload_kg"
                  value={formData.max_payload_kg}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Current Odometer (km)</label>
                <input
                  type="number"
                  step="0.1"
                  name="odometer_km"
                  value={formData.odometer_km}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Operational Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                >
                  <option value="AVAILABLE">AVAILABLE (Ready for Trip)</option>
                  <option value="ON_TRIP">ON TRIP (En Route)</option>
                  <option value="IN_MAINTENANCE">IN MAINTENANCE (Workshop)</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED (Out of Fleet)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Compliance, Insurance & PUC */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> 3. Compliance & Regulatory Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Insurance Policy Number</label>
                <input
                  type="text"
                  name="insurance_number"
                  value={formData.insurance_number}
                  onChange={handleChange}
                  placeholder="e.g. POL-88219-FL"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Insurance Expiry Date</label>
                <input
                  type="date"
                  name="insurance_expiry"
                  value={formData.insurance_expiry}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">PUC Certificate ID</label>
                <input
                  type="text"
                  name="puc_number"
                  value={formData.puc_number}
                  onChange={handleChange}
                  placeholder="e.g. PUC-DL-9921"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">PUC Expiry Date</label>
                <input
                  type="date"
                  name="puc_expiry"
                  value={formData.puc_expiry}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>{editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleModal;
