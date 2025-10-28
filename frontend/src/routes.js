import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 🧭 Dashboards
import AdminDashboard from "./pages/Dashboards/AdminDashboard/AdminDashboard";
import DoctorDashboard from "./pages/Dashboards/DoctorDashboard/DoctorDashboard";
import EmployeeDashboard from "./pages/Dashboards/EmployeeDashboard/EmployeeDashboard";
import NurseDashboard from "./pages/Dashboards/NurseDashboard/NurseDashboard";
import StudentDashboard from "./pages/Dashboards/StudentDashboard/StudentDashboard";

// ⚙️ Measurement Flow
import AILoading from "./pages/MeasurementFlow/AILoading/AILoading";
import BloodPressure from "./pages/MeasurementFlow/BloodPressure/BloodPressure";
import BMI from "./pages/MeasurementFlow/BMI/BMI";
import BodyTemp from "./pages/MeasurementFlow/BodyTemp/BodyTemp";
import Max30102 from "./pages/MeasurementFlow/Max30102/Max30102";
import MeasurementTapID from "./pages/MeasurementFlow/MeasurementTapID/MeasurementTapID";
import MeasurementWelcome from "./pages/MeasurementFlow/MeasurementWelcome/MeasurementWelcome";
import Result from "./pages/MeasurementFlow/Result/Result";
import Saving from "./pages/MeasurementFlow/Saving/Saving";
import Sharing from "./pages/MeasurementFlow/Sharing/Sharing";
import Standby from "./pages/MeasurementFlow/Standby/Standby";
import Starting from "./pages/MeasurementFlow/Starting/Starting";

// 🧾 Register Flow
import RegisterDataSaved from "./pages/RegisterFlow/RegisterDataSaved/RegisterDataSaved";
import RegisterPersonalInfo from "./pages/RegisterFlow/RegisterPersonalInfo/RegisterPersonalInfo";
import RegisterTapID from "./pages/RegisterFlow/RegisterTapID/RegisterTapID";
import RegisterWelcome from "./pages/RegisterFlow/RegisterWelcome/RegisterWelcome";

// 👤 Role Selection
import Role from "./pages/Role/Role";

// 🚫 Not Found
import NotFound from "./pages/NotFound/NotFound";

// 🧩 Main App Router
const AppRoutes = () => {
  return (
    <Router>
      <Routes>

        {/* 🧭 Dashboards */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/nurse" element={<NurseDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />

        {/* ⚙️ Measurement Flow */}
        <Route path="/ai-loading" element={<AILoading />} />
        <Route path="/blood-pressure" element={<BloodPressure />} />
        <Route path="/bmi" element={<BMI />} />
        <Route path="/body-temp" element={<BodyTemp />} />
        <Route path="/max30102" element={<Max30102 />} />
        <Route path="/measurement-tapid" element={<MeasurementTapID />} />
        <Route path="/measurement-welcome" element={<MeasurementWelcome />} />
        <Route path="/result" element={<Result />} />
        <Route path="/saving" element={<Saving />} />
        <Route path="/sharing" element={<Sharing />} />
        <Route path="/standby" element={<Standby />} />
        <Route path="/starting" element={<Starting />} />

        {/* 🧾 Register Flow */}
        <Route path="/register-data-saved" element={<RegisterDataSaved />} />
        <Route path="/register-personal-info" element={<RegisterPersonalInfo />} />
        <Route path="/register-tapid" element={<RegisterTapID />} />
        <Route path="/register-welcome" element={<RegisterWelcome />} />

        {/* 👤 Role Selection */}
        <Route path="/role" element={<Role />} />

        {/* 🚫 Catch-all Not Found */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Router>
  );
};

export default AppRoutes;
