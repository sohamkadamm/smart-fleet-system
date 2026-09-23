import React from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import { Truck, LogOut, User, ShieldCheck, ShieldAlert, Navigation } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      case 'FLEET_MANAGER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Fleet Manager
          </span>
        );
      case 'DRIVER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Navigation className="w-3.5 h-3.5" />
            Driver
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight">SmartFleet</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">AI Ops</span>
          </div>
          <p className="text-xs text-slate-400">Logistics Optimization System</p>
        </div>
      </div>

      {/* User Actions & Notification Bell */}
      {user && (
        <div className="flex items-center gap-3 md:gap-4">
          <NotificationDropdown />

          <div className="flex items-center gap-3 pr-3 md:pr-4 border-r border-slate-800">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-slate-200">{user.full_name}</div>
              <div className="text-xs text-slate-400">{user.email}</div>
            </div>
            <div className="hidden md:block ml-2">
              {getRoleBadge(user.role)}
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-red-400 bg-slate-800/80 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-lg transition-all"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
