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
    bp: ["error", "null", "numbers"]
};

const Maintenance = () => {
    const [activeSection, setActiveSection] = useState('sensors');
    const [activeSensorTab, setActiveSensorTab] = useState('all'); // Start with ALL sensors view
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
        zoom: 1.4,  // Default 1.4x zoom for BP camera per user preference
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

    const [cameraConfig, setCameraConfig] = useState({
        weight_index: 0,
        wearables_index: 2,
        bp_index: 1
    });

    const [aiEnabled, setAiEnabled] = useState(false); // Default to AI Disabled

    const fetchCameraConfig = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/camera/config`);
            if (res.ok) {
                const data = await res.json();
                setCameraConfig(data);
            }
        } catch (e) { console.error("Config fetch failed", e); }
    }, []);

    const saveCameraConfig = async (newConfig) => {
        try {
            setCameraConfig(newConfig);
            await fetch(`${API_BASE}/camera/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            // Force restart cameras with new indices
            if (activeCameraTab === 'multiview') {
                // Stop first to ensure clean restart with new index
                await fetch(`${API_BASE}/aux/stop`, { method: 'POST' });
                await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
                await fetch(`${API_BASE}/bp/stop`, { method: 'POST' });

                // Short delay
                setTimeout(() => {
                    handleCameraTabChange('multiview');
                }, 500);
            }
        } catch (e) { console.error("Config save failed", e); }
    };


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

    // MAX30102 Test Logic
    const [max30102TestActive, setMax30102TestActive] = useState(false);
    const [max30102Progress, setMax30102Progress] = useState(0);
    const hrReadingsRef = useRef([]);
    const spo2ReadingsRef = useRef([]);
    const rrReadingsRef = useRef([]);

    const startMax30102Test = useCallback(async () => {
        console.log('🚀 Starting MAX30102 Maintenance Test...');
        // Reset readings
        hrReadingsRef.current = [];
        spo2ReadingsRef.current = [];
        rrReadingsRef.current = [];
        setMax30102Progress(0);
        setMax30102TestActive(true);
        setSensorData(prev => ({
            ...prev,
            heartRate: '--',
            spo2: '--',
            respiratoryRate: '--'
        }));

        await sensorAPI.startMax30102();
    }, []);

    const stopMax30102Test = useCallback(async () => {
        console.log('🛑 Stopping MAX30102 Maintenance Test...');
        setMax30102TestActive(false);
        await sensorAPI.stopMax30102();

        // Calculate averages
        const calculateAverage = (arr) => {
            if (arr.length === 0) return '--';
            // Filter out invalid/zero values
            const valid = arr.filter(v => v > 0);
            if (valid.length === 0) return '--';
            const sum = valid.reduce((a, b) => a + b, 0);
            return Math.round(sum / valid.length);
        };

        const avgHR = calculateAverage(hrReadingsRef.current);
        const avgSpO2 = calculateAverage(spo2ReadingsRef.current);
        const avgRR = calculateAverage(rrReadingsRef.current);

        console.log('📊 MAX30102 Test Results:', { avgHR, avgSpO2, avgRR });

        setSensorData(prev => ({
            ...prev,
            heartRate: avgHR,
            spo2: avgSpO2,
            respiratoryRate: avgRR
        }));

    }, []);

    const pollMax30102Sensor = useCallback(async () => {
        try {
            const maxRes = await sensorAPI.getMax30102Status();

            // If test is NOT active, just show live data (or '--' if no finger)
            if (!max30102TestActive) {
                setSensorData(prev => ({
                    ...prev,
                    heartRate: maxRes.heart_rate ? Math.round(maxRes.heart_rate) : '--',
                    spo2: maxRes.spo2 ? Math.round(maxRes.spo2) : '--',
                    respiratoryRate: maxRes.respiratory_rate ? Math.round(maxRes.respiratory_rate) : '--',
                    fingerDetected: maxRes.finger_detected
                }));
            } else {
                // Test IS active - handle progress and collection
                setSensorData(prev => ({
                    ...prev,
                    fingerDetected: maxRes.finger_detected
                }));

                if (maxRes.finger_detected) {
                    // Update live display during test too? 
                    // The main page shows "--" or live? Main page shows live updates.
                    setSensorData(prev => ({
                        ...prev,
                        heartRate: maxRes.heart_rate ? Math.round(maxRes.heart_rate) : '--',
                        spo2: maxRes.spo2 ? Math.round(maxRes.spo2) : '--',
                        respiratoryRate: maxRes.respiratory_rate ? Math.round(maxRes.respiratory_rate) : '--',
                    }));

                    // Collect valid stable readings
                    if (maxRes.heart_rate && maxRes.heart_rate > 40) hrReadingsRef.current.push(maxRes.heart_rate);
                    if (maxRes.spo2 && maxRes.spo2 > 50) spo2ReadingsRef.current.push(maxRes.spo2);
                    if (maxRes.respiratory_rate && maxRes.respiratory_rate > 5) rrReadingsRef.current.push(maxRes.respiratory_rate);

                    // Increment progress (called every 200ms -> 5 steps per second)
                    setMax30102Progress(prev => {
                        const newProgress = prev + (100 / (30 * 5)); // 100% over 30s * 5Hz
                        if (newProgress >= 100) {
                            setTimeout(stopMax30102Test, 0); // Finish test
                            return 100;
                        }
                        return newProgress;
                    });
                }
            }

            setSensorStatus(prev => ({
                ...prev,
                max30102: max30102TestActive ? 'recording' : (maxRes.finger_detected ? 'measuring' : 'active')
            }));

            setBackendStatus('Connected');
        } catch (error) {
            console.error('MAX30102 poll error:', error);
        }
    }, [max30102TestActive, stopMax30102Test]);

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

    const startCamera = useCallback(async (mode, enableAI = aiEnabled) => {
        try {
            if (mode === 'bp') {
                await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
                // Pass enable_ai based on state
                await fetch(`${API_BASE}/bp/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        index: cameraConfig.bp_index,
                        enable_ai: enableAI,
                        mode: 'maintenance'
                    })
                });
                await fetch(`${API_BASE}/bp/set_settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
            } else {
                await fetch(`${API_BASE}/bp/stop`, { method: 'POST' });

                // Determine index based on mode/tab
                const targetIndex = mode === 'body'
                    ? cameraConfig.wearables_index
                    : cameraConfig.weight_index; // default to feet/weight

                await fetch(`${API_BASE}/camera/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ index: targetIndex })
                });

                // If AI Enabled -> Use 'feet' or 'body' mode
                // If AI Disabled -> Use 'capture_only'
                const targetMode = enableAI
                    ? (mode === 'body' ? 'body' : 'feet')
                    : 'capture_only';

                await fetch(`${API_BASE}/camera/set_mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: targetMode })
                });
            }
        } catch (err) {
            console.error('Camera start error:', err);
        }
    }, [settings, cameraConfig, aiEnabled]);

    const handleCapture = useCallback(async () => {
        try {
            setShowCaptureFlash(true);
            setTimeout(() => setShowCaptureFlash(false), 150);

            const endpoint = activeCameraTab === 'bp' ? `${API_BASE}/bp/capture` : `${API_BASE}/camera/capture`;

            await fetch(endpoint, {
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

    // Keydown handler
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
        };
    }, [activeSection, handleCapture]);

    // Cleanup on section change or unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            fetch(`${API_BASE}/camera/stop`, { method: 'POST' }).catch(() => { });
            fetch(`${API_BASE}/bp/stop`, { method: 'POST' }).catch(() => { });
            shutdownAllSensors();
        };
    }, [activeSection, shutdownAllSensors]);

    // Handle section and sensor tab changes
    useEffect(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        if (activeSection === 'sensors') {
            fetch(`${API_BASE}/camera/stop`, { method: 'POST' }).catch(() => { });
            fetch(`${API_BASE}/bp/stop`, { method: 'POST' }).catch(() => { });

            if (activeSensorTab === 'all') {
                // ALL SENSORS MODE - Frontend commands backend to power up everything
                console.log('🔴 ALL SENSORS MODE - Commanding backend to power up all sensors...');
                prepareBMISensors();
                prepareTemperatureSensor();
                prepareMax30102Sensor();

                // Poll ALL sensors simultaneously at 100ms
                pollIntervalRef.current = setInterval(async () => {
                    await Promise.all([
                        pollBMISensors(),
                        pollTemperatureSensor(),
                        pollMax30102Sensor()
                    ]);
                }, 100); // UNIFORM 100ms for all sensors

            } else if (activeSensorTab === 'bmi') {
                prepareBMISensors();
                pollIntervalRef.current = setInterval(pollBMISensors, 100); // UNIFORM 100ms
            } else if (activeSensorTab === 'bodytemp') {
                prepareTemperatureSensor();
                pollIntervalRef.current = setInterval(pollTemperatureSensor, 100); // UNIFORM 100ms
            } else if (activeSensorTab === 'max30102') {
                prepareMax30102Sensor();
                pollIntervalRef.current = setInterval(pollMax30102Sensor, 100); // UNIFORM 100ms
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
    // Initial fetch
    useEffect(() => {
        if (activeSection === 'cameras') {
            fetchAvailableCameras();
            fetchCameraConfig();
        }
    }, [activeSection, fetchAvailableCameras, fetchCameraConfig]);


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
            // Start BOTH cameras for multiview based on CONFIG:
            // Camera 0: Wearables Detection (wearables_camera.py) - uses /aux endpoint
            fetch(`${API_BASE}/aux/start`, { method: 'POST', body: JSON.stringify({ index: cameraConfig.wearables_index }), headers: { 'Content-Type': 'application/json' } }).catch(console.error);
            // Camera 1: Weight/Feet Compliance (weight_compliance_camera.py)
            fetch(`${API_BASE}/camera/start`, { method: 'POST', body: JSON.stringify({ index: cameraConfig.weight_index }), headers: { 'Content-Type': 'application/json' } }).catch(console.error);
            return;
        }

        let newSettings = { ...settings };

        if (newTab === 'bp') {
            // MATCH BloodPressure.jsx Defaults
            newSettings = {
                ...newSettings,
                zoom: 1.4,  // Default 1.4x zoom per user preference
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
                            <button className={`sensor-tab ${activeSensorTab === 'all' ? 'active' : ''}`} onClick={() => setActiveSensorTab('all')}>🔴 ALL SENSORS LIVE</button>
                            <button className={`sensor-tab ${activeSensorTab === 'bmi' ? 'active' : ''}`} onClick={() => setActiveSensorTab('bmi')}>BMI Hardware</button>
                            <button className={`sensor-tab ${activeSensorTab === 'bodytemp' ? 'active' : ''}`} onClick={() => setActiveSensorTab('bodytemp')}>IR Temperature</button>
                            <button className={`sensor-tab ${activeSensorTab === 'max30102' ? 'active' : ''}`} onClick={() => setActiveSensorTab('max30102')}>Pulse Oximeter</button>
                        </div>
                        <div className="sensor-content">
                            {activeSensorTab === 'all' && (
                                <>
                                    <h2>🔴 ALL SENSORS - CONTINUOUS LIVE MONITORING</h2>
                                    <p className="sensor-description">
                                        Real-time data from all 4 Mega sensors updating every 100ms | Backend: {backendStatus}
                                    </p>
                                    <div className="sensor-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                        {/* Weight */}
                                        <div className={`sensor-card ${sensorStatus.weight === 'active' ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><FitnessCenter /><h3>Weight</h3></div>
                                            <div className="sensor-card-value">
                                                <span className="value">{sensorData.weight ?? '--'}</span>
                                                <span className="unit">kg</span>
                                            </div>
                                            <div className="sensor-card-status">
                                                <span className="status-badge active">{sensorData.weight ? '🟢 Live' : '⏸️ Idle'}</span>
                                            </div>
                                        </div>

                                        {/* Height */}
                                        <div className={`sensor-card ${sensorStatus.height === 'active' ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Speed /><h3>Height</h3></div>
                                            <div className="sensor-card-value">
                                                <span className="value">{sensorData.height ?? '--'}</span>
                                                <span className="unit">cm</span>
                                            </div>
                                            <div className="sensor-card-status">
                                                <span className="status-badge active">{sensorData.height ? '🟢 Live' : '⏸️ Idle'}</span>
                                            </div>
                                        </div>

                                        {/* Temperature */}
                                        <div className={`sensor-card ${sensorStatus.temperature === 'active' ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Thermostat /><h3>Body Temp</h3></div>
                                            <div className="sensor-card-value">
                                                <span className="value">{sensorData.temperature ?? '--'}</span>
                                                <span className="unit">°C</span>
                                            </div>
                                            <div className="sensor-card-status">
                                                <span className="status-badge active">{sensorData.temperature ? '🟢 Live' : '⏸️ Idle'}</span>
                                            </div>
                                        </div>

                                        {/* MAX30102 Heart Rate */}
                                        <div className={`sensor-card ${sensorData.fingerDetected ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Favorite /><h3>Heart Rate</h3></div>
                                            <div className="sensor-card-value">
                                                <span className="value">{sensorData.heartRate ?? '--'}</span>
                                                <span className="unit">BPM</span>
                                            </div>
                                            <div className="sensor-card-status">
                                                <span className={`status-badge ${sensorData.fingerDetected ? 'active' : 'idle'}`}>
                                                    {sensorData.fingerDetected ? '👆 Finger Detected' : '⏸️ No Finger'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* MAX30102 SpO2 */}
                                        <div className={`sensor-card ${sensorData.fingerDetected ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Speed /><h3>SpO2 Oxygen</h3></div>
                                            <div className="sensor-card-value">
                                                <span className="value">{sensorData.spo2 ?? '--'}</span>
                                                <span className="unit">%</span>
                                            </div>
                                            <div className="sensor-card-status">
                                                <span className={`status-badge ${sensorData.fingerDetected ? 'active' : 'idle'}`}>
                                                    {sensorData.fingerDetected ? '🟢 Live' : '⏸️ Idle'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Computed BMI */}
                                        <div className="sensor-card bmi-result">
                                            <div className="sensor-card-header"><FitnessCenter /><h3>Computed BMI</h3></div>
                                            <div className="sensor-card-value">
                                                <span className="value">{sensorData.bmi ?? '--'}</span>
                                                <span className="unit">kg/m²</span>
                                            </div>
                                            <div className="sensor-card-status">
                                                <span className="status-badge active">{sensorData.bmi ? '✅ Auto-Calculated' : '⏳ Waiting...'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
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
                                    <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
                                        <div style={{
                                            padding: '12px',
                                            borderRadius: '8px',
                                            marginBottom: '1rem',
                                            background: sensorData.fingerDetected ? '#dcfce7' : '#fee2e2',
                                            color: sensorData.fingerDetected ? '#166534' : '#991b1b',
                                            border: `1px solid ${sensorData.fingerDetected ? '#86efac' : '#fca5a5'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '1.1rem',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {sensorData.fingerDetected
                                                ? <>✅ FINGER DETECTED - SENSOR READY</>
                                                : <>⚠️ FINGER NOT DETECTED - PLACE FINGER TO MEASURE</>
                                            }
                                        </div>
                                        <p className="sensor-description" style={{ marginBottom: '1rem' }}>
                                            {max30102TestActive
                                                ? `⚠️ KEEP FINGER STILL! Measuring... ${Math.round(max30102Progress)}%`
                                                : "🔴 LIVE - Instant readings shown below. Click 'Start Test' for standardized 30s cycle."}
                                        </p>

                                        {!max30102TestActive ? (
                                            <button
                                                onClick={startMax30102Test}
                                                disabled={!sensorData.fingerDetected}
                                                style={{
                                                    padding: '10px 20px',
                                                    background: sensorData.fingerDetected ? '#dc2626' : '#94a3b8',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: sensorData.fingerDetected ? 'pointer' : 'not-allowed',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontSize: '1rem',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                <PlayArrow /> Start 30s Test
                                            </button>
                                        ) : (
                                            <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        width: `${max30102Progress}%`,
                                                        height: '100%',
                                                        background: '#dc2626',
                                                        transition: 'width 0.2s linear'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="sensor-cards-grid">
                                        <div className={`sensor-card ${sensorData.fingerDetected ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Favorite /><h3>Heart Rate</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.heartRate ?? '--'}</span><span className="unit">BPM</span></div>
                                            <div className="sensor-card-status">
                                                <span className={`status-badge ${max30102TestActive ? 'measuring' : (sensorData.fingerDetected ? 'active' : 'idle')}`}>
                                                    {max30102TestActive ? '🔄 Recording' : (sensorData.fingerDetected ? '🟢 Live' : '⏳ Idle')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`sensor-card ${sensorData.fingerDetected ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Speed /><h3>SpO2 Oxygen</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.spo2 ?? '--'}</span><span className="unit">%</span></div>
                                            <div className="sensor-card-status">
                                                <span className={`status-badge ${max30102TestActive ? 'measuring' : (sensorData.fingerDetected ? 'active' : 'idle')}`}>
                                                    {max30102TestActive ? '🔄 Recording' : (sensorData.fingerDetected ? '🟢 Live' : '⏳ Idle')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`sensor-card ${sensorData.fingerDetected ? 'measuring' : ''}`}>
                                            <div className="sensor-card-header"><Speed /><h3>Resp. Rate</h3></div>
                                            <div className="sensor-card-value"><span className="value">{sensorData.respiratoryRate ?? '--'}</span><span className="unit">/min</span></div>
                                            <div className="sensor-card-status">
                                                <span className={`status-badge ${max30102TestActive ? 'measuring' : (sensorData.fingerDetected ? 'active' : 'idle')}`}>
                                                    {max30102TestActive ? '🔄 Recording' : (sensorData.fingerDetected ? '🟢 Live' : '⏳ Idle')}
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
                                <div style={{ width: '100%' }}>
                                    {/* Simple Camera Index Tester */}
                                    <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#333' }}>
                                        📷 Camera Index Verification Tool
                                    </h3>
                                    <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
                                        Click each button to open that camera index and verify which physical camera it shows.
                                    </p>

                                    {/* Index Selection Buttons */}
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                        {[0, 1, 2].map(idx => (
                                            <button
                                                key={idx}
                                                onClick={async () => {
                                                    // Stop all cameras first
                                                    await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
                                                    await fetch(`${API_BASE}/bp/stop`, { method: 'POST' });
                                                    await fetch(`${API_BASE}/aux/stop`, { method: 'POST' });

                                                    // Wait a bit
                                                    await new Promise(r => setTimeout(r, 300));

                                                    // Start the selected camera index using /camera/start
                                                    await fetch(`${API_BASE}/camera/start`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ index: idx })
                                                    });

                                                    // Update state
                                                    setSettings(prev => ({ ...prev, camera_index: idx }));
                                                }}
                                                style={{
                                                    padding: '1rem 2rem',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    borderRadius: '12px',
                                                    border: settings.camera_index === idx ? '3px solid #dc2626' : '2px solid #ddd',
                                                    background: settings.camera_index === idx ? '#fee2e2' : '#fff',
                                                    color: settings.camera_index === idx ? '#dc2626' : '#333',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    minWidth: '120px'
                                                }}
                                            >
                                                Index {idx}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Camera Feed Display */}
                                    <div style={{
                                        position: 'relative',
                                        maxWidth: '600px',
                                        margin: '0 auto',
                                        background: '#000',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: '3px solid #dc2626'
                                    }}>
                                        {/* Video Feed */}
                                        <img
                                            src={`${API_BASE}/camera/video_feed?t=${Date.now()}`}
                                            alt="Camera Feed"
                                            style={{
                                                width: '100%',
                                                aspectRatio: '4/3',
                                                objectFit: 'contain',
                                                display: 'block'
                                            }}
                                        />

                                        {/* Index Label Overlay */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'rgba(220, 38, 38, 0.95)',
                                            color: 'white',
                                            padding: '1rem',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                                🔴 CAMERA INDEX: {settings.camera_index}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                                {settings.camera_index === 0 && "VERIFIED: Weight Compliance Camera (Feet/Platform) 🦶"}
                                                {settings.camera_index === 1 && "Shows: Blood Pressure Camera (BP Monitor) 🩸"}
                                                {settings.camera_index === 2 && "Shows: Wearables Compliance Camera (Body) 👕"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Reference Table */}
                                    <div style={{
                                        marginTop: '1.5rem',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        maxWidth: '600px',
                                        margin: '1.5rem auto'
                                    }}>
                                        <h4 style={{ marginBottom: '0.5rem', color: '#333' }}>📋 VERIFIED Camera Mapping:</h4>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ background: '#e2e8f0' }}>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Index</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Camera</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Shows</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr style={{ background: '#dcfce7' }}>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>0</td>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Weight Compliance</td>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Feet/Platform 🦶 ✅</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>1</td>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Blood Pressure</td>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>BP Monitor 🩸</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>2</td>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Wearables Compliance</td>
                                                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>Body/Person 👕</td>
                                                </tr>
                                            </tbody>
                                        </table>
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

                        {
                            activeCameraTab !== 'multiview' && <div className="camera-settings-panel">
                                <div className="settings-group">
                                    <h3><Settings /> Image Calibration</h3>
                                    <div className="setting-item" style={{ marginBottom: '1.5rem', background: '#f1f5f9', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>Enable AI Detection</span>
                                            <span style={{ fontSize: '0.8rem', color: aiEnabled ? '#166534' : '#64748b' }}>
                                                {aiEnabled ? 'ON (Analyzing)' : 'OFF (Raw Feed)'}
                                            </span>
                                        </label>
                                        <button
                                            className="sensor-start-btn"
                                            onClick={() => {
                                                const newState = !aiEnabled;
                                                setAiEnabled(newState);
                                                startCamera(activeCameraTab, newState);
                                            }}
                                            style={{
                                                background: aiEnabled ? '#16a34a' : '#cbd5e1',
                                                color: aiEnabled ? 'white' : '#475569',
                                                justifyContent: 'center',
                                                border: 'none'
                                            }}
                                        >
                                            {aiEnabled ? '🦾 AI ACTIVE' : '📷 RAW CAMERA'}
                                        </button>
                                    </div>
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
                            </div>
                        }
                    </div >
                )}

                {
                    activeSection === 'printer' && (
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
                    )
                }
            </main >
        </div >
    );
};

export default Maintenance;
