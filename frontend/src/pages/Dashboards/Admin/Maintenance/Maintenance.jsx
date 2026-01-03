import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CameraAlt,
    Refresh,
    Settings,
    FlipCameraIos,
    PlayArrow,
    FitnessCenter,
    Thermostat,
    Favorite,
    Speed,
    Print,
    Fullscreen,
    FullscreenExit
} from '@mui/icons-material';
import { sensorAPI, printerAPI } from '../../../../utils/api';
import './Maintenance.css';

const getDynamicApiUrl = () => {
    // Return relative path to route through proxy (dev) or same-origin (production)
    // This handles local kiosk, remote Access (VPN), and Funnel (HTTPS) correctly
    return '/api';
};

const API_BASE = getDynamicApiUrl();

const modes = {
    feet: ["platform", "barefeet", "socks", "footwear"],
    body: ["null", "bag", "cap", "id", "watch"],
    bp: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "error"]
};

const Maintenance = () => {
    // Main Section State: 'sensors', 'cameras', 'printer'
    const [activeSection, setActiveSection] = useState('sensors');
    // Sensor Sub-tabs: 'bmi', 'bodytemp', 'max30102'
    const [activeSensorTab, setActiveSensorTab] = useState('bmi');
    // Camera Sub-tabs: 'bp', 'feet', 'body'
    const [activeCameraTab, setActiveCameraTab] = useState('bp');

    // Backend Status
    const [backendStatus, setBackendStatus] = useState('Disconnected');
    const [complianceStatus, setComplianceStatus] = useState('Waiting...');
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
    const [selectedClass, setSelectedClass] = useState('');

    // Camera Settings
    const [settings, setSettings] = useState({
        zoom: 1.0,
        brightness: 1.0,
        contrast: 1.0,
        rotation: 0,
        square_crop: true,
        camera_index: 0,
        viewport_size: 100
    });

    const [isFullScreen, setIsFullScreen] = useState(false);

    // Printer State
    const [printerStatus, setPrinterStatus] = useState({
        status: 'unknown',
        message: 'Click check to get status',
        printer_name: ''
    });

    const pollIntervalRef = useRef(null);

    const checkBackendStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/sensor/status`);
            setBackendStatus(res.ok ? 'Connected' : 'Disconnected');
        } catch { setBackendStatus('Disconnected'); }
    };

    const pollSensorStatus = React.useCallback(async () => {
        try {
            const weightRes = await sensorAPI.getWeightStatus();
            if (weightRes.weight) {
                setSensorData(prev => ({ ...prev, weight: weightRes.weight }));
                setSensorStatus(prev => ({ ...prev, weight: 'active' }));
            }
            const heightRes = await sensorAPI.getHeightStatus();
            if (heightRes.height) {
                setSensorData(prev => ({ ...prev, height: heightRes.height }));
                setSensorStatus(prev => ({ ...prev, height: 'active' }));
            }
            if (sensorData.weight && sensorData.height) {
                const heightM = sensorData.height / 100;
                const bmi = (sensorData.weight / (heightM * heightM)).toFixed(1);
                setSensorData(prev => ({ ...prev, bmi }));
            }
            const tempRes = await sensorAPI.getTemperatureStatus();
            if (tempRes.temperature || tempRes.live_temperature) {
                setSensorData(prev => ({ ...prev, temperature: tempRes.temperature || tempRes.live_temperature }));
                setSensorStatus(prev => ({ ...prev, temperature: 'active' }));
            }
            const maxRes = await sensorAPI.getMax30102Status();
            setSensorData(prev => ({
                ...prev,
                heartRate: Math.round(maxRes.heart_rate || maxRes.final_results?.heart_rate) || null,
                spo2: Math.round(maxRes.spo2 || maxRes.final_results?.spo2) || null,
                respiratoryRate: Math.round(maxRes.respiratory_rate || maxRes.final_results?.respiratory_rate) || null,
                fingerDetected: maxRes.finger_detected
            }));
            if (maxRes.measurement_active || maxRes.finger_detected) setSensorStatus(prev => ({ ...prev, max30102: 'active' }));
            setBackendStatus('Connected');
        } catch { }
    }, [sensorData.weight, sensorData.height]);

    const pollCameraStatus = React.useCallback(async () => {
        try {
            const endpoint = activeCameraTab === 'bp' ? `${API_BASE}/bp/status` : `${API_BASE}/camera/status`;
            const res = await fetch(endpoint);
            const data = await res.json();
            if (activeCameraTab === 'bp') {
                setComplianceStatus(data.is_running ? `BP: ${data.systolic}/${data.diastolic} (${data.trend})` : 'BP Camera Off');
            } else {
                setComplianceStatus(data.message || 'Waiting...');
                if (data.fps !== undefined) setFps(data.fps);
            }
            setBackendStatus('Connected');
        } catch { setBackendStatus('Disconnected'); }
    }, [activeCameraTab]);

    const startCamera = React.useCallback(async (mode) => {
        try {
            if (mode === 'bp') {
                await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
                await fetch(`${API_BASE}/bp/start`, { method: 'POST' });
                await fetch(`${API_BASE}/bp/set_settings`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
            } else {
                await fetch(`${API_BASE}/bp/stop`, { method: 'POST' });
                await fetch(`${API_BASE}/camera/start`, { method: 'POST' });
                await fetch(`${API_BASE}/camera/set_mode`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode })
                });
            }
        } catch (err) { }
    }, [settings]);

    const handleCapture = React.useCallback(async () => {
        try {
            setShowCaptureFlash(true);
            setTimeout(() => setShowCaptureFlash(false), 150);
            await fetch(`${API_BASE}/camera/capture`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_name: selectedClass })
            });
            setCaptureCount(prev => prev + 1);
        } catch (err) { }
    }, [selectedClass]);

    useEffect(() => {
        checkBackendStatus();
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && activeSection === 'cameras') {
                e.preventDefault();
                handleCapture();
            }
            if (e.code === 'Escape') setIsFullScreen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            fetch(`${API_BASE}/camera/stop`, { method: 'POST' }).catch(() => { });
            fetch(`${API_BASE}/bp/stop`, { method: 'POST' }).catch(() => { });
        };
    }, [activeSection, handleCapture]);

    useEffect(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (activeSection === 'sensors') {
            pollIntervalRef.current = setInterval(pollSensorStatus, 1000);
            fetch(`${API_BASE}/camera/stop`, { method: 'POST' }).catch(() => { });
            fetch(`${API_BASE}/bp/stop`, { method: 'POST' }).catch(() => { });
        } else if (activeSection === 'cameras') {
            pollIntervalRef.current = setInterval(pollCameraStatus, 1000);
            startCamera(activeCameraTab);
        }
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [activeSection, activeCameraTab, pollSensorStatus, pollCameraStatus, startCamera]);

    useEffect(() => {
        if (activeSection === 'cameras') {
            setSelectedClass(modes[activeCameraTab][0]);
        }
    }, [activeCameraTab, activeSection]);

    const handleSettingChange = (name, value) => {
        const n = { ...settings, [name]: value };
        setSettings(n);
        const ep = activeCameraTab === 'bp' ? `${API_BASE}/bp/set_settings` : `${API_BASE}/camera/set_settings`;
        fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) });
    };

    const handleToggleCamera = () => {
        const n = settings.camera_index === 0 ? 1 : 0;
        setSettings(prev => ({ ...prev, camera_index: n }));
        fetch(`${API_BASE}/camera/set_camera`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: n }) });
    };

    const renderSensorCard = (title, icon, value, unit, status, onStart) => (
        <div className={`sensor-card ${status}`}>
            <div className="sensor-card-header">{icon}<h3>{title}</h3></div>
            <div className="sensor-card-value"><span className="value">{value ?? '--'}</span><span className="unit">{unit}</span></div>
            <div className="sensor-card-status"><span className={`status-badge ${status}`}>
                {status === 'idle' ? '⏸️ Idle' : status === 'measuring' ? '🔄 Testing...' : '✅ Online'}
            </span></div>
            <button className="sensor-start-btn" onClick={onStart} disabled={status === 'measuring'}><PlayArrow /> {status === 'measuring' ? 'Wait...' : 'Trigger Test'}</button>
        </div>
    );

    return (
        <div className="maintenance-container">
            <AnimatePresence>{showCaptureFlash && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="capture-flash" />}</AnimatePresence>

            <header className="maintenance-sub-header">
                <div className="header-center">
                    <h2>🔧 System Diagnostics & Calibration</h2>
                </div>
                <div className="header-status">
                    <span className={`status-dot ${backendStatus === 'Connected' ? 'online' : 'offline'}`} />
                    Backend: {backendStatus}
                </div>
            </header>

            <div className="main-section-tabs">
                <button className={`section-tab ${activeSection === 'sensors' ? 'active' : ''}`} onClick={() => setActiveSection('sensors')}><FitnessCenter /> Physical Sensors</button>
                <button className={`section-tab ${activeSection === 'cameras' ? 'active' : ''}`} onClick={() => setActiveSection('cameras')}><CameraAlt /> AI Vision Models</button>
                <button className={`section-tab ${activeSection === 'printer' ? 'active' : ''}`} onClick={() => setActiveSection('printer')}><Print /> System Printer</button>
            </div>

            <main className="maintenance-main">
                {activeSection === 'sensors' && (
                    <div className="sensors-section">
                        <div className="sensor-tabs">
                            <button className={`sensor-tab ${activeSensorTab === 'bmi' ? 'active' : ''}`} onClick={() => setActiveSensorTab('bmi')}>BMI Hardware</button>
                            <button className={`sensor-tab ${activeSensorTab === 'bodytemp' ? 'active' : ''}`} onClick={() => setActiveSensorTab('bodytemp')}>IR Temperature</button>
                            <button className={`sensor-tab ${activeSensorTab === 'max30102' ? 'active' : ''}`} onClick={() => setActiveSensorTab('max30102')}>Pulse Oximeter</button>
                        </div>
                        <div className="sensor-content">
                            {activeSensorTab === 'bmi' && (
                                <>
                                    <h2>⚖️ BMI Hardware Calibration</h2>
                                    <p className="sensor-description">Trigger and verify real-time data from weight loadcells and ultrasonic height sensors.</p>
                                    <div className="sensor-cards-grid">
                                        {renderSensorCard('Weight', <FitnessCenter />, sensorData.weight, 'kg', sensorStatus.weight, sensorAPI.startWeight)}
                                        {renderSensorCard('Height', <Speed />, sensorData.height, 'cm', sensorStatus.height, sensorAPI.startHeight)}
                                        <div className="sensor-card bmi-result">
                                            <div className="sensor-card-header"><FitnessCenter /><h3>Computed BMI</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.bmi ?? '--'}</span><span className="unit">kg/m²</span></div>
                                            <div className="sensor-card-status"><span className="status-badge active">{sensorData.bmi ? 'Auto-Calculated' : 'Waiting...'}</span></div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {activeSensorTab === 'bodytemp' && (
                                <>
                                    <h2>🌡️ IR Body Temperature Sensor</h2>
                                    <p className="sensor-description">Test the MLX90614 non-contact temperature sensor module accuracy.</p>
                                    <div className="sensor-cards-grid">
                                        {renderSensorCard('Body Temp', <Thermostat />, sensorData.temperature, '°C', sensorStatus.temperature, sensorAPI.startTemperature)}
                                    </div>
                                </>
                            )}
                            {activeSensorTab === 'max30102' && (
                                <>
                                    <h2>❤️ MAX30102 Pulse Oximetry</h2>
                                    <p className="sensor-description">Real-time check for the Finger-detected heart rate and SpO2 sensor.</p>
                                    <div className="sensor-cards-grid">
                                        <div className="sensor-card">
                                            <div className="sensor-card-header"><Favorite /><h3>Heart Rate</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.heartRate ?? '--'}</span><span className="unit">BPM</span></div>
                                        </div>
                                        <div className="sensor-card">
                                            <div className="sensor-card-header"><Speed /><h3>SpO2 Oxygen</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.spo2 ?? '--'}</span><span className="unit">%</span></div>
                                        </div>
                                        <div className="sensor-card">
                                            <div className="sensor-card-header"><Speed /><h3>Resp. Rate</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.respiratoryRate ?? '--'}</span><span className="unit">/min</span></div>
                                        </div>
                                    </div>
                                    <button className="sensor-start-btn" onClick={sensorAPI.startMax30102} style={{ height: '3rem' }}><PlayArrow /> Start Pulse Test</button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeSection === 'cameras' && (
                    <div className="cameras-section">
                        <div className="camera-col">
                            <div className="sensor-tabs" style={{ marginBottom: '1.5rem' }}>
                                <button className={`sensor-tab ${activeCameraTab === 'bp' ? 'active' : ''}`} onClick={() => startCamera('bp') & setActiveCameraTab('bp')}>BP Camera</button>
                                <button className={`sensor-tab ${activeCameraTab === 'feet' ? 'active' : ''}`} onClick={() => startCamera('feet') & setActiveCameraTab('feet')}>Feet Detector</button>
                                <button className={`sensor-tab ${activeCameraTab === 'body' ? 'active' : ''}`} onClick={() => startCamera('body') & setActiveCameraTab('body')}>Wearables</button>
                            </div>
                            <div
                                className="camera-viewport-container"
                                style={isFullScreen ? {
                                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                                    maxWidth: '100%', margin: 0, zIndex: 9999, borderRadius: 0
                                } : {
                                    maxWidth: `${settings.viewport_size}%`, margin: '0 auto', position: 'relative'
                                }}
                            >
                                <img src={`${API_BASE}/${activeCameraTab === 'bp' ? 'bp' : 'camera'}/video_feed?t=${Date.now()}`} alt="Feed" className="main-feed" style={{ objectFit: 'cover' }} />
                                <div className="viewport-overlay-premium">
                                    <div className="overlay-top">
                                        <div className="ai-status-badge"><div className="pulse-red" /> {complianceStatus}</div>
                                        <div className="fps-badge">FPS: {fps}</div>
                                    </div>
                                    <button
                                        className="fullscreen-btn-premium"
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                        style={{
                                            position: 'absolute', top: '1.5rem', right: '1.5rem',
                                            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
                                            color: 'white', borderRadius: '8px', padding: '8px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            backdropFilter: 'blur(5px)',
                                            pointerEvents: 'auto'
                                        }}
                                    >
                                        {isFullScreen ? <FullscreenExit /> : <Fullscreen />}
                                    </button>
                                    <div className="overlay-bottom">
                                        <div className="session-stats">Collected: {captureCount} Samples</div>
                                    </div>
                                </div>
                                <button className="switch-cam-btn-premium" onClick={handleToggleCamera}><FlipCameraIos /></button>
                            </div>

                            <div className="capture-actions">
                                <div className="sensor-tabs" style={{ width: '100%', flexWrap: 'wrap' }}>
                                    {modes[activeCameraTab].map(cls => (
                                        <button key={cls} className={`sensor-tab ${selectedClass === cls ? 'active' : ''}`} onClick={() => setSelectedClass(cls)}>{cls}</button>
                                    ))}
                                </div>
                                <button className="capture-btn-premium" onClick={handleCapture}><CameraAlt /> CAPTURE SAMPLE <span className="kb-hint">(Space)</span></button>
                            </div>
                        </div>

                        <div className="camera-settings-panel">
                            <div className="settings-group">
                                <h3><Settings /> Image Calibration</h3>
                                <div className="setting-item">
                                    <label>Viewport Size <span>{settings.viewport_size}%</span></label>
                                    <input type="range" min="50" max="100" step="5" value={settings.viewport_size} onChange={(e) => handleSettingChange('viewport_size', parseInt(e.target.value))} />
                                </div>
                                <div className="setting-item">
                                    <label>Digital Zoom <span>{settings.zoom.toFixed(1)}x</span></label>
                                    <input type="range" min="1" max="3" step="0.1" value={settings.zoom} onChange={(e) => handleSettingChange('zoom', parseFloat(e.target.value))} />
                                </div>
                                <div className="setting-item">
                                    <label>Brightness <span>{settings.brightness.toFixed(1)}</span></label>
                                    <input type="range" min="0.5" max="2.0" step="0.1" value={settings.brightness} onChange={(e) => handleSettingChange('brightness', parseFloat(e.target.value))} />
                                </div>
                                <div className="setting-item">
                                    <label>Contrast <span>{settings.contrast.toFixed(1)}</span></label>
                                    <input type="range" min="0.5" max="2.0" step="0.1" value={settings.contrast} onChange={(e) => handleSettingChange('contrast', parseFloat(e.target.value))} />
                                </div>
                                <button className="sensor-start-btn" onClick={() => startCamera(activeCameraTab)}><Refresh /> Hard Reset Cam</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'printer' && (
                    <div className="printer-content">
                        <div className="printer-icon-large"><Print /></div>
                        <h2>Thermal Receipt Printer Diagnostics</h2>
                        <div className="printer-status-box">
                            <span className="p-name">{printerStatus.printer_name || 'Generic Thermal Printer'}</span>
                            <span className="p-msg">{printerStatus.message}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="sensor-start-btn" onClick={async () => setPrinterStatus(await printerAPI.getStatus())} style={{ width: '200px' }}><Refresh /> Check Link</button>
                            <button className="sensor-start-btn" style={{ width: '200px', background: '#dc2626' }}><Print /> Print Test Slip</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Maintenance;
