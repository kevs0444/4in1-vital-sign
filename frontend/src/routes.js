// src/routes.js
import React from "react";
import { Routes, Route } from "react-router-dom";

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
import FlowTesting from "./pages/Dashboards/Admin/FlowTesting/FlowTesting";
import Maintenance from "./pages/Dashboards/Admin/Maintenance/Maintenance";

// 💤 Standby & 404
import Standby from "./pages/Standby/Standby";
import NotFound from "./pages/NotFound/NotFound";

function AppRoutes() {
  return (
    <Routes>
      {/* 🩺 Measurement Flow */}
      <Route path="/" element={<Standby />} /> {/* Default route */}
      <Route path="/measure/welcome" element={<MeasurementWelcome />} />
      <Route path="/measure/starting" element={<Starting />} />
      <Route path="/measure/ai-loading" element={<AILoading />} />
      <Route path="/measure/bloodpressure" element={<BloodPressure />} />
      <Route path="/measure/bmi" element={<BMI />} />
      <Route path="/measure/bodytemp" element={<BodyTemp />} />
      <Route path="/measure/max30102" element={<Max30102 />} />
      <Route path="/measure/result" element={<Result />} />
      <Route path="/measure/saving" element={<Saving />} />
      <Route path="/measure/sharing" element={<Sharing />} />

      {/* 🧾 Register Flow */}
      <Route path="/register/welcome" element={<RegisterWelcome />} />
      <Route path="/register/role" element={<RegisterRole />} />
      <Route path="/register/tapid" element={<RegisterTapID />} />
      <Route path="/register/personal-info" element={<RegisterPersonalInfo />} />
      <Route path="/register/saved" element={<RegisterDataSaved />} />

      {/* 🧭 Dashboards */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
      <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
      <Route path="/nurse/dashboard" element={<NurseDashboard />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/admin/flowtesting" element={<FlowTesting />} />
      <Route path="/admin/maintenance" element={<Maintenance />} />

      {/* 🚫 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;