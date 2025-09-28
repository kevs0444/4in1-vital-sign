import React from "react";
import { Routes, Route } from "react-router-dom";

// Import pages
import Standby from "./pages/Standby/Standby.jsx";
import Login from "./pages/Login/Login.jsx";
import Sex from "./pages/Sex/Sex.jsx";
import Age from "./pages/Age/Age.jsx";
import Bmi from "./pages/Bmi/Bmi.jsx";
import Temp from "./pages/BodyTemp/Temp.jsx";
import Max30102 from "./pages/Max30102/Max30102.jsx";
import Summary from "./pages/Summary/Summary.jsx";
import AIResult from "./pages/AIResult/AIResult.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";

function AppRoutes() {
  return (
    <Routes>
      {/* Standby is the first screen */}
      <Route path="/" element={<Standby />} />

      {/* Flow pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/sex" element={<Sex />} />
      <Route path="/age" element={<Age />} />
      <Route path="/bmi" element={<Bmi />} />
      <Route path="/temp" element={<Temp />} />
      <Route path="/max30102" element={<Max30102 />} />
      <Route path="/summary" element={<Summary />} />
      <Route path="/airesult" element={<AIResult />} />

      {/* Admin dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default AppRoutes;
