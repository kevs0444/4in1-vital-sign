import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowBack,
    CameraAlt,
    Refresh,
    Add,
    Remove,
    RotateRight,
    Brightness6,
    Contrast,
    Settings,
    FlipCameraIos,
    PlayArrow,
    FitnessCenter,
    Thermostat,
    Favorite,
    Speed
} from '@mui/icons-material';
import { sensorAPI } from '../../../../utils/api';
import './Maintenance.css';

const getDynamicApiUrl = () => {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL + '/api';
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

const API_BASE = getDynamicApiUrl();

const modes = {
    feet: ["platform", "barefeet", "socks", "footwear"],
    body: ["null", "bag", "cap", "id", "watch"],
    bp: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "error"]
};

const Maintenance = () => {
    const navigate = useNavigate();

    // Main Section State: 'sensors' or 'cameras'
    const [activeSection, setActiveSection] = useState('sensors');

    // Sensor Sub-tabs: 'bmi', 'bodytemp', 'max30102'
    const [activeSensorTab, setActiveSensorTab] = useState('bmi');

    // Camera Sub-tabs: 'bp', 'feet', 'body'
    const [activeCameraTab, setActiveCameraTab] = useState('bp');

    // Backend Status
    const [backendStatus, setBackendStatus] = useState('Disconnected');
    const [complianceStatus, setComplianceStatus] = useState('Waiting...');
    // eslint-disable-next-line no-unused-vars
    const [isCompliant, setIsCompliant] = useState(false);
    const [fps, setFps] = useState(0);

    // Sensor States
    const [sensorData, setSensorData] = useState({
        weight: null,
        height: null,
        bmi: null,
        temperature: null,
        heartRate: null,
        spo2: null,
        respiratoryRate: null,
        fingerDetected: false
    });
    const [sensorStatus, setSensorStatus] = useState({
        weight: 'idle',
        height: 'idle',
        temperature: 'idle',
        max30102: 'idle'
    });

    // Camera States  
    const [captureCount, setCaptureCount] = useState(0);
    const [showCaptureFlash, setShowCaptureFlash] = useState(false);
    const [bpReading, setBpReading] = useState(null);
    const [selectedClass, setSelectedClass] = useState('');

    // Camera Settings
    const [settings, setSettings] = useState({
        zoom: 1.0,
        brightness: 1.0,
        contrast: 1.0,
        rotation: 0,
        square_crop: true,
        camera_index: 0
    });



    // Polling interval ref
    const pollIntervalRef = useRef(null);

    // Initialize on mount
    useEffect(() => {
        checkBackendStatus();

        const handleKeyDown = (e) => {
            if (e.code === 'Space' && activeSection === 'cameras') {
                e.preventDefault();
                handleCapture();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            // Stop all cameras
            fetch(`${API_BASE}/camera/stop`, { method: 'POST' }).catch(() => { });
            fetch(`${API_BASE}/bp/stop`, { method: 'POST' }).catch(() => { });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Polling based on active section and tab
    useEffect(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        if (activeSection === 'sensors') {
            pollIntervalRef.current = setInterval(pollSensorStatus, 1000);
            // Stop cameras when in sensor mode
            fetch(`${API_BASE}/camera/stop`, { method: 'POST' }).catch(() => { });
            fetch(`${API_BASE}/bp/stop`, { method: 'POST' }).catch(() => { });
        } else if (activeSection === 'cameras') {
            pollIntervalRef.current = setInterval(pollCameraStatus, 1000);
            startCamera(activeCameraTab);
        }

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, activeCameraTab]);

    // Update selected class when camera tab changes
    useEffect(() => {
        if (activeSection === 'cameras') {
            setSelectedClass(modes[activeCameraTab][0]);
        }
    }, [activeCameraTab, activeSection]);

    const checkBackendStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/sensor/status`);
            if (res.ok) {
                setBackendStatus('Connected');
            } else {
                setBackendStatus('Disconnected');
            }
        } catch {
            setBackendStatus('Disconnected');
        }
    };

    const pollSensorStatus = async () => {
        try {
            // Check weight status
            const weightRes = await sensorAPI.getWeightStatus();
            if (weightRes.weight) {
                setSensorData(prev => ({ ...prev, weight: weightRes.weight }));
                setSensorStatus(prev => ({ ...prev, weight: 'active' }));
            }

            // Check height status
            const heightRes = await sensorAPI.getHeightStatus();
            if (heightRes.height) {
                setSensorData(prev => ({ ...prev, height: heightRes.height }));
                setSensorStatus(prev => ({ ...prev, height: 'active' }));
            }

            // Calculate BMI if both available
            if (sensorData.weight && sensorData.height) {
                const heightM = sensorData.height / 100;
                const bmi = (sensorData.weight / (heightM * heightM)).toFixed(1);
                setSensorData(prev => ({ ...prev, bmi }));
            }

            // Check temperature status
            const tempRes = await sensorAPI.getTemperatureStatus();
            if (tempRes.temperature || tempRes.live_temperature) {
                setSensorData(prev => ({
                    ...prev,
                    temperature: tempRes.temperature || tempRes.live_temperature
                }));
                setSensorStatus(prev => ({ ...prev, temperature: 'active' }));
            }

            // Check MAX30102 status
            const max30102Res = await sensorAPI.getMax30102Status();
            const hr = max30102Res.heart_rate || max30102Res.final_results?.heart_rate;
            const sp = max30102Res.spo2 || max30102Res.final_results?.spo2;
            const rr = max30102Res.respiratory_rate || max30102Res.final_results?.respiratory_rate;
            setSensorData(prev => ({
                ...prev,
                heartRate: hr ? Math.round(hr) : null,
                spo2: sp ? Math.round(sp) : null,
                respiratoryRate: rr ? Math.round(rr) : null,
                fingerDetected: max30102Res.finger_detected
            }));
            if (max30102Res.measurement_active || max30102Res.finger_detected) {
                setSensorStatus(prev => ({ ...prev, max30102: 'active' }));
            }

            setBackendStatus('Connected');
        } catch {
            // Silently fail polling
        }
    };

    const pollCameraStatus = async () => {
        try {
            const endpoint = activeCameraTab === 'bp'
                ? `${API_BASE}/bp/status`
                : `${API_BASE}/camera/status`;
            const res = await fetch(endpoint);
            const data = await res.json();

            if (activeCameraTab === 'bp') {
                if (data.is_running) {
                    setComplianceStatus(`BP: ${data.systolic}/${data.diastolic} (${data.trend})`);
                    setIsCompliant(true);
                    if (data.systolic !== '--' && data.diastolic !== '--') {
                        setBpReading({ systolic: data.systolic, diastolic: data.diastolic });
                    }
                } else {
                    setComplianceStatus('BP Camera Off');
                    setIsCompliant(false);
                }
            } else {
                setComplianceStatus(data.message || 'Waiting...');
                setIsCompliant(data.is_compliant || false);
                if (data.fps !== undefined) setFps(data.fps);
            }
            setBackendStatus('Connected');
        } catch {
            setBackendStatus('Disconnected');
        }
    };

    const startCamera = async (mode) => {
        try {
            if (mode === 'bp') {
                await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
                await fetch(`${API_BASE}/bp/start`, { method: 'POST' });
                // Apply current settings (Zoom, etc) immediately to override default 1.3
                await fetch(`${API_BASE}/bp/set_settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
            } else {
                await fetch(`${API_BASE}/bp/stop`, { method: 'POST' });
                await fetch(`${API_BASE}/camera/start`, { method: 'POST' });
                await fetch(`${API_BASE}/camera/set_mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode })
                });
            }
        } catch (err) { console.error(err); }
    };

    const handleCapture = async () => {
        try {
            setShowCaptureFlash(true);
            setTimeout(() => setShowCaptureFlash(false), 150);

            const currentClass = document.querySelector('.class-btn.active')?.dataset.class || 'unknown';

            const res = await fetch(`${API_BASE}/camera/capture`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_name: currentClass })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setCaptureCount(prev => prev + 1);
            }
        } catch (err) { console.error(err); }
    };

    // Sensor control functions
    const startWeightMeasurement = async () => {
        setSensorStatus(prev => ({ ...prev, weight: 'measuring' }));
        await sensorAPI.prepareWeight();
        await sensorAPI.startWeight();
    };

    const startHeightMeasurement = async () => {
        setSensorStatus(prev => ({ ...prev, height: 'measuring' }));
        await sensorAPI.prepareHeight();
        await sensorAPI.startHeight();
    };

    const startTemperatureMeasurement = async () => {
        setSensorStatus(prev => ({ ...prev, temperature: 'measuring' }));
        await sensorAPI.prepareTemperature();
        await sensorAPI.startTemperature();
    };

    const startMax30102Measurement = async () => {
        setSensorStatus(prev => ({ ...prev, max30102: 'measuring' }));
        await sensorAPI.prepareMax30102();
        await sensorAPI.startMax30102();
    };

    const handleCameraTabChange = (tab) => {
        setActiveCameraTab(tab);
        startCamera(tab);
    };

    const updateSettingsOnBackend = async (newSettings) => {
        try {
            const endpoint = activeCameraTab === 'bp'
                ? `${API_BASE}/bp/set_settings`
                : `${API_BASE}/camera/set_settings`;

            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
        } catch (err) { console.error(err); }
    };

    const handleSettingChange = (name, value) => {
        const newSettings = { ...settings, [name]: value };
        setSettings(newSettings);
        updateSettingsOnBackend(newSettings);
    };

    const handleCameraIndexChange = async (index) => {
        const idx = parseInt(index);
        setSettings(prev => ({ ...prev, camera_index: idx }));
        try {
            await fetch(`${API_BASE}/camera/set_camera`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: idx })
            });
        } catch (err) { console.error(err); }
    };

    const handleToggleCamera = () => {
        const newIndex = settings.camera_index === 0 ? 1 : 0;
        handleCameraIndexChange(newIndex);
    };

    const getVideoFeedUrl = () => {
        if (activeCameraTab === 'bp') {
            return `${API_BASE}/bp/video_feed?t=${Date.now()}`;
        }
        return `${API_BASE}/camera/video_feed?t=${Date.now()}`;
    };

    // Render sensor card
    const renderSensorCard = (title, icon, value, unit, status, onStart) => (
        <div className={`sensor-card ${status}`}>
            <div className="sensor-card-header">
                {icon}
                <h3>{title}</h3>
            </div>
            <div className="sensor-card-value">
                <span className="value">{value ?? '--'}</span>
                <span className="unit">{unit}</span>
            </div>
            <div className="sensor-card-status">
                <span className={`status-badge ${status}`}>
                    {status === 'idle' ? '⏸️ Idle' : status === 'measuring' ? '🔄 Measuring...' : '✅ Active'}
                </span>
            </div>
            <button
                className="sensor-start-btn"
                onClick={onStart}
                disabled={status === 'measuring'}
            >
                <PlayArrow /> {status === 'measuring' ? 'Measuring...' : 'Start'}
            </button>
        </div>
    );

    return (
        <div className="maintenance-container">
            <AnimatePresence>
                {showCaptureFlash && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        className="capture-flash"
                    />
                )}
            </AnimatePresence>

            <header className="maintenance-header">
                <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
                    <ArrowBack /> Dashboard
                </button>
                <div className="header-center">
                    <h1>🔧 System Maintenance & Testing</h1>
                    <p className="path-display">Test and calibrate all sensors and AI models</p>
                </div>
                <div className="header-status">
                    <span className={`status-dot ${backendStatus === 'Connected' ? 'online' : 'offline'}`}></span>
                    {backendStatus}
                </div>
            </header>

            {/* Main Section Tabs */}
            <div className="main-section-tabs">
                <button
                    className={`section-tab ${activeSection === 'sensors' ? 'active' : ''}`}
                    onClick={() => setActiveSection('sensors')}
                >
                    <FitnessCenter /> Physical Sensors
                </button>
                <button
                    className={`section-tab ${activeSection === 'cameras' ? 'active' : ''}`}
                    onClick={() => setActiveSection('cameras')}
                >
                    <CameraAlt /> AI Cameras
                </button>
            </div>

            <main className="maintenance-main">
                {/* ==================== SENSORS SECTION ==================== */}
                {activeSection === 'sensors' && (
                    <div className="sensors-section">
                        {/* Sensor Sub-tabs */}
                        <div className="sensor-tabs">
                            <button
                                className={`sensor-tab ${activeSensorTab === 'bmi' ? 'active' : ''}`}
                                onClick={() => setActiveSensorTab('bmi')}
                            >
                                <FitnessCenter /> BMI (Weight + Height)
                            </button>
                            <button
                                className={`sensor-tab ${activeSensorTab === 'bodytemp' ? 'active' : ''}`}
                                onClick={() => setActiveSensorTab('bodytemp')}
                            >
                                <Thermostat /> Body Temperature
                            </button>
                            <button
                                className={`sensor-tab ${activeSensorTab === 'max30102' ? 'active' : ''}`}
                                onClick={() => setActiveSensorTab('max30102')}
                            >
                                <Favorite /> Pulse Oximeter (MAX30102)
                            </button>
                        </div>

                        {/* BMI Tab Content */}
                        {activeSensorTab === 'bmi' && (
                            <div className="sensor-content">
                                <h2>⚖️ BMI Measurement (Weight + Height)</h2>
                                <p className="sensor-description">
                                    Test the weight scale and height sensor. The BMI is auto-calculated when both measurements are available.
                                </p>
                                <div className="sensor-cards-grid">
                                    {renderSensorCard(
                                        'Weight',
                                        <FitnessCenter />,
                                        sensorData.weight,
                                        'kg',
                                        sensorStatus.weight,
                                        startWeightMeasurement
                                    )}
                                    {renderSensorCard(
                                        'Height',
                                        <Speed />,
                                        sensorData.height,
                                        'cm',
                                        sensorStatus.height,
                                        startHeightMeasurement
                                    )}
                                    <div className="sensor-card bmi-result">
                                        <div className="sensor-card-header">
                                            <FitnessCenter />
                                            <h3>BMI (Calculated)</h3>
                                        </div>
                                        <div className="sensor-card-value">
                                            <span className="value">{sensorData.bmi ?? '--'}</span>
                                            <span className="unit">kg/m²</span>
                                        </div>
                                        <div className="sensor-card-status">
                                            <span className="status-badge info">
                                                {sensorData.bmi ? (
                                                    sensorData.bmi < 18.5 ? '⚠️ Underweight' :
                                                        sensorData.bmi < 25 ? '✅ Normal' :
                                                            sensorData.bmi < 30 ? '⚠️ Overweight' : '🔴 Obese'
                                                ) : 'Waiting for data...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Body Temperature Tab Content */}
                        {activeSensorTab === 'bodytemp' && (
                            <div className="sensor-content">
                                <h2>🌡️ Body Temperature Measurement</h2>
                                <p className="sensor-description">
                                    Test the infrared body temperature sensor. Normal range is 36.0°C - 37.5°C.
                                </p>
                                <div className="sensor-cards-grid single">
                                    {renderSensorCard(
                                        'Body Temperature',
                                        <Thermostat />,
                                        sensorData.temperature,
                                        '°C',
                                        sensorStatus.temperature,
                                        startTemperatureMeasurement
                                    )}
                                </div>
                                <div className="temperature-ranges">
                                    <h4>Temperature Ranges:</h4>
                                    <div className="range-item low">🔵 Low: &lt; 36.0°C</div>
                                    <div className="range-item normal">🟢 Normal: 36.0 - 37.2°C</div>
                                    <div className="range-item elevated">🟡 Slight Fever: 37.3 - 38.0°C</div>
                                    <div className="range-item high">🔴 Fever: &gt; 38.0°C</div>
                                </div>
                            </div>
                        )}

                        {/* MAX30102 Tab Content */}
                        {activeSensorTab === 'max30102' && (
                            <div className="sensor-content">
                                <h2>❤️ Pulse Oximeter (MAX30102)</h2>
                                <p className="sensor-description">
                                    Test the pulse oximeter sensor for heart rate, SpO2, and respiratory rate.
                                    Place your finger on the sensor for accurate readings.
                                </p>
                                <div className="finger-status">
                                    <span className={`finger-indicator ${sensorData.fingerDetected ? 'detected' : 'not-detected'}`}>
                                        👆 {sensorData.fingerDetected ? 'Finger Detected' : 'No Finger Detected'}
                                    </span>
                                </div>
                                <div className="sensor-cards-grid">
                                    <div className="sensor-card">
                                        <div className="sensor-card-header">
                                            <Favorite style={{ color: '#e74c3c' }} />
                                            <h3>Heart Rate</h3>
                                        </div>
                                        <div className="sensor-card-value">
                                            <span className="value">{sensorData.heartRate ?? '--'}</span>
                                            <span className="unit">BPM</span>
                                        </div>
                                    </div>
                                    <div className="sensor-card">
                                        <div className="sensor-card-header">
                                            <Speed style={{ color: '#3498db' }} />
                                            <h3>SpO2</h3>
                                        </div>
                                        <div className="sensor-card-value">
                                            <span className="value">{sensorData.spo2 ?? '--'}</span>
                                            <span className="unit">%</span>
                                        </div>
                                    </div>
                                    <div className="sensor-card">
                                        <div className="sensor-card-header">
                                            <Speed style={{ color: '#2ecc71' }} />
                                            <h3>Respiratory Rate</h3>
                                        </div>
                                        <div className="sensor-card-value">
                                            <span className="value">{sensorData.respiratoryRate ?? '--'}</span>
                                            <span className="unit">/min</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="sensor-start-btn large"
                                    onClick={startMax30102Measurement}
                                    disabled={sensorStatus.max30102 === 'measuring'}
                                >
                                    <PlayArrow /> {sensorStatus.max30102 === 'measuring' ? 'Measuring... (30s)' : 'Start Measurement'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== CAMERAS SECTION ==================== */}
                {activeSection === 'cameras' && (
                    <div className="cameras-section">
                        <div className="left-panel">
                            {/* Camera Sub-tabs */}
                            <div className="tabs-container">
                                <button
                                    className={`tab-btn ${activeCameraTab === 'bp' ? 'active' : ''}`}
                                    onClick={() => handleCameraTabChange('bp')}
                                >
                                    🩸 Blood Pressure
                                </button>
                                <button
                                    className={`tab-btn ${activeCameraTab === 'feet' ? 'active' : ''}`}
                                    onClick={() => handleCameraTabChange('feet')}
                                >
                                    👟 Weight Compliance
                                </button>
                                <button
                                    className={`tab-btn ${activeCameraTab === 'body' ? 'active' : ''}`}
                                    onClick={() => handleCameraTabChange('body')}
                                >
                                    👤 Wearables
                                </button>
                            </div>

                            {/* Camera Viewport */}
                            <div className="camera-viewport">
                                <img
                                    src={getVideoFeedUrl()}
                                    alt="Feed"
                                    className="main-feed"
                                />
                                <button className="viewport-overlay switch-cam-btn" onClick={handleToggleCamera} title="Switch Camera">
                                    <FlipCameraIos />
                                </button>
                                <div className="viewport-overlay top">
                                    <div
                                        className="ai-badge"
                                        style={activeCameraTab === 'bp' ? { background: 'linear-gradient(135deg, #e74c3c, #c0392b)' } : {}}
                                    >
                                        {activeCameraTab === 'bp' ? '🩸 BP LIVE: ' : 'AI LIVE: '}
                                        {complianceStatus}
                                    </div>
                                    <div className="fps-badge">FPS: {fps}</div>
                                </div>
                                <div className="viewport-overlay bottom">
                                    <div className="capture-info">
                                        {`Session: ${captureCount} images captured`}
                                    </div>
                                </div>
                            </div>

                            {/* Class Selector for Data Collection */}
                            <div className="class-selector">
                                <h3>Select Category to Capture:</h3>
                                <div className="class-buttons">
                                    {modes[activeCameraTab].map(cls => (
                                        <button
                                            key={cls}
                                            data-class={cls}
                                            className={`class-btn ${selectedClass === cls ? 'active' : ''}`}
                                            onClick={() => setSelectedClass(cls)}
                                        >
                                            {cls}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Capture Button */}
                            <button className="capture-btn" onClick={handleCapture}>
                                <CameraAlt /> Capture (Space)
                            </button>
                        </div>

                        {/* Right Panel - Camera Settings & BP Reading */}
                        <div className="right-panel">
                            {/* Camera Settings */}
                            <div className="control-section">
                                <h3><Settings /> Camera Settings</h3>

                                {/* Camera Source */}
                                <div className="control-item">
                                    <label>Camera Source</label>
                                    <select
                                        className="styled-select"
                                        value={settings.camera_index}
                                        onChange={(e) => handleCameraIndexChange(e.target.value)}
                                    >
                                        <option value={0}>Camera 0</option>
                                        <option value={1}>Camera 1</option>
                                        <option value={2}>Camera 2</option>
                                    </select>
                                </div>

                                {/* Square Crop Toggle */}
                                <div className="control-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                    <input
                                        type="checkbox"
                                        id="square_crop"
                                        checked={settings.square_crop}
                                        onChange={(e) => handleSettingChange('square_crop', e.target.checked)}
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <label htmlFor="square_crop" style={{ margin: 0 }}>Square Crop Mode</label>
                                </div>

                                {/* Zoom */}
                                <div className="control-item">
                                    <label>Zoom: {settings.zoom.toFixed(1)}x</label>
                                    <div className="slider-row">
                                        <button onClick={() => handleSettingChange('zoom', Math.max(1.0, settings.zoom - 0.1))}>
                                            <Remove fontSize="small" />
                                        </button>
                                        <input
                                            type="range"
                                            min="1"
                                            max="3"
                                            step="0.1"
                                            value={settings.zoom}
                                            onChange={(e) => handleSettingChange('zoom', parseFloat(e.target.value))}
                                        />
                                        <button onClick={() => handleSettingChange('zoom', Math.min(3.0, settings.zoom + 0.1))}>
                                            <Add fontSize="small" />
                                        </button>
                                    </div>
                                </div>

                                {/* Brightness */}
                                <div className="control-item">
                                    <label><Brightness6 fontSize="small" /> Brightness: {settings.brightness.toFixed(1)}</label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={settings.brightness}
                                        onChange={(e) => handleSettingChange('brightness', parseFloat(e.target.value))}
                                    />
                                </div>

                                {/* Contrast */}
                                <div className="control-item">
                                    <label><Contrast fontSize="small" /> Contrast: {settings.contrast.toFixed(1)}</label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={settings.contrast}
                                        onChange={(e) => handleSettingChange('contrast', parseFloat(e.target.value))}
                                    />
                                </div>

                                {/* Rotation */}
                                <div className="control-item">
                                    <label><RotateRight fontSize="small" /> Rotation</label>
                                    <div className="rotate-buttons">
                                        {[0, 90, 180, 270].map(deg => (
                                            <button
                                                key={deg}
                                                className={settings.rotation === deg ? 'active' : ''}
                                                onClick={() => handleSettingChange('rotation', deg)}
                                            >
                                                {deg}°
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Restart Camera */}
                                <button className="restart-btn" onClick={() => startCamera(activeCameraTab)}>
                                    <Refresh /> Restart Camera
                                </button>
                            </div>

                            {/* BP Reading Display (for BP tab) */}
                            {activeCameraTab === 'bp' && bpReading && (
                                <div className="bp-results-section">
                                    <h3>🩸 Current BP Reading</h3>
                                    <div className="bp-current-reading">
                                        <div className="bp-values">
                                            <div className="bp-value">
                                                <span className="bp-label">Systolic</span>
                                                <span className="bp-number">{bpReading.systolic}</span>
                                                <span className="bp-unit">mmHg</span>
                                            </div>
                                            <div className="bp-divider">/</div>
                                            <div className="bp-value">
                                                <span className="bp-label">Diastolic</span>
                                                <span className="bp-number">{bpReading.diastolic}</span>
                                                <span className="bp-unit">mmHg</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
                }
            </main >
        </div >
    );
};

export default Maintenance;
