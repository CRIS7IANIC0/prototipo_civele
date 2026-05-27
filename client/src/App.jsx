import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ClientDashboard from './pages/ClientDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import './styles/index.css';

function PrivateRoute({ children, requiredRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.rol !== requiredRole) {
    return <Navigate to={user.rol === 'cliente' ? '/cliente' : '/proveedor'} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={user.rol === 'cliente' ? '/cliente' : '/proveedor'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/cliente" element={<PrivateRoute requiredRole="cliente"><ClientDashboard /></PrivateRoute>} />
      <Route path="/proveedor" element={<PrivateRoute requiredRole="proveedor"><SupplierDashboard /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
