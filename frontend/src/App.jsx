import { Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from './context/AuthContext.jsx';

import AuthLayout from './app/layouts/AuthLayout.jsx';
import AppLayout from './app/layouts/AppLayout.jsx';

import Login from './app/pages/Login.jsx';
import Register from './app/pages/Register.jsx';
import Dashboard from './app/pages/Dashboard.jsx';
import History from './app/pages/History.jsx';
import Settings from './app/pages/Settings.jsx';
import SubmissionDetail from './app/pages/SubmissionDetail.jsx';

// ⬇️ Import your new HomePage
import HomePage from './app/pages/HomePage.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
ProtectedRoute.propTypes = { children: PropTypes.node };

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return children;
}
PublicRoute.propTypes = { children: PropTypes.node };

export default function App() {
  return (
    <Routes>
      {/* 🏠 Public Home Page */}
      <Route path="/" element={<HomePage />} />

      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <Login />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthLayout>
              <Register />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Protected routes (after login) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
        <Route path="submissions/:id" element={<SubmissionDetail />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
