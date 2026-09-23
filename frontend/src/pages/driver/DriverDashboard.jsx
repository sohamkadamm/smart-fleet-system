import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  Navigation,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckSquare,
  Award,
  Truck,
  TrendingUp,
  Send,
  Loader2,
  X
} from 'lucide-react';

const DriverDashboard = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Issue Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', message: '' });
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tripsRes, scorecardRes] = await Promise.allSettled([
        apiClient.get('/trips/my'),
        apiClient.get('/performance/my')
      ]);

      if (tripsRes.status === 'fulfilled') {
        setTrips(tripsRes.value.data || []);
      }
      if (scorecardRes.status === 'fulfilled') {
        setScorecard(scorecardRes.value.data || null);
      }
    } catch (err) {
      setError('Unable to load driver data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  const handleUpdateStatus = async (tripId, newStatus) => {
    try {
      setActionLoading(true);
      await apiClient.patch(`/trips/${tripId}/status`, { status: newStatus });
      await fetchDriverData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update trip status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!issueForm.title.trim() || !issueForm.message.trim()) return;

    try {
      setReportSubmitting(true);
      await apiClient.post('/notifications/report-issue', issueForm);
      setReportSuccess(true);
      setIssueForm({ title: '', message: '' });
      setTimeout(() => {
        setReportSuccess(false);
        setIsReportModalOpen(false);
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const activeTrip = trips.find(t => t.status === 'IN_TRANSIT');
  const scheduledTrips = trips.filter(t => t.status === 'SCHEDULED');
  const pastTrips = trips.filter(t => t.status === 'DELIVERED' || t.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <Navigation className="w-3.5 h-3.5" /> Driver Workspace
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Hello, {user?.full_name || 'Driver'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Commercial Heavy Operations • Assigned Vehicle: {scorecard?.assigned_vehicle || 'Assigned per trip'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mr-3" />
          <span className="text-slate-300 text-sm font-medium">Loading driver workspace & assignments...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/40 border border-red-500/30 rounded-2xl text-red-200 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Active Trip Banner if IN_TRANSIT */}
          {activeTrip && (
            <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 animate-pulse">
                    🟢 ACTIVE IN-TRANSIT TRIP
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Trip #{activeTrip.trip_code}: {activeTrip.origin} ➔ {activeTrip.destination}
                  </h2>
                  <p className="text-slate-400 text-xs">
                    Cargo: {activeTrip.cargo_type} ({activeTrip.cargo_weight_kg.toLocaleString('en-IN')} kg) • Distance: {activeTrip.distance_km} km • Vehicle: {activeTrip.vehicle_plate || 'Assigned'}
                  </p>
                </div>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(activeTrip.id, 'DELIVERED')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  <CheckSquare className="w-5 h-5" />
                  <span>Complete Delivery</span>
                </button>
              </div>
            </div>
          )}

          {/* Performance & Scorecard Row */}
          {scorecard && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Scorecard Grade</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {scorecard.scorecard?.grade || 'A'} <span className="text-xs font-normal text-emerald-400">({scorecard.scorecard?.tier || 'Tier 1'})</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Composite: {scorecard.scorecard?.composite_score || 90}/100
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>On-Time Rate</span>
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-blue-400">
                  {scorecard.scorecard?.on_time_rate_pct != null ? `${scorecard.scorecard.on_time_rate_pct}%` : 'N/A'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Based on completed deliveries
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Safety Score</span>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400">
                  {scorecard.scorecard?.safety_score || 95}/100
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Telematics driver score
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Deliveries</span>
                  <Truck className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {scorecard.total_deliveries || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Rating: ⭐ {scorecard.star_rating || 4.8}
                </div>
              </div>
            </div>
          )}

          {/* Assigned Trips Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Your Assigned Dispatches & Trips
              </h2>
              <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                {trips.length} Total Assigned
              </span>
            </div>

            {/* Scheduled Trips */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Upcoming Scheduled Trips ({scheduledTrips.length})
              </h3>
              {scheduledTrips.length === 0 ? (
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500">
                  No upcoming scheduled trips assigned.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduledTrips.map((trip) => (
                    <div key={trip.id} className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {trip.trip_code}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {trip.scheduled_departure ? new Date(trip.scheduled_departure).toLocaleDateString('en-IN') : 'Scheduled'}
                        </span>
                      </div>

                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{trip.origin}</span>
                          <span className="text-slate-500">➔</span>
                          <span>{trip.destination}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {trip.cargo_type} • {trip.cargo_weight_kg.toLocaleString('en-IN')} kg • {trip.distance_km} km
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Vehicle: <strong className="text-slate-200">{trip.vehicle_plate || 'TBD'}</strong>
                        </span>
                        <button
                          disabled={actionLoading || Boolean(activeTrip)}
                          onClick={() => handleUpdateStatus(trip.id, 'IN_TRANSIT')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow transition-all disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Trip</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery History */}
            {pastTrips.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Recent Deliveries ({pastTrips.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-semibold">Trip</th>
                        <th className="pb-2 font-semibold">Route</th>
                        <th className="pb-2 font-semibold">Distance</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold">Delivered Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {pastTrips.slice(0, 5).map((trip) => (
                        <tr key={trip.id} className="text-slate-300">
                          <td className="py-2.5 font-mono text-emerald-400">{trip.trip_code}</td>
                          <td className="py-2.5 font-medium text-white">{trip.origin} ➔ {trip.destination}</td>
                          <td className="py-2.5">{trip.distance_km} km</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-2xs font-bold ${
                              trip.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {trip.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400">
                            {trip.actual_arrival ? new Date(trip.actual_arrival).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Report Issue Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Report Fleet or Route Issue
              </h3>
              <p className="text-xs text-slate-400">
                Notify fleet managers immediately regarding mechanical breakdowns, route delays, or checkpoint problems.
              </p>
            </div>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-200">Alert Dispatched to Fleet Managers</p>
              </div>
            ) : (
              <form onSubmit={handleReportIssue} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Issue Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engine Temperature High, Highway Blockage"
                    value={issueForm.title}
                    onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Details & Location</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Describe vehicle condition, exact highway km mark, or assistance needed..."
                    value={issueForm.message}
                    onChange={(e) => setIssueForm({ ...issueForm, message: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all disabled:opacity-50"
                  >
                    {reportSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Submit Alert</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
