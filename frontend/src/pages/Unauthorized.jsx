import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleReturn = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'ADMIN') navigate('/admin');
    else if (user.role === 'FLEET_MANAGER') navigate('/manager');
    else navigate('/driver');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Your account role (<span className="text-blue-400 font-semibold">{user?.role || 'Guest'}</span>) does not have sufficient permissions to access this management area.
        </p>
        <button
          onClick={handleReturn}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to My Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
