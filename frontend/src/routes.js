// src/routes.js (FIXED)
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// 🩺 Measurement Flow
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

// 🧾 Register Flow
import RegisterWelcome from "./pages/RegisterFlow/RegisterWelcome/RegisterWelcome";
import RegisterRole from "./pages/RegisterFlow/RegisterRole/RegisterRole";
import RegisterTapID from "./pages/RegisterFlow/RegisterTapID/RegisterTapID";
import RegisterPersonalInfo from "./pages/RegisterFlow/RegisterPersonalInfo/RegisterPersonalInfo";
import RegisterDataSaved from "./pages/RegisterFlow/RegisterDataSaved/RegisterDataSaved";

// 🧭 Dashboards
import AdminDashboard from "./pages/Dashboards/Admin/AdminDashboard/AdminDashboard";
import DoctorDashboard from "./pages/Dashboards/Doctor/DoctorDashboard/DoctorDashboard";
import EmployeeDashboard from "./pages/Dashboards/Employee/EmployeeDashboard/EmployeeDashboard";
import NurseDashboard from "./pages/Dashboards/Nurse/NurseDashboard/NurseDashboard";
import StudentDashboard from "./pages/Dashboards/Student/StudentDashboard/StudentDashboard";
import Maintenance from "./pages/Dashboards/Admin/Maintenance/Maintenance";


// 🔐 Login
import LoginPage from "./pages/Login/Login";
import LoginRemote from "./pages/Remote/Login/LoginRemote";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ForgotPasswordRemote from "./pages/Remote/ForgotPassword/ForgotPasswordRemote";

// 💤 Standby & 404
import Standby from "./pages/Standby/Standby";
import StandbyRemote from "./pages/Remote/Standby/StandbyRemote";
import NotFound from "./pages/NotFound/NotFound";
import { isLocalDevice } from "./utils/network";

// Remote Register Components
import RegisterWelcomeRemote from "./pages/Remote/RegisterFlow/RegisterWelcome/RegisterWelcomeRemote";
import RegisterRoleRemote from "./pages/Remote/RegisterFlow/RegisterRole/RegisterRoleRemote";
import RegisterPersonalInfoRemote from "./pages/Remote/RegisterFlow/RegisterPersonalInfo/RegisterPersonalInfoRemote";
import RegisterTapIDRemote from "./pages/Remote/RegisterFlow/RegisterTapID/RegisterTapIDRemote";
import RegisterDataSavedRemote from "./pages/Remote/RegisterFlow/RegisterDataSaved/RegisterDataSavedRemote";

function AppRoutes() {
  return (
    <Routes>
      {/* 🏠 Default route - Auto-detects Kiosk vs Remote */}
      <Route path="/" element={isLocalDevice() ? <Standby /> : <StandbyRemote />} />

      {/* 🔐 Login */}
      <Route path="/login" element={isLocalDevice() ? <LoginPage /> : <LoginRemote />} />
      <Route path="/forgot-password" element={isLocalDevice() ? <ForgotPassword /> : <ForgotPasswordRemote />} />

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
      <Route path="/register/welcome" element={isLocalDevice() ? <RegisterWelcome /> : <RegisterWelcomeRemote />} />
      <Route path="/register/role" element={isLocalDevice() ? <RegisterRole /> : <RegisterRoleRemote />} />
      <Route path="/register/tapid" element={isLocalDevice() ? <RegisterTapID /> : <RegisterTapIDRemote />} />
      <Route path="/register/personal-info" element={isLocalDevice() ? <RegisterPersonalInfo /> : <RegisterPersonalInfoRemote />} />
      <Route path="/register/saved" element={isLocalDevice() ? <RegisterDataSaved /> : <RegisterDataSavedRemote />} />

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
  );
}

export default AppRoutes;