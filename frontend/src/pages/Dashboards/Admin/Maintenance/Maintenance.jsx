import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    return '/api';
};

const API_BASE = getDynamicApiUrl();

const modes = {
    feet: ["platform", "barefeet", "socks", "footwear"],
    body: ["null", "bag", "cap", "id", "watch"],
    bp: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "error"]
};

const Maintenance = () => {
    const [activeSection, setActiveSection] = useState('sensors');
    const [activeSensorTab, setActiveSensorTab] = useState('bmi');
    const [activeCameraTab, setActiveCameraTab] = useState('bp');

    const [backendStatus, setBackendStatus] = useState('Disconnected');
    const [complianceStatus, setComplianceStatus] = useState('Waiting...');
    const [fps, setFps] = useState(0);

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

    const [captureCount, setCaptureCount] = useState(0);
    const [showCaptureFlash, setShowCaptureFlash] = useState(false);
    const [selectedClass, setSelectedClass] = useState('');

    const [settings, setSettings] = useState({
        zoom: 1.5,
        brightness: 1.0,
        contrast: 1.0,
        rotation: 0,
        square_crop: true,
        camera_index: 0,
        viewport_size: 100
    });

    const [isFullScreen, setIsFullScreen] = useState(false);

    const [printerStatus, setPrinterStatus] = useState({
        status: 'unknown',
        message: 'Click check to get status',
        printer_name: ''
    });

    const pollIntervalRef = useRef(null);
    const sensorPreparedRef = useRef({ bmi: false, bodytemp: false, max30102: false });

    // =====================================================
    // SENSOR PREPARATION - Power up sensors for real-time data
    // =====================================================
    const prepareBMISensors = useCallback(async () => {
        if (sensorPreparedRef.current.bmi) return;
        console.log('🔧 Maintenance: Preparing BMI sensors...');
        try {
            await sensorAPI.prepareWeight();
            await sensorAPI.prepareHeight();
            sensorPreparedRef.current.bmi = true;
            setSensorStatus(prev => ({ ...prev, weight: 'active', height: 'active' }));
            console.log('✅ BMI sensors ready');
        } catch (error) {
            console.error('❌ Failed to prepare BMI sensors:', error);
        }
    }, []);

    const prepareTemperatureSensor = useCallback(async () => {
        if (sensorPreparedRef.current.bodytemp) return;
        console.log('🔧 Maintenance: Preparing Temperature sensor...');
        try {
            await sensorAPI.prepareTemperature();
            sensorPreparedRef.current.bodytemp = true;
            setSensorStatus(prev => ({ ...prev, temperature: 'active' }));
            console.log('✅ Temperature sensor ready');
        } catch (error) {
            console.error('❌ Failed to prepare Temperature sensor:', error);
        }
    }, []);

    const prepareMax30102Sensor = useCallback(async () => {
        if (sensorPreparedRef.current.max30102) return;
        console.log('🔧 Maintenance: Preparing MAX30102 sensor...');
        try {
            await sensorAPI.prepareMax30102();
            sensorPreparedRef.current.max30102 = true;
            setSensorStatus(prev => ({ ...prev, max30102: 'active' }));
            console.log('✅ MAX30102 sensor ready');
        } catch (error) {
            console.error('❌ Failed to prepare MAX30102 sensor:', error);
        }
    }, []);

    // =====================================================
    // SENSOR SHUTDOWN - Called when leaving page
    // =====================================================
    const shutdownAllSensors = useCallback(async () => {
        console.log('🔌 Maintenance: Shutting down all sensors...');
        try {
            await Promise.all([
                sensorAPI.shutdownWeight().catch(() => { }),
                sensorAPI.shutdownHeight().catch(() => { }),
                sensorAPI.shutdownTemperature().catch(() => { }),
                sensorAPI.shutdownMax30102().catch(() => { }),
                sensorAPI.reset().catch(() => { })
            ]);
            console.log('✅ All sensors shutdown');
        } catch (error) {
            console.log('⚠️ Sensor shutdown warning:', error);
        }
        sensorPreparedRef.current = { bmi: false, bodytemp: false, max30102: false };
    }, []);

    // =====================================================
    // REAL-TIME POLLING - Fast updates for live data
    // =====================================================
    const pollBMISensors = useCallback(async () => {
        try {
            const [weightRes, heightRes] = await Promise.all([
                sensorAPI.getWeightStatus(),
                sensorAPI.getHeightStatus()
            ]);

            let newWeight = null;
            let newHeight = null;

            if (weightRes.live_data?.current != null) {
                newWeight = parseFloat(weightRes.live_data.current).toFixed(2);
            } else if (weightRes.weight) {
                newWeight = parseFloat(weightRes.weight).toFixed(2);
            }

            if (heightRes.live_data?.current != null) {
                newHeight = parseFloat(heightRes.live_data.current).toFixed(1);
            } else if (heightRes.height) {
                newHeight = parseFloat(heightRes.height).toFixed(1);
            }

            let newBmi = null;
            if (newWeight && newHeight && parseFloat(newWeight) > 0 && parseFloat(newHeight) > 0) {
                const heightM = parseFloat(newHeight) / 100;
                newBmi = (parseFloat(newWeight) / (heightM * heightM)).toFixed(1);
            }

            setSensorData(prev => ({ ...prev, weight: newWeight, height: newHeight, bmi: newBmi }));
            setBackendStatus('Connected');
        } catch (error) {
            console.error('BMI poll error:', error);
        }
    }, []);

    const pollTemperatureSensor = useCallback(async () => {
        try {
            const tempRes = await sensorAPI.getTemperatureStatus();

            let newTemp = null;
            if (tempRes.live_temperature != null) {
                newTemp = parseFloat(tempRes.live_temperature).toFixed(1);
            } else if (tempRes.live_data?.current != null) {
                newTemp = parseFloat(tempRes.live_data.current).toFixed(1);
            } else if (tempRes.temperature) {
                newTemp = parseFloat(tempRes.temperature).toFixed(1);
            }

            setSensorData(prev => ({ ...prev, temperature: newTemp }));
            setBackendStatus('Connected');
        } catch (error) {
            console.error('Temperature poll error:', error);
        }
    }, []);

    const pollMax30102Sensor = useCallback(async () => {
        try {
            const maxRes = await sensorAPI.getMax30102Status();

            setSensorData(prev => ({
                ...prev,
                heartRate: maxRes.heart_rate ? Math.round(maxRes.heart_rate) : null,
                spo2: maxRes.spo2 ? Math.round(maxRes.spo2) : null,
                respiratoryRate: maxRes.respiratory_rate ? Math.round(maxRes.respiratory_rate) : null,
                fingerDetected: maxRes.finger_detected
            }));

            setSensorStatus(prev => ({
                ...prev,
                max30102: maxRes.finger_detected ? 'measuring' : 'active'
            }));

            setBackendStatus('Connected');
        } catch (error) {
            console.error('MAX30102 poll error:', error);
        }
    }, []);

    const pollCameraStatus = useCallback(async () => {
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
        } catch {
            setBackendStatus('Disconnected');
        }
    }, [activeCameraTab]);

    const startCamera = useCallback(async (mode) => {
        try {
            if (mode === 'bp') {
                await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
                await fetch(`${API_BASE}/bp/start`, { method: 'POST' });
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
        } catch (err) {
            console.error('Camera start error:', err);
        }
    }, [settings]);

    const handleCapture = useCallback(async () => {
        try {
            setShowCaptureFlash(true);
            setTimeout(() => setShowCaptureFlash(false), 150);
            await fetch(`${API_BASE}/camera/capture`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_name: selectedClass })
            });
            setCaptureCount(prev => prev + 1);
        } catch (err) {
            console.error('Capture error:', err);
        }
    }, [selectedClass]);

    // =====================================================
    // EFFECTS
    // =====================================================

    // Initial setup and cleanup on unmount
    useEffect(() => {
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
            shutdownAllSensors();
        };
    }, [activeSection, handleCapture, shutdownAllSensors]);

    // Handle section and sensor tab changes
    useEffect(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        if (activeSection === 'sensors') {
            fetch(`${API_BASE}/camera/stop`, { method: 'POST' }).catch(() => { });
            fetch(`${API_BASE}/bp/stop`, { method: 'POST' }).catch(() => { });

            if (activeSensorTab === 'bmi') {
                prepareBMISensors();
                pollIntervalRef.current = setInterval(pollBMISensors, 200);
            } else if (activeSensorTab === 'bodytemp') {
                prepareTemperatureSensor();
                pollIntervalRef.current = setInterval(pollTemperatureSensor, 300);
            } else if (activeSensorTab === 'max30102') {
                prepareMax30102Sensor();
                pollIntervalRef.current = setInterval(pollMax30102Sensor, 200);
            }
        } else if (activeSection === 'cameras') {
            pollIntervalRef.current = setInterval(pollCameraStatus, 1000);
            startCamera(activeCameraTab);
        }

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [activeSection, activeSensorTab, activeCameraTab, prepareBMISensors, prepareTemperatureSensor, prepareMax30102Sensor, pollBMISensors, pollTemperatureSensor, pollMax30102Sensor, pollCameraStatus, startCamera]);

    useEffect(() => {
        if (activeSection === 'cameras' && activeCameraTab !== 'multiview' && modes[activeCameraTab]) {
            setSelectedClass(modes[activeCameraTab][0]);
        }
    }, [activeCameraTab, activeSection]);

    const handleSettingChange = (name, value) => {
        const newSettings = { ...settings, [name]: value };
        setSettings(newSettings);
        const ep = activeCameraTab === 'bp' ? `${API_BASE}/bp/set_settings` : `${API_BASE}/camera/set_settings`;
        fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) }).catch(console.error);
    };

    const [availableCameras, setAvailableCameras] = useState([0, 1, 2]); // 0=Weight, 1=Wearables, 2=BP

    const fetchAvailableCameras = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/camera/list`);
            const data = await res.json();
            if (data.status === 'success' && data.cameras.length > 0) {
                setAvailableCameras(data.cameras);
            } else {
                // Fallback
                setAvailableCameras([0, 1]);
            }
        } catch (e) {
            console.error("Failed to list cameras", e);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        if (activeSection === 'cameras') {
            fetchAvailableCameras();
        }
    }, [activeSection, fetchAvailableCameras]);

    const handleCameraSelect = (index) => {
        setSettings(prev => ({ ...prev, camera_index: index }));

        // Determine endpoint based on active tab
        const endpoint = activeCameraTab === 'bp'
            ? `${API_BASE}/bp/set_camera`
            : `${API_BASE}/camera/set_camera`;

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        }).catch(console.error);
    };

    const handleCameraTabChange = (newTab) => {
        setActiveCameraTab(newTab);

        if (newTab === 'multiview') {
            // Start BOTH cameras for multiview:
            // Camera 0: Wearables Detection (wearables_camera.py) - uses /aux endpoint
            fetch(`${API_BASE}/aux/start`, { method: 'POST', body: JSON.stringify({ index: 0 }), headers: { 'Content-Type': 'application/json' } }).catch(console.error);
            // Camera 1: Weight/Feet Compliance (weight_compliance_camera.py)
            fetch(`${API_BASE}/camera/start`, { method: 'POST', body: JSON.stringify({ index: 1 }), headers: { 'Content-Type': 'application/json' } }).catch(console.error);
            return;
        }

        let newSettings = { ...settings };

        if (newTab === 'bp') {
            // MATCH BloodPressure.jsx Defaults
            newSettings = {
                ...newSettings,
                zoom: 1.5,
                rotation: 0,
                square_crop: true
            };
        } else {
            // MATCH Camera Manager Defaults
            newSettings = {
                ...newSettings,
                zoom: 1.3,
                rotation: 0,
                square_crop: true
            };
        }

        setSettings(newSettings);
    };

    // Helper to label cameras based on physical setup
    const getCameraLabel = (idx) => {
        if (idx === 0) return 'Wearables';
        if (idx === 1) return 'Weight (Feet)';
        if (idx === 2) return 'BP Monitor';
        return `CAM ${idx}`;
    };

    const renderSensorCard = (title, icon, value, unit, status, onStart) => (
        <div className={`sensor-card ${status}`}>
            <div className="sensor-card-header">{icon}<h3>{title}</h3></div>
            <div className="sensor-card-value">
                <span className="value">{value ?? '--'}</span>
                <span className="unit">{unit}</span>
            </div>
            <div className="sensor-card-status">
                <span className={`status-badge ${status}`}>
                    {status === 'idle' ? '⏸️ IDLE' : status === 'measuring' ? '🔄 MEASURING...' : '🟢 LIVE'}
                </span>
            </div>
            <button className="sensor-start-btn" onClick={onStart} disabled={status === 'measuring'}>
                <PlayArrow /> {status === 'measuring' ? 'Measuring...' : 'Trigger Test'}
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
                <button className={`section-tab ${activeSection === 'sensors' ? 'active' : ''}`} onClick={() => setActiveSection('sensors')}>
                    <FitnessCenter /> Physical Sensors
                </button>
                <button className={`section-tab ${activeSection === 'cameras' ? 'active' : ''}`} onClick={() => setActiveSection('cameras')}>
                    <CameraAlt /> AI Vision Models
                </button>
                <button className={`section-tab ${activeSection === 'printer' ? 'active' : ''}`} onClick={() => setActiveSection('printer')}>
                    <Print /> System Printer
                </button>
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
                                    <p className="sensor-description">
                                        🔴 <strong>LIVE</strong> - Real-time data from weight loadcells and LiDAR height sensors.
                                    </p>
                                    <div className="sensor-cards-grid">
                                        {renderSensorCard('Weight', <FitnessCenter />, sensorData.weight, 'kg', sensorStatus.weight, sensorAPI.startWeight)}
                                        {renderSensorCard('Height', <Speed />, sensorData.height, 'cm', sensorStatus.height, sensorAPI.startHeight)}
                                        <div className="sensor-card bmi-result">
                                            <div className="sensor-card-header"><FitnessCenter /><h3>Computed BMI</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.bmi ?? '--'}</span><span className="unit">kg/m²</span></div>
                                            <div className="sensor-card-status">
                                                <span className="status-badge active">{sensorData.bmi ? '✅ Auto-Calculated' : '⏳ Waiting...'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {activeSensorTab === 'bodytemp' && (
                                <>
                                    <h2>🌡️ IR Body Temperature Sensor</h2>
                                    <p className="sensor-description">
                                        🔴 <strong>LIVE</strong> - MLX90614 non-contact temperature sensor.
                                    </p>
                                    <div className="sensor-cards-grid">
                                        {renderSensorCard('Body Temp', <Thermostat />, sensorData.temperature, '°C', sensorStatus.temperature, sensorAPI.startTemperature)}
                                    </div>
                                </>
                            )}
                            {activeSensorTab === 'max30102' && (
                                <>
                                    <h2>❤️ MAX30102 Pulse Oximetry</h2>
                                    <p className="sensor-description">
                                        🔴 <strong>LIVE</strong> - Place finger on pulse oximeter.
                                        {sensorData.fingerDetected ? ' ✅ Finger Detected!' : ' ⏳ Waiting for finger...'}
                                    </p>
                                    <div className="sensor-cards-grid">
                                        <div className={`sensor-card ${sensorData.fingerDetected ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Favorite /><h3>Heart Rate</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.heartRate ?? '--'}</span><span className="unit">BPM</span></div>
                                            <div className="sensor-card-status">
                                                <span className={`status-badge ${sensorData.fingerDetected ? 'measuring' : 'active'}`}>
                                                    {sensorData.fingerDetected ? '🔄 Reading...' : '🟢 Ready'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`sensor-card ${sensorData.fingerDetected ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Speed /><h3>SpO2 Oxygen</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.spo2 ?? '--'}</span><span className="unit">%</span></div>
                                            <div className="sensor-card-status">
                                                <span className={`status-badge ${sensorData.fingerDetected ? 'measuring' : 'active'}`}>
                                                    {sensorData.fingerDetected ? '🔄 Reading...' : '🟢 Ready'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`sensor-card ${sensorData.fingerDetected ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Speed /><h3>Resp. Rate</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.respiratoryRate ?? '--'}</span><span className="unit">/min</span></div>
                                            <div className="sensor-card-status">
                                                <span className={`status-badge ${sensorData.fingerDetected ? 'measuring' : 'active'}`}>
                                                    {sensorData.fingerDetected ? '🔄 Reading...' : '🟢 Ready'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeSection === 'cameras' && (
                    <div className="cameras-section">
                        <div className="camera-col">
                            <div className="sensor-tabs" style={{ marginBottom: '1.5rem' }}>
                                <button className={`sensor-tab ${activeCameraTab === 'bp' ? 'active' : ''}`} onClick={() => handleCameraTabChange('bp')}>BP Camera</button>
                                <button className={`sensor-tab ${activeCameraTab === 'feet' ? 'active' : ''}`} onClick={() => handleCameraTabChange('feet')}>Feet Detector</button>
                                <button className={`sensor-tab ${activeCameraTab === 'body' ? 'active' : ''}`} onClick={() => handleCameraTabChange('body')}>Wearables</button>
                                <button className={`sensor-tab ${activeCameraTab === 'multiview' ? 'active' : ''}`} onClick={() => handleCameraTabChange('multiview')}>Multiview</button>
                            </div>

                            {activeCameraTab === 'multiview' ? (
                                <div className="multiview-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                    gap: '1rem',
                                    width: '100%'
                                }}>
                                    {/* Camera 0: Wearables */}
                                    <div className="camera-viewport-container" style={{ aspectRatio: '4/3', border: '2px solid #334155', position: 'relative', background: '#000' }}>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                            Signal Lost or Connecting...
                                        </div>
                                        <img
                                            src={`${API_BASE}/aux/video_feed?t=${Date.now()}`}
                                            alt="Wearables Feed"
                                            className="main-feed"
                                            style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }}
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                        <div className="viewport-overlay-premium" style={{ pointerEvents: 'none', background: 'transparent', zIndex: 2 }}>
                                            <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                                Wearables
                                            </div>
                                            <div style={{ background: 'rgba(59,130,246,0.8)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                CAM 0 (Wearables)
                                            </div>
                                        </div>
                                    </div>

                                    {/* Camera 1: Weight/Feet */}
                                    <div className="camera-viewport-container" style={{ aspectRatio: '4/3', border: '2px solid #334155', position: 'relative', background: '#000' }}>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                            Signal Lost or Connecting...
                                        </div>
                                        <img
                                            src={`${API_BASE}/camera/video_feed?t=${Date.now()}`}
                                            alt="Weight/Feet Feed"
                                            className="main-feed"
                                            style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }}
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                        <div className="viewport-overlay-premium" style={{ pointerEvents: 'none', background: 'transparent', zIndex: 2 }}>
                                            <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                                Weight/Feet
                                            </div>
                                            <div style={{ background: 'rgba(34,197,94,0.8)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                CAM 1 (Weight)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="camera-viewport-container"
                                    style={isFullScreen ? {
                                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                                        maxWidth: '100%', margin: 0, zIndex: 9999, borderRadius: 0
                                    } : {
                                        maxWidth: `${settings.viewport_size}%`, margin: '0 auto', position: 'relative', width: '100%'
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
                                                backdropFilter: 'blur(5px)', pointerEvents: 'auto'
                                            }}
                                        >
                                            {isFullScreen ? <FullscreenExit /> : <Fullscreen />}
                                        </button>
                                        <div className="overlay-bottom">
                                            <div className="session-stats">Collected: {captureCount} Samples</div>
                                            {/* Camera Selection UI inside Viewport */}
                                            <div className="camera-selector-overlay" style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
                                                {availableCameras.map(idx => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleCameraSelect(idx)}
                                                        className={`cam-select-btn ${settings.camera_index === idx ? 'active' : ''}`}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            background: settings.camera_index === idx ? '#dc2626' : 'rgba(0,0,0,0.6)',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        {getCameraLabel(idx)}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={fetchAvailableCameras}
                                                    className="cam-select-btn"
                                                    style={{ padding: '6px 8px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}
                                                    title="Refresh Camera List"
                                                >
                                                    ↻
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeCameraTab !== 'multiview' && <div className="capture-actions">
                                <div className="sensor-tabs" style={{ width: '100%', flexWrap: 'wrap' }}>
                                    {modes[activeCameraTab] && modes[activeCameraTab].map(cls => (
                                        <button key={cls} className={`sensor-tab ${selectedClass === cls ? 'active' : ''}`} onClick={() => setSelectedClass(cls)}>{cls}</button>
                                    ))}
                                </div>
                                <button className="capture-btn-premium" onClick={handleCapture}><CameraAlt /> CAPTURE SAMPLE <span className="kb-hint">(Space)</span></button>
                            </div>}
                        </div>

                        {activeCameraTab !== 'multiview' && <div className="camera-settings-panel">
                            <div className="settings-group">
                                <h3><Settings /> Image Calibration</h3>
                                <div className="setting-item">
                                    <label>Viewport Size <span>{settings.viewport_size}%</span></label>
                                    <input type="range" min="50" max="100" step="5" value={settings.viewport_size} onChange={(e) => handleSettingChange('viewport_size', parseInt(e.target.value))} />
                                </div>
                                <div className="setting-item">
                                    <label>Rotation <span>{settings.rotation}°</span></label>
                                    <div className="sensor-tabs" style={{ width: '100%', flexWrap: 'wrap', gap: '0.5rem', background: '#f8fafc' }}>
                                        {[0, 90, 180, 270].map(deg => (
                                            <button
                                                key={deg}
                                                className={`sensor-tab ${settings.rotation === deg ? 'active' : ''}`}
                                                onClick={() => handleSettingChange('rotation', deg)}
                                                style={{ flex: 1, minWidth: '60px', padding: '0.4rem', justifyContent: 'center' }}
                                            >
                                                {deg}°
                                            </button>
                                        ))}
                                    </div>
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
                        </div>}
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
