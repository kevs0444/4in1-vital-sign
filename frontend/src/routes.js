// src/routes.js (OPTIMIZED WITH LAZY LOADING)
import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// 🩺 Measurement Flow (Kiosk Only - Regular Imports)
import AILoading from "./pages/MeasurementFlow/AILoading/AILoading";
import BloodPressure from "./pages/MeasurementFlow/BloodPressure/BloodPressure";
import BMI from "./pages/MeasurementFlow/BMI/BMI";
import BodyTemp from "./pages/MeasurementFlow/BodyTemp/BodyTemp";
import Max30102 from "./pages/MeasurementFlow/Max30102/Max30102";
import MeasurementWelcome from "./pages/MeasurementFlow/MeasurementWelcome/MeasurementWelcome";
import Result from "./pages/MeasurementFlow/Result/Result";
import Saving from "./pages/MeasurementFlow/Saving/Saving";
import Sharing from "./pages/MeasurementFlow/Sharing/Sharing";
import Starting from "./pages/MeasurementFlow/Starting/Starting";
import Checklist from "./pages/MeasurementFlow/Checklist/Checklist";

// 🧾 Register Flow (Kiosk - Regular Imports)
import RegisterWelcome from "./pages/RegisterFlow/RegisterWelcome/RegisterWelcome";
import RegisterRole from "./pages/RegisterFlow/RegisterRole/RegisterRole";
import RegisterTapID from "./pages/RegisterFlow/RegisterTapID/RegisterTapID";
import RegisterPersonalInfo from "./pages/RegisterFlow/RegisterPersonalInfo/RegisterPersonalInfo";
import RegisterDataSaved from "./pages/RegisterFlow/RegisterDataSaved/RegisterDataSaved";

// 🧭 Dashboards (Shared - Regular Imports for now)
import AdminDashboard from "./pages/Dashboards/Admin/AdminDashboard/AdminDashboard";
import DoctorDashboard from "./pages/Dashboards/Doctor/DoctorDashboard/DoctorDashboard";
import EmployeeDashboard from "./pages/Dashboards/Employee/EmployeeDashboard/EmployeeDashboard";
import NurseDashboard from "./pages/Dashboards/Nurse/NurseDashboard/NurseDashboard";
import StudentDashboard from "./pages/Dashboards/Student/StudentDashboard/StudentDashboard";
import Maintenance from "./pages/Dashboards/Admin/Maintenance/Maintenance";

// 🔐 Login (Kiosk - Regular Imports)
import LoginPage from "./pages/Login/Login";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";

// 💤 Standby & 404 (Kiosk - Regular Imports)
import Standby from "./pages/Standby/Standby";
import NotFound from "./pages/NotFound/NotFound";
import { isLocalDevice } from "./utils/network";
import { AnimatePresence } from "framer-motion";

// ===========================================================
// 📱 REMOTE PAGES - LAZY LOADED (Code Splitting for Ngrok)
// These are only downloaded when a Remote user visits
// ===========================================================
const StandbyRemote = React.lazy(() => import("./pages/Remote/Standby/StandbyRemote"));
const LoginRemote = React.lazy(() => import("./pages/Remote/Login/LoginRemote"));
const ForgotPasswordRemote = React.lazy(() => import("./pages/Remote/ForgotPassword/ForgotPasswordRemote"));
const RegisterWelcomeRemote = React.lazy(() => import("./pages/Remote/RegisterFlow/RegisterWelcome/RegisterWelcomeRemote"));
const RegisterRoleRemote = React.lazy(() => import("./pages/Remote/RegisterFlow/RegisterRole/RegisterRoleRemote"));
const RegisterPersonalInfoRemote = React.lazy(() => import("./pages/Remote/RegisterFlow/RegisterPersonalInfo/RegisterPersonalInfoRemote"));
const RegisterTapIDRemote = React.lazy(() => import("./pages/Remote/RegisterFlow/RegisterTapID/RegisterTapIDRemote"));
const RegisterDataSavedRemote = React.lazy(() => import("./pages/Remote/RegisterFlow/RegisterDataSaved/RegisterDataSavedRemote"));

const RemoteTransition = React.lazy(() => import("./pages/Remote/RemoteTransition/RemoteTransition"));

// Loading fallback for lazy-loaded components
const LazyLoadingFallback = () => (
  <div style={{
    height: '100dvh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    color: '#64748b',
    fontSize: '1.1rem',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e2e8f0',
        borderTopColor: '#dc2626',
        borderRadius: '50%',
        margin: '0 auto 16px',
        animation: 'spin 1s linear infinite'
      }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

function AppRoutes() {
  const location = useLocation();

  // Helper to wrap generic remote components with Suspense for lazy loading
  const Remote = (Component) => (
    <Suspense fallback={<LazyLoadingFallback />}>
      <RemoteTransition>
        {Component}
      </RemoteTransition>
    </Suspense>
  );

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* 🏠 Default route - Auto-detects Kiosk vs Remote */}
        <Route path="/" element={isLocalDevice() ? <Standby /> : Remote(<StandbyRemote />)} />

        {/* 🔐 Login */}
        <Route path="/login" element={isLocalDevice() ? <LoginPage /> : Remote(<LoginRemote />)} />
        <Route path="/forgot-password" element={isLocalDevice() ? <ForgotPassword /> : Remote(<ForgotPasswordRemote />)} />

        {/* 🩺 Measurement Flow - Kiosk Only */}
        <Route path="/measure/welcome" element={isLocalDevice() ? <MeasurementWelcome /> : <Navigate to="/" />} />
        <Route path="/measure/starting" element={isLocalDevice() ? <Starting /> : <Navigate to="/" />} />
        <Route path="/measure/ai-loading" element={isLocalDevice() ? <AILoading /> : <Navigate to="/" />} />
        <Route path="/measure/checklist" element={isLocalDevice() ? <Checklist /> : <Navigate to="/" />} />
        <Route path="/measure/bloodpressure" element={isLocalDevice() ? <BloodPressure /> : <Navigate to="/" />} />
        <Route path="/measure/bmi" element={isLocalDevice() ? <BMI /> : <Navigate to="/" />} />
        <Route path="/measure/bodytemp" element={isLocalDevice() ? <BodyTemp /> : <Navigate to="/" />} />
        <Route path="/measure/max30102" element={isLocalDevice() ? <Max30102 /> : <Navigate to="/" />} />
        <Route path="/measure/result" element={isLocalDevice() ? <Result /> : <Navigate to="/" />} />
        <Route path="/measure/saving" element={isLocalDevice() ? <Saving /> : <Navigate to="/" />} />
        <Route path="/measure/sharing" element={isLocalDevice() ? <Sharing /> : <Navigate to="/" />} />

        {/* 🧾 Register Flow */}
        <Route path="/register/welcome" element={isLocalDevice() ? <RegisterWelcome /> : Remote(<RegisterWelcomeRemote />)} />
        <Route path="/register/role" element={isLocalDevice() ? <RegisterRole /> : Remote(<RegisterRoleRemote />)} />
        <Route path="/register/tapid" element={isLocalDevice() ? <RegisterTapID /> : Remote(<RegisterTapIDRemote />)} />
        <Route path="/register/personal-info" element={isLocalDevice() ? <RegisterPersonalInfo /> : Remote(<RegisterPersonalInfoRemote />)} />
        <Route path="/register/saved" element={isLocalDevice() ? <RegisterDataSaved /> : Remote(<RegisterDataSavedRemote />)} />

        {/* 🧭 Dashboards */}
        <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/nurse/dashboard" element={<NurseDashboard />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/admin/maintenance" element={<Maintenance />} />

        {/* 🚫 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

export default AppRoutes;