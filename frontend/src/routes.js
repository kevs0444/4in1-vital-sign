// src/routes.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 🧭 Layout Components
import Header from "./components/Header/Header";

// 💤 Standby
import Standby from "./pages/Standby/Standby";

// 🧍 Register Flow
import RegisterWelcome from "./pages/RegisterFlow/RegisterWelcome/RegisterWelcome";
import RegisterTapID from "./pages/RegisterFlow/RegisterTapID/RegisterTapID";
import RegisterRole from "./pages/RegisterFlow/RegisterRole/RegisterRole";
import RegisterPersonalInfo from "./pages/RegisterFlow/RegisterPersonalInfo/RegisterPersonalInfo";
import RegisterDataSaved from "./pages/RegisterFlow/RegisterDataSaved/RegisterDataSaved";

// ⚙️ Dashboards
import AdminDashboard from "./pages/Dashboards/Admin/AdminDashboard/AdminDashboard";
import FlowTesting from "./pages/Dashboards/Admin/FlowTesting/FlowTesting";
import Maintenance from "./pages/Dashboards/Admin/Maintenance/Maintenance";

import DoctorDashboard from "./pages/Dashboards/Doctor/DoctorDashboard/DoctorDashboard";
import EmployeeDashboard from "./pages/Dashboards/Employee/EmployeeDashboard/EmployeeDashboard";
import NurseDashboard from "./pages/Dashboards/Nurse/NurseDashboard/NurseDashboard";
import StudentDashboard from "./pages/Dashboards/Student/StudentDashboard/StudentDashboard";

// 🩺 Measurement Flow
import MeasurementWelcome from "./pages/MeasurementFlow/MeasurementWelcome/MeasurementWelcome";
import Starting from "./pages/MeasurementFlow/Starting/Starting";
import BMI from "./pages/MeasurementFlow/BMI/BMI";
import BodyTemp from "./pages/MeasurementFlow/BodyTemp/BodyTemp";
import BloodPressure from "./pages/MeasurementFlow/BloodPressure/BloodPressure";
import Max30102 from "./pages/MeasurementFlow/Max30102/Max30102";
import AILoading from "./pages/MeasurementFlow/AILoading/AILoading";
import Result from "./pages/MeasurementFlow/Result/Result";
import Saving from "./pages/MeasurementFlow/Saving/Saving";
import Sharing from "./pages/MeasurementFlow/Sharing/Sharing";

// 🚫 404 Page
import NotFound from "./pages/NotFound/NotFound";

function AppRoutes() {
  return (
    <Router>
      <Header />
      <Routes>
        {/* 💤 Standby */}
        <Route path="/" element={<Standby />} />

        {/* 🧍 Register Flow */}
        <Route path="/register/welcome" element={<RegisterWelcome />} />
        <Route path="/register/tapid" element={<RegisterTapID />} />
        <Route path="/register/role" element={<RegisterRole />} />
        <Route path="/register/personalinfo" element={<RegisterPersonalInfo />} />
        <Route path="/register/datasaved" element={<RegisterDataSaved />} />

        {/* ⚙️ Dashboards */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/flowtesting" element={<FlowTesting />} />
        <Route path="/admin/maintenance" element={<Maintenance />} />

        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/nurse/dashboard" element={<NurseDashboard />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />

        {/* 🩺 Measurement Flow */}
        <Route path="/measurement/welcome" element={<MeasurementWelcome />} />
        <Route path="/measurement/starting" element={<Starting />} />
        <Route path="/measurement/bmi" element={<BMI />} />
        <Route path="/measurement/bodytemp" element={<BodyTemp />} />
        <Route path="/measurement/bloodpressure" element={<BloodPressure />} />
        <Route path="/measurement/max30102" element={<Max30102 />} />
        <Route path="/measurement/ailoading" element={<AILoading />} />
        <Route path="/measurement/result" element={<Result />} />
        <Route path="/measurement/saving" element={<Saving />} />
        <Route path="/measurement/sharing" element={<Sharing />} />

        {/* 🚫 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
