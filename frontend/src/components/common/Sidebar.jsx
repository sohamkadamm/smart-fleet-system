import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Truck,
  UserCheck,
  MapPin,
  Compass,
  Fuel,
  Wrench,
  TrendingUp,
  BrainCircuit,
  Bell,
  BarChart3,
  FileSpreadsheet,
  Radio,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const getDashboardPath = () => {
    switch (user.role) {
      case 'ADMIN':
        return '/admin';
      case 'FLEET_MANAGER':
        return '/manager';
      case 'DRIVER':
        return '/driver';
      default:
        return '/login';
    }
  };

  const navSections = [
    {
      title: 'Operations & Dispatch',
      items: [
        {
          name: 'Control Center',
          path: getDashboardPath(),
          icon: LayoutDashboard,
          roles: ['ADMIN', 'FLEET_MANAGER', 'DRIVER'],
        },
        {
          name: 'Live GPS Telematics',
          path: '/gps-tracking',
          icon: Compass,
          roles: ['ADMIN', 'FLEET_MANAGER', 'DRIVER'],
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        },
        {
          name: 'Fleet Vehicles',
          path: '/vehicles',
          icon: Truck,
          roles: ['ADMIN', 'FLEET_MANAGER', 'DRIVER'],
        },
        {
          name: 'Drivers & CDL',
          path: '/drivers',
          icon: UserCheck,
          roles: ['ADMIN', 'FLEET_MANAGER'],
        },
        {
          name: 'Trips & Freight Dispatch',
          path: '/trips',
          icon: MapPin,
          roles: ['ADMIN', 'FLEET_MANAGER', 'DRIVER'],
        },
      ],
    },
    {
      title: 'Telemetry & Assets',
      items: [
        {
          name: 'Fuel & EV Charging',
          path: '/fuel',
          icon: Fuel,
          roles: ['ADMIN', 'FLEET_MANAGER', 'DRIVER'],
        },
        {
          name: 'Maintenance & Service',
          path: '/maintenance',
          icon: Wrench,
          roles: ['ADMIN', 'FLEET_MANAGER'],
        },
        {
          name: 'Driver Safety & Scores',
          path: '/performance',
          icon: TrendingUp,
          roles: ['ADMIN', 'FLEET_MANAGER', 'DRIVER'],
        },
      ],
    },
    {
      title: 'Intelligence & Compliance',
      items: [
        {
          name: 'AI Predictive Engine',
          path: '/ai-predictions',
          icon: BrainCircuit,
          roles: ['ADMIN', 'FLEET_MANAGER'],
          badge: 'AI',
          badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        },
        {
          name: 'Executive BI Analytics',
          path: '/analytics',
          icon: BarChart3,
          roles: ['ADMIN', 'FLEET_MANAGER'],
        },
        {
          name: 'Reports & Data Export',
          path: '/reports',
          icon: FileSpreadsheet,
          roles: ['ADMIN', 'FLEET_MANAGER'],
        },
        {
          name: 'Alerts & Notifications',
          path: '/notifications',
          icon: Bell,
          roles: ['ADMIN', 'FLEET_MANAGER', 'DRIVER'],
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      {/* Active Role Info Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
          Connected Environment
        </div>
        <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            {user.role === 'ADMIN' && 'Enterprise Administration'}
            {user.role === 'FLEET_MANAGER' && 'Operations Command'}
            {user.role === 'DRIVER' && 'Driver Telematics Portal'}
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="p-3 space-y-6">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter((item) =>
            item.roles.includes(user.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {section.title}
              </div>
              {visibleItems.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={iIdx}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-white" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Realtime API status footer */}
      <div className="mt-auto p-3.5 border-t border-slate-800/80 bg-slate-950/40 text-center">
        <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Realtime Telematics Feed Active</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">OBD-II • GPS Satellites Synchronized</p>
      </div>
    </aside>
  );
};

export default Sidebar;
