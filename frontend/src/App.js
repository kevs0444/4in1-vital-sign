// src/App.js
import React from "react";
import AppRoutes from "./routes";
import InactivityWrapper from "./components/InactivityWrapper/InactivityWrapper";

function App() {
  return (
    <div className="App">
      <InactivityWrapper>
        <AppRoutes />
      </InactivityWrapper>
    </div>
  );
}

export default App;
