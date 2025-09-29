import React from "react";
import { Routes, Route } from "react-router-dom";

// Import pages
import Standby from "./pages/Standby/Standby.jsx";
import Welcome from "./pages/Welcome/Welcome.jsx";
import Name from "./pages/Name/Name.jsx";
import Sex from "./pages/Sex/Sex.jsx";
import Age from "./pages/Age/Age.jsx";
import Starting from "./pages/Starting/Starting.jsx";
import Weight from "./pages/Weight/Weight.jsx";
import Height from "./pages/Height/Height.jsx";
import BodyTemp from "./pages/BodyTemp/BodyTemp.jsx";
import Max30102 from "./pages/Max30102/Max30102.jsx";
import BloodPressure from "./pages/BloodPressure/BloodPressure.jsx";
import Saving from "./pages/Saving/Saving.jsx";
import Share from "./pages/Share/Share.jsx";
import Result from "./pages/Result/Result.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";

function AppRoutes() {
  return (
    <Routes>
      {/* Standby is the first screen */}
      <Route path="/" element={<Standby />} />

      {/* Flow pages */}
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/name" element={<Name />} />
      <Route path="/sex" element={<Sex />} />
      <Route path="/age" element={<Age />} />   {/* Birthday merged here */}
      <Route path="/starting" element={<Starting />} />
      <Route path="/weight" element={<Weight />} />
      <Route path="/height" element={<Height />} />
      <Route path="/bodytemp" element={<BodyTemp />} />
      <Route path="/max30102" element={<Max30102 />} />
      <Route path="/bloodpressure" element={<BloodPressure />} />
      <Route path="/saving" element={<Saving />} />
      <Route path="/share" element={<Share />} />
      <Route path="/result" element={<Result />} />

      {/* Admin dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default AppRoutes;
