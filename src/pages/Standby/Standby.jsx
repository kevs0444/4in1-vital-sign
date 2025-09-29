import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Standby.css";

export default function Standby() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPressed, setIsPressed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartPress = () => {
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      navigate("/welcome");
    }, 200);
  };

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="standby-container">
      {/* Floating Abstract Triangles */}
      <div className="background-triangles">
        <div className="triangle triangle1"></div>
        <div className="triangle triangle2"></div>
        <div className="triangle triangle3"></div>
        <div className="triangle triangle4"></div>
        <div className="triangle triangle5"></div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Logo - Now using background image */}
        <div className="logo-container"></div>

        {/* Title */}
        <h1 className="main-title">Four-in-One Vital Sign Sensor</h1>
        <p className="motto">
          BMI Calculation using AI & IoT for Health Risk Prediction
        </p>

        {/* Clock */}
        <div className="clock">
          <span>{formatTime(currentTime)}</span>
        </div>

        {/* Date */}
        <div className="date">{formatDate(currentTime)}</div>

        {/* Start Button */}
        <button
          className={`start-button ${isPressed ? "pressed" : ""}`}
          onClick={handleStartPress}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
        >
          TOUCH THIS TO START
        </button>
      </div>
    </div>
  );
}