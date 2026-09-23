import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Module 1 Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import Unauthorized from './pages/Unauthorized';

// Modules 2-12 Pages
import VehicleManagement from './pages/vehicles/VehicleManagement';       // Module 2
import DriverManagement from './pages/drivers/DriverManagement';         // Module 3
import TripManagement from './pages/trips/TripManagement';               // Module 4
import LiveMapTracking from './pages/gps/LiveMapTracking';               // Module 5
import FuelManagement from './pages/fuel/FuelManagement';                 // Module 6
import MaintenanceManagement from './pages/maintenance/MaintenanceManagement'; // Module 7
import DriverPerformance from './pages/performance/DriverPerformance';   // Module 8
import AIPredictions from './pages/ai/AIPredictions';                     // Module 9
import NotificationCenter from './pages/notifications/NotificationCenter'; // Module 10
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';   // Module 11
import ReportsExport from './pages/reports/ReportsExport';               // Module 12

const RootRedirector = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'FLEET_MANAGER') return <Navigate to="/manager" replace />;
  return <Navigate to="/driver" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Root Redirector */}
          <Route path="/" element={<RootRedirector />} />

          {/* Protected Routes for All Roles */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'FLEET_MANAGER', 'DRIVER']} />}>
            <Route path="/vehicles" element={<VehicleManagement />} />
            <Route path="/trips" element={<TripManagement />} />
            <Route path="/gps-tracking" element={<LiveMapTracking />} />
            <Route path="/fuel" element={<FuelManagement />} />
            <Route path="/performance" element={<DriverPerformance />} />
            <Route path="/notifications" element={<NotificationCenter />} />
          </Route>

          {/* Manager & Admin Only Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['FLEET_MANAGER', 'ADMIN']} />}>
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/drivers" element={<DriverManagement />} />
            <Route path="/maintenance" element={<MaintenanceManagement />} />
            <Route path="/ai-predictions" element={<AIPredictions />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/reports" element={<ReportsExport />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Driver Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['DRIVER', 'FLEET_MANAGER', 'ADMIN']} />}>
            <Route path="/driver" element={<DriverDashboard />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
