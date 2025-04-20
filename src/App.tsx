import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { IndustryProvider } from './contexts/IndustryContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import UpdateProfile from './pages/UpdateProfile';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import VerifyEmail from './pages/VerifyEmail';
import Loading from './components/Loading';
import ClientPortalLanding from './pages/ClientPortalLanding';
import ClientPortal from './pages/ClientPortal';
import ClientPortalOnboarding from './pages/ClientPortalOnboarding';

const BASE_PATH = import.meta.env.BASE_URL;

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <BrowserRouter basename={BASE_PATH}>
        <AuthProvider>
          <IndustryProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />

              {/* Private Routes */}
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/update-profile" element={<PrivateRoute><UpdateProfile /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />

              <Route path="/client-portal-landing" element={<ClientPortalLanding />} />
              <Route path="/client-portal/:slug" element={<ClientPortalLanding />} />
              <Route path="/client-portal/onboarding/:slug" element={<ClientPortalOnboarding />} />
              <Route path="/client-portal/dashboard/:slug" element={<ClientPortal />} />
              <Route path="/client-portal/dashboard" element={<ClientPortal />} />
            </Routes>
          </IndustryProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}
