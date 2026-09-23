import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  ShieldCheck,
  Truck,
  UserCheck,
  MapPin,
  Fuel,
  Wrench,
  BrainCircuit,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Compass,
  TrendingUp,
  BarChart3,
  Radio,
  FileSpreadsheet
} from 'lucide-react';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [userStats, vehStats, tripStats] = await Promise.all([
          apiClient.get('/auth/stats'),
          apiClient.get('/vehicles/stats/summary'),
          apiClient.get('/trips/stats/summary'),
        ]);
        setStats({
          users: userStats.data,
          vehicles: vehStats.data,
          trips: tripStats.data,
        });
      } catch (err) {
        console.error('Failed to load command center stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const quickLaunchCards = [
    {
      title: 'Live GPS Telematics',
      desc: 'Track moving fleet vehicles with realtime speed and OBD-II telemetry.',
      icon: Compass,
      path: '/gps-tracking',
      badge: 'Live Radar',
      color: 'from-blue-600/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
    },
    {
      title: 'Freight & Deliveries',
      desc: 'Active cargo shipments, origin-destination routing, and proof of delivery.',
      icon: MapPin,
      path: '/trips',
      badge: 'Active Transit',
      color: 'from-emerald-600/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      title: 'AI Predictive Engine',
      desc: 'Predictive component failure risk, fuel forecasts, and route optimizer.',
      icon: BrainCircuit,
      path: '/ai-predictions',
      badge: 'ML Engine',
      color: 'from-indigo-600/20 to-purple-500/10 border-indigo-500/30 text-indigo-400',
    },
    {
      title: 'Fleet Vehicles Registry',
      desc: 'Heavy haulers, electric vans, payload capacities, and PUC compliance.',
      icon: Truck,
      path: '/vehicles',
      badge: 'Assets',
      color: 'from-slate-800 to-slate-900 border-slate-700 text-slate-300',
    },
    {
      title: 'Maintenance & Service',
      desc: 'Workshop job cards, preventive maintenance reminders, and repair costs.',
      icon: Wrench,
      path: '/maintenance',
      badge: 'Workshop',
      color: 'from-amber-600/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    },
    {
      title: 'Executive BI Analytics',
      desc: 'Fleet utilization, 6-month delivery trends, and carbon spend breakdown.',
      icon: BarChart3,
      path: '/analytics',
      badge: 'Analytics',
      color: 'from-slate-800 to-slate-900 border-slate-700 text-slate-300',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Realtime Command Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Realtime Fleet Operations Command Active
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.full_name || 'Fleet Manager'}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Real-time synchronization active across all telematics channels, active transit corridors, and logistics hubs.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Active Transit</div>
              <div className="text-2xl font-black text-blue-400 mt-0.5">
                {stats?.trips?.in_transit_trips ?? '...'}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Fleet Vehicles</div>
              <div className="text-2xl font-black text-white mt-0.5">
                {stats?.vehicles?.total_vehicles ?? '...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch Control Hub */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Operations Control Centers
          </h2>
          <span className="text-xs text-slate-500">Live Telemetry Synchronized</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLaunchCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(card.path)}
                className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 border cursor-pointer hover:scale-[1.02] transition-all shadow-xl flex flex-col justify-between group space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Open Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
