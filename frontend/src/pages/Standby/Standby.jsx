import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../../assets/images/juan.png";
import './Standby.css';

export default function Standby() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPressed, setIsPressed] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const navigate = useNavigate();

  // Backend status check
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/status', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      } catch (error) {
        setBackendStatus('error');
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update clock
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
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const getStatusColor = () => {
    if (backendStatus === 'connected') return '#10b981';
    if (backendStatus === 'error') return '#ef4444';
    return '#f59e0b';
  };

  const getStatusText = () => {
    if (backendStatus === 'connected') return 'System Ready';
    if (backendStatus === 'error') return 'System Error';
    return 'Initializing...';
  };

  return (
    <div className="standby-container">
      {/* Animated Background Grid */}
      <div className="background-grid"></div>

      {/* Floating Orbs - Light Theme */}
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>

      {/* Status Indicator */}
      <div className="status-indicator">
        <div 
          className="status-dot" 
          style={{ background: getStatusColor() }}
        ></div>
        <span className="status-text">{getStatusText()}</span>
      </div>

      {/* Main Content Container */}
      <div className="main-content">
        
        {/* Logo/Icon Section */}
        <div className="logo-section">
          {/* Outer Ring */}
          <div className="logo-outer-ring"></div>
          
          {/* Main Circle */}
          <div className="logo-main-circle">
            {/* Rotating Border */}
            <div className="logo-rotating-border"></div>
            
            {/* Juan Logo */}
            <div className="logo-image-container">
              <img 
                src={logo} 
                alt="Four-in-Juan Logo" 
                className="juan-logo"
              />
              <div className="logo-glow"></div>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="title-section">
          <h1 className="main-title">Four-in-Juan</h1>
          <h2 className="subtitle">Vital Sign Sensor</h2>
          <p className="description">
            BMI Calculation using AI & IoT for Health Risk Prediction
          </p>
        </div>

        {/* Vital Signs Icons */}
        <div className="vital-signs-icons">
          {[
            { icon: '❤️', color: '#dc2626', bg: '#fef2f2', delay: '0s' },
            { icon: '📊', color: '#dc2626', bg: '#fef2f2', delay: '0.2s' },
            { icon: '🌡️', color: '#dc2626', bg: '#fef2f2', delay: '0.4s' },
            { icon: '💨', color: '#dc2626', bg: '#fef2f2', delay: '0.6s' }
          ].map((item, i) => (
            <div key={i} className="vital-icon-container">
              <div 
                className="vital-icon"
                style={{ 
                  color: item.color,
                  background: item.bg,
                  animationDelay: item.delay
                }}
              >
                {item.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Time Display */}
        <div className="time-display">
          <div className="current-time">{formatTime(currentTime)}</div>
          <div className="current-date">{formatDate(currentTime)}</div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartPress}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          className={`start-button ${isPressed ? 'pressed' : ''}`}
        >
          <div className="button-glow"></div>
          <span className="button-content">
            ❤️ TOUCH TO START ❤️
          </span>
        </button>
      </div>
    </div>
  );
}