import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Scheduling = React.lazy(() => import('./pages/Scheduling'));
const Patients = React.lazy(() => import('./pages/Patients'));
const Doctor = React.lazy(() => import('./pages/Doctor'));
const Catalogues = React.lazy(() => import('./pages/Catalogues'));
const Consultations = React.lazy(() => import('./pages/Consultations'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Staff = React.lazy(() => import('./pages/Staff'));
const Insurance = React.lazy(() => import('./pages/Insurance'));
const Reports = React.lazy(() => import('./pages/Reports'));

function Protected({
  roles,
  children
}) {
  const {
    user
  } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return children;
}
function HomeRedirect() {
  const {
    user
  } = useAuth();
  return <Navigate
    to={user ? '/app' : '/login'}
    replace
  />;
}
export default function App() {
  return <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<div className="splash">Loading MedSync...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<Protected>
            <Layout />
          </Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="schedules" element={<Protected roles={['Receptionist']}>
              <Scheduling />
            </Protected>} />
            <Route path="patients" element={<Protected roles={['Receptionist', 'Doctor']}>
              <Patients />
            </Protected>} />
            <Route path="doctor" element={<Protected roles={['Doctor']}>
              <Doctor />
            </Protected>} />
            <Route path="catalogue" element={<Catalogues />} />
            <Route path="consultations" element={<Protected roles={['Receptionist']}>
              <Consultations />
            </Protected>} />
            <Route path="invoices" element={<Protected roles={['Receptionist']}>
              <Invoices />
            </Protected>} />
            <Route path="staff" element={<Protected roles={['Manager']}>
              <Staff />
            </Protected>} />
            <Route path="insurance" element={<Protected roles={['Manager']}>
              <Insurance />
            </Protected>} />
            <Route path="reports" element={<Protected roles={['Manager']}>
              <Reports />
            </Protected>} />
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </AuthProvider>;
}
