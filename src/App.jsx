import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import FarmerDashboard from './pages/FarmerDashboard.jsx';
import BuyerDashboard from './pages/BuyerDashboard.jsx';

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('kisanmitr_user');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const RequireAuth = ({ role, children }) => {
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/farmer"
          element={
            <RequireAuth role="farmer">
              <FarmerDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/buyer"
          element={
            <RequireAuth role="buyer">
              <BuyerDashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
