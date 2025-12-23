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
    PhotoLibrary,
    FlashOn,
    Settings,
    FlipCameraIos,
    MonitorHeart,
    PlayArrow
} from '@mui/icons-material';
import './Maintenance.css';

const Maintenance = () => {
    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState('feet'); // 'feet', 'body', or 'bp'
    const [backendStatus, setBackendStatus] = useState('Disconnected');
    const [complianceStatus, setComplianceStatus] = useState('Waiting...');
    const [isCompliant, setIsCompliant] = useState(false);
    const [fps, setFps] = useState(0);
    const [captureCount, setCaptureCount] = useState(0);
    const [lastCapturePath, setLastCapturePath] = useState('');
    const [showCaptureFlash, setShowCaptureFlash] = useState(false);

    // BP Reading State
    const [bpReading, setBpReading] = useState(null);
    const [isBpReading, setIsBpReading] = useState(false);
    const [bpHistory, setBpHistory] = useState([]);

    // Camera Settings State
    const [settings, setSettings] = useState({
        zoom: 1.0,
        brightness: 1.0,
        contrast: 1.0,
        rotation: 0,
        square_crop: true,
        camera_index: 0
    });

    const [selectedClass, setSelectedClass] = useState('');

    const modes = {
        feet: ["platform", "barefeet", "socks", "footwear"],
        body: ["null", "bag", "cap", "id", "watch"],
        bp: [] // No capture classes for BP mode
    };

    useEffect(() => {
        startCamera();
        const interval = setInterval(checkStatus, 1000);

        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                handleCapture();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearInterval(interval);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []); // Only on mount

    useEffect(() => {
        setSelectedClass(modes[activeTab][0]);
    }, [activeTab]);

    const startCamera = async () => {
        try {
            await fetch('/api/camera/start', { method: 'POST' });
            updateSettingsOnBackend(settings);
            handleTabChange(activeTab);
        } catch (err) { console.error(err); }
    };

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/camera/status');
            const data = await res.json();
            setComplianceStatus(data.message);
            setIsCompliant(data.is_compliant);
            if (data.fps !== undefined) setFps(data.fps);
            setBackendStatus('Connected');
        } catch (err) { setBackendStatus('Disconnected'); }
    };

    const updateSettingsOnBackend = async (newSettings) => {
        try {
            await fetch('/api/camera/set_settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
        } catch (err) { console.error(err); }
    };

    const handleTabChange = async (mode) => {
        setActiveTab(mode);
        // Camera mapping: 0=feet, 1=body, 2=blood pressure
        let recommendedIndex;
        if (mode === 'feet') recommendedIndex = 0;
        else if (mode === 'body') recommendedIndex = 1;
        else recommendedIndex = 2; // BP uses camera 2

        const backendMode = mode === 'bp' ? 'reading' : mode;
        setSettings(prev => ({ ...prev, camera_index: recommendedIndex }));

        // Clear BP reading when switching tabs
        if (mode !== 'bp') {
            setBpReading(null);
        }

        try {
            await fetch('/api/camera/set_mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: backendMode })
            });
            await fetch('/api/camera/set_camera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: recommendedIndex })
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
            await fetch('/api/camera/set_camera', {
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

    const handleCapture = async () => {
        // Use a ref-like approach to get current selectedClass if needed, 
        // but here we just need the state at trigger time.
        // To be safe with the event listener, we use a global-ish way or just ensure binding.
        // The event listener is updated via the first useEffect dependency if we want latest,
        // but it's better to use a ref for the capture function or just rely on the component re-render.

        try {
            setShowCaptureFlash(true);
            setTimeout(() => setShowCaptureFlash(false), 150);

            // We need to get the latest selectedClass. Since handleCapture is recreated
            // on every render, it should have the latest state if we didn't use [] deps.
            // But we used [] to avoid multiple listeners. 
            // Fix: Re-attach listener or use a ref. Let's use a simple approach:
            const currentClass = document.querySelector('.class-btn.active')?.dataset.class || 'unknown';

            const res = await fetch('/api/camera/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_name: currentClass })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setCaptureCount(prev => prev + 1);
                setLastCapturePath(data.filepath);
            }
        } catch (err) { console.error(err); }
    };

    const handleRestart = async () => {
        setBackendStatus('Restarting...');
        await fetch('/api/camera/stop', { method: 'POST' });
        setTimeout(startCamera, 1000);
    };

    const handleBpRead = async () => {
        if (isBpReading) return; // Prevent double-clicks

        setIsBpReading(true);
        setBpReading(null);
        setShowCaptureFlash(true);
        setTimeout(() => setShowCaptureFlash(false), 150);

        try {
            const res = await fetch('/api/bp-camera/analyze-bp-camera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                const reading = {
                    systolic: data.systolic,
                    diastolic: data.diastolic,
                    timestamp: new Date().toLocaleTimeString()
                };
                setBpReading(reading);
                setBpHistory(prev => [reading, ...prev].slice(0, 10)); // Keep last 10 readings
            } else {
                setBpReading({ error: data.message || 'Could not read BP values' });
            }
        } catch (err) {
            console.error('BP Read error:', err);
            setBpReading({ error: 'Failed to connect to AI service' });
        } finally {
            setIsBpReading(false);
        }
    };

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
                    <h1>AI Maintenance & Data Collector</h1>
                    <p className="path-display">Saving to: C:\Users\VitalSign\Pictures\Camera Roll</p>
                </div>
                <div className="header-status">
                    <span className={`status-dot ${backendStatus === 'Connected' ? 'online' : 'offline'}`}></span>
                    {backendStatus}
                </div>
            </header>

            <main className="maintenance-main">
                <div className="left-panel">
                    <div className="tabs-container">
                        <button className={`tab-btn ${activeTab === 'feet' ? 'active' : ''}`} onClick={() => handleTabChange('feet')}>Weight (Feet)</button>
                        <button className={`tab-btn ${activeTab === 'body' ? 'active' : ''}`} onClick={() => handleTabChange('body')}>Body (Wearables)</button>
                        <button className={`tab-btn ${activeTab === 'bp' ? 'active' : ''}`} onClick={() => handleTabChange('bp')}>Blood Pressure</button>
                    </div>

                    <div className="camera-viewport">
                        <img src={`/api/camera/video_feed?t=${Date.now()}`} alt="Feed" className="main-feed" />
                        <button className="viewport-overlay switch-cam-btn" onClick={handleToggleCamera} title="Switch between Camera 0 and 1">
                            <FlipCameraIos />
                        </button>
                        <div className="viewport-overlay top">
                            <div className="ai-badge">AI LIVE: {complianceStatus}</div>
                            <div className="fps-badge">FPS: {fps}</div>
                        </div>
                        <div className="viewport-overlay bottom">
                            <div className="capture-info">
                                {activeTab === 'bp'
                                    ? 'Align BP monitor screen in frame'
                                    : `Session: ${captureCount} images captured`
                                }
                            </div>
                        </div>
                    </div>

                    {/* Conditional Section: Training Categories OR BP Reading */}
                    {activeTab === 'bp' ? (
                        <div className="bp-results-section">
                            <h3><MonitorHeart /> Blood Pressure Reading</h3>

                            {/* Current Reading Display */}
                            <div className="bp-current-reading">
                                {isBpReading ? (
                                    <div className="bp-loading">
                                        <div className="bp-spinner"></div>
                                        <span>AI is reading the BP monitor...</span>
                                    </div>
                                ) : bpReading ? (
                                    bpReading.error ? (
                                        <div className="bp-error">
                                            <span>⚠️ {bpReading.error}</span>
                                        </div>
                                    ) : (
                                        <div className="bp-values">
                                            <div className="bp-value systolic">
                                                <span className="bp-label">SYS</span>
                                                <span className="bp-number">{bpReading.systolic}</span>
                                                <span className="bp-unit">mmHg</span>
                                            </div>
                                            <div className="bp-divider">/</div>
                                            <div className="bp-value diastolic">
                                                <span className="bp-label">DIA</span>
                                                <span className="bp-number">{bpReading.diastolic}</span>
                                                <span className="bp-unit">mmHg</span>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="bp-placeholder">
                                        <span>Point camera at BP monitor and press "Read BP"</span>
                                    </div>
                                )}
                            </div>

                            {/* Reading History */}
                            {bpHistory.length > 0 && (
                                <div className="bp-history">
                                    <h4>Recent Readings</h4>
                                    <div className="bp-history-list">
                                        {bpHistory.map((reading, idx) => (
                                            <div key={idx} className="bp-history-item">
                                                <span className="bp-history-values">{reading.systolic}/{reading.diastolic}</span>
                                                <span className="bp-history-time">{reading.timestamp}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="class-selector">
                            <h3>Select Category to Capture:</h3>
                            <div className="class-buttons">
                                {modes[activeTab].map(cls => (
                                    <button
                                        key={cls}
                                        data-class={cls}
                                        className={`class-btn ${selectedClass === cls ? 'active' : ''}`}
                                        onClick={() => setSelectedClass(cls)}
                                    >
                                        {cls.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="right-panel">
                    <div className="control-section">
                        <h3><Settings /> System & Image</h3>

                        <div className="control-item">
                            <label>Hardware Camera Source</label>
                            <select
                                value={settings.camera_index}
                                onChange={(e) => handleCameraIndexChange(e.target.value)}
                                className="styled-select"
                            >
                                <option value="0">Camera 0 (Feet/Weight)</option>
                                <option value="1">Camera 1 (Body/Wearables)</option>
                                <option value="2">Camera 2 (Blood Pressure)</option>
                            </select>
                        </div>

                        <div className="control-item">
                            <label>Zoom: {settings.zoom.toFixed(1)}x</label>
                            <div className="slider-row">
                                <button onClick={() => handleSettingChange('zoom', Math.max(0.5, settings.zoom - 0.1))}><Remove /></button>
                                <input type="range" min="0.5" max="3.0" step="0.1" value={settings.zoom} onChange={(e) => handleSettingChange('zoom', parseFloat(e.target.value))} />
                                <button onClick={() => handleSettingChange('zoom', Math.min(3.0, settings.zoom + 0.1))}><Add /></button>
                            </div>
                        </div>

                        <div className="control-item">
                            <label><Brightness6 /> Brightness: {settings.brightness.toFixed(1)}</label>
                            <input type="range" min="0.5" max="2.0" step="0.1" value={settings.brightness} onChange={(e) => handleSettingChange('brightness', parseFloat(e.target.value))} />
                        </div>

                        <div className="control-item">
                            <label><Contrast /> Contrast: {settings.contrast.toFixed(1)}</label>
                            <input type="range" min="0.8" max="2.0" step="0.1" value={settings.contrast} onChange={(e) => handleSettingChange('contrast', parseFloat(e.target.value))} />
                        </div>

                        <div className="control-item">
                            <label><RotateRight /> Rotation: {settings.rotation}°</label>
                            <div className="rotate-buttons">
                                {[0, 90, 180, 270].map(angle => (
                                    <button
                                        key={angle}
                                        className={settings.rotation === angle ? 'active' : ''}
                                        onClick={() => handleSettingChange('rotation', angle)}
                                    >
                                        {angle}°
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="control-item toggle-item">
                            <label>Square Crop (1:1)</label>
                            <button
                                className={`toggle-btn ${settings.square_crop ? 'active' : ''}`}
                                onClick={() => handleSettingChange('square_crop', !settings.square_crop)}
                            >
                                {settings.square_crop ? 'ENABLED' : 'DISABLED'}
                            </button>
                        </div>
                    </div>

                    <div className="capture-section">
                        {activeTab === 'bp' ? (
                            <button
                                className={`big-capture-btn bp-read-btn ${isBpReading ? 'loading' : ''}`}
                                onClick={handleBpRead}
                                disabled={isBpReading}
                            >
                                <MonitorHeart /> {isBpReading ? 'READING...' : 'READ BP'}
                                <span className="shortcut-hint">AI VISION</span>
                            </button>
                        ) : (
                            <>
                                <button className="big-capture-btn" onClick={handleCapture}>
                                    <FlashOn /> CAPTURE
                                    <span className="shortcut-hint">SPACEBAR</span>
                                </button>
                                {lastCapturePath && (
                                    <div className="last-saved">
                                        <PhotoLibrary fontSize="small" />
                                        <span>Last saved: {lastCapturePath.split('\\').pop()}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="system-section">
                        <button className="restart-btn" onClick={handleRestart}>
                            <Refresh /> Restart AI Service
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Maintenance;
