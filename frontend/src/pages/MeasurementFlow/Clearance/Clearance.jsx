import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./Clearance.css";
import "../main-components-measurement.css";
import { isLocalDevice } from "../../../utils/network";
import { speak, stopSpeaking } from "../../../utils/speech";

const API_BASE = '/api';

export default function Clearance() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setIsInactivityEnabled } = useInactivity();

    const [feedUrl, setFeedUrl] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [step, setStep] = useState('feet');
    const [cameraError, setCameraError] = useState(false);
    const [displayMessage, setDisplayMessage] = useState("Initializing...");
    const [isCompliant, setIsCompliant] = useState(false);

    // Use refs for state that doesn't need to trigger re-renders or is used in intervals
    const isMountedRef = useRef(true);
    const complianceFrameCount = useRef(0);
    const holdStillSpokenRef = useRef(false);
    const lastSpokenTimeRef = useRef(0);
    const pollIntervalRef = useRef(null);
    const consecutiveErrorsRef = useRef(0);

    // cleanup function to ensure everything is stopped properly
    const cleanup = () => {
        isMountedRef.current = false;
        setFeedUrl(null); // Force browser to drop connection
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        stopSpeaking();
        setIsInactivityEnabled(true);
        // We do NOT stop the backend here automatically to prevent race conditions during navigation
        // The backend stop should only be called explicitly when needed
    };

    // Start clearance on mount
    useEffect(() => {
        if (!isLocalDevice()) {
            navigate('/login', { replace: true });
            return;
        }

        // Reset all refs FIRST before anything else (critical for 6th try+)
        complianceFrameCount.current = 0;
        holdStillSpokenRef.current = false;
        lastSpokenTimeRef.current = 0;
        consecutiveErrorsRef.current = 0;

        isMountedRef.current = true;
        setIsInactivityEnabled(false);
        setCameraError(false);

        // Start the clearance process and immediately poll
        const initClearance = async () => {
            await startClearance();

            // Small delay to let backend camera thread initialize
            await new Promise(r => setTimeout(r, 500));

            // Poll immediately (don't wait 1s for first poll)
            if (isMountedRef.current) {
                pollStatus();
            }

            // Then continue polling every 1s
            if (isMountedRef.current) {
                pollIntervalRef.current = setInterval(pollStatus, 1000);
            }
        };

        initClearance();

        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pollStatus = async () => {
        if (!isMountedRef.current) return;

        try {
            // Use explicit /api prefix to match backend
            const res = await fetch(`${API_BASE}/clearance/status`);

            if (!res.ok) {
                console.warn(`📊 Status Poll Failed: ${res.status}`);
                consecutiveErrorsRef.current++;
                if (consecutiveErrorsRef.current > 10) setCameraError(true);
                return;
            }

            const data = await res.json();
            consecutiveErrorsRef.current = 0; // Reset error counter on success

            // Log status for debugging
            // console.log("📊 Status:", data.stage, data.feet?.message || data.body?.message);

            const currentStage = data.stage;
            const stageData = currentStage === 'feet' ? data.feet : data.body;
            const message = stageData?.message || "Initializing...";
            const compliant = stageData?.is_compliant || false;

            if (!isMountedRef.current) return;

            // Update display state
            setDisplayMessage(message);
            setIsCompliant(compliant);
            setStep(currentStage);

            // Check for explicit backend errors
            if (message.includes("ERROR")) {
                console.error("Backend reported error:", message);
                setCameraError(true);
                return;
            }

            // Handle compliance logic
            if (compliant) {
                complianceFrameCount.current += 1;

                // Speak "Hold still" on first compliance
                if (complianceFrameCount.current === 1 && !holdStillSpokenRef.current) {
                    speak(currentStage === 'feet' ? "Correct. Hold still." : "Clear. Hold still.");
                    holdStillSpokenRef.current = true;
                }

                // After 3 compliant frames (approx 3 seconds), proceed
                if (complianceFrameCount.current >= 3) {
                    complianceFrameCount.current = 0;
                    holdStillSpokenRef.current = false;

                    if (currentStage === 'feet') {
                        // Switch to body scan
                        await switchToBody();
                    } else if (currentStage === 'body') {
                        // All done - navigate to BMI
                        completeClearance();
                    }
                }
            } else {
                // Not compliant - reset counters
                complianceFrameCount.current = 0;
                holdStillSpokenRef.current = false;

                // Speak warnings if needed
                handleViolationSpeech(stageData?.violations || [], currentStage);
            }

        } catch (e) {
            console.error("Status Poll Network Error:", e);
            consecutiveErrorsRef.current++;
            if (consecutiveErrorsRef.current > 10) setCameraError(true);
        }
    };

    const handleViolationSpeech = (violations, stage) => {
        const now = Date.now();
        // Don't speak too often - separate by 3.5 seconds
        if (now - lastSpokenTimeRef.current < 3500) return;

        if (violations.length > 0) {
            const items = [...new Set(violations)].join(" and ");
            speak(`Please remove your ${items}.`);
            lastSpokenTimeRef.current = now;
        } else if (stage === 'feet' && displayMessage.includes("STAND ON SCALE")) {
            speak("Please stand on the scale.");
            lastSpokenTimeRef.current = now;
        }
    };

    const startClearance = async () => {
        setCameraError(false);
        setDisplayMessage("Initializing...");

        try {
            await fetch(`${API_BASE}/clearance/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            // Force reload image by updating query param
            setFeedUrl(`${API_BASE}/clearance/stream?t=${Date.now()}`);
            setStep('feet');

            // Give a moment before speaking instructions
            setTimeout(() => {
                if (isMountedRef.current) speak("Please perform the clearance check. Step 1. Weight Compliance.");
            }, 500);

        } catch (e) {
            console.error("Clearance start failed", e);
            setCameraError(true);
        }
    };

    const switchToBody = async () => {
        try {
            speak("Feet Clear. Step 2. Wearables Check.");
            await fetch(`${API_BASE}/clearance/switch_to_body`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setStep('body');
            // Reset compliance for next stage
            complianceFrameCount.current = 0;
        } catch (e) {
            console.error("Switch failed", e);
        }
    };

    const completeClearance = async () => {
        setIsReady(true);
        speak("You are clear. Proceeding.");

        // Stop the cameras
        try {
            await fetch(`${API_BASE}/clearance/stop`, { method: 'POST' });
        } catch (e) { }

        navigate('/measure/bmi', { state: location.state });
    };

    const handleRetry = () => {
        setCameraError(false);
        consecutiveErrorsRef.current = 0;
        complianceFrameCount.current = 0;
        startClearance();
    };

    const handleManualContinue = () => {
        completeClearance();
    };

    const handleGoBack = async () => {
        try {
            await fetch(`${API_BASE}/clearance/stop`, { method: 'POST' });
        } catch (e) { }
        navigate(-1);
    };

    // Get footwear status
    const getFootwearStatus = () => {
        if (step === 'body') {
            return { icon: '✓', status: 'success', message: 'Clear' };
        }
        if (isCompliant && step === 'feet') {
            return { icon: '✓', status: 'success', message: 'Barefoot detected' };
        }
        if (displayMessage.includes("shoes") || displayMessage.includes("slippers") || displayMessage.includes("Footwear")) {
            return { icon: '✕', status: 'error', message: 'Remove shoes/slippers' };
        }
        if (displayMessage.includes("STAND ON SCALE")) {
            return { icon: '?', status: 'pending', message: 'Waiting...' };
        }
        return { icon: '?', status: 'pending', message: 'Checking...' };
    };

    // Get wearables status
    const getWearablesStatus = () => {
        if (step === 'feet') {
            return { icon: '?', status: 'pending', message: 'Waiting...' };
        }
        if (isCompliant && step === 'body') {
            return { icon: '✓', status: 'success', message: 'No items detected' };
        }
        if (displayMessage.includes("bag") || displayMessage.includes("watch") || displayMessage.includes("Wearables")) {
            return { icon: '✕', status: 'error', message: 'Remove accessories' };
        }
        return { icon: '?', status: 'pending', message: 'Checking...' };
    };

    const footwearStatus = getFootwearStatus();
    const wearablesStatus = getWearablesStatus();

    // Determine warning banner content
    const getWarningBanner = () => {
        if (cameraError) {
            return { show: true, text: 'CAMERA CONNECTION ERROR', icon: '⚠️' };
        }
        if (complianceFrameCount.current > 0) {
            return { show: true, text: 'HOLD STILL...', icon: '⏳' };
        }
        if (displayMessage.includes("STAND ON SCALE")) {
            return { show: true, text: 'PLEASE STAND ON SCALE', icon: '⚠️' };
        }
        if (!isCompliant && step === 'feet') {
            return { show: true, text: displayMessage.toUpperCase(), icon: '⚠️' };
        }
        if (!isCompliant && step === 'body') {
            return { show: true, text: displayMessage.toUpperCase(), icon: '⚠️' };
        }
        if (isCompliant) {
            return { show: false, text: '', icon: '' };
        }
        return { show: false, text: '', icon: '' };
    };

    const warningBanner = getWarningBanner();

    return (
        <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 measurement-container">
            <div className="card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content visible">

                {/* Header */}
                <div className="w-100 mb-4 text-center">
                    <div className="d-flex justify-content-between align-items-center w-100 mb-2" style={{ position: 'relative' }}>
                        <button className="measurement-back-arrow" onClick={handleGoBack} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>←</button>
                        <h2 className="measurement-title mx-auto mb-0">
                            Pre-Measurement <span className="measurement-title-accent">Check</span>
                        </h2>
                    </div>

                    <p className="measurement-subtitle">
                        Please stand on the scale and face the camera
                    </p>
                </div>

                {/* Main Content */}
                <div className="clearance-content w-100 d-flex flex-column align-items-center">
                    {/* Camera Feed */}
                    <div className="clearance-camera-container mb-4" style={{ maxWidth: '100%' }}>
                        {cameraError ? (
                            <div className="clearance-camera-error">
                                <h4>Camera Connection Issue</h4>
                                <p>Camera failed to initialize or connection lost.</p>
                                <button onClick={handleRetry} className="clearance-retry-btn">
                                    🔄 Retry Camera
                                </button>
                            </div>
                        ) : feedUrl ? (
                            <>
                                <img
                                    src={feedUrl}
                                    className="clearance-feed"
                                    alt="Live Feed"
                                    style={{ width: '100%', borderRadius: '15px' }}
                                />
                                {/* Live Badge */}
                                <div className="clearance-live-badge">
                                    <div className="live-indicator"></div>
                                    <span className="live-text">LIVE</span>
                                </div>
                                {/* Step Label */}
                                <span className="clearance-step-label">
                                    {step === 'feet' ? '1: FEET SCAN' : '2: BODY SCAN'}
                                </span>
                            </>
                        ) : (
                            <div className="clearance-camera-loading">
                                <div className="spinner"></div>
                                <span>Loading...</span>
                            </div>
                        )}
                    </div>

                    {/* Status Cards */}
                    <div className="row w-100 justify-content-center mb-3 g-3">
                        <div className="col-12 col-md-6">
                            <div className="clearance-status-card w-100">
                                <div className={`status-icon ${footwearStatus.status}`}>
                                    {footwearStatus.icon}
                                </div>
                                <div className="status-info">
                                    <span className="status-label">Footwear</span>
                                    <span className="status-message">{footwearStatus.message}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="clearance-status-card w-100">
                                <div className={`status-icon ${wearablesStatus.status}`}>
                                    {wearablesStatus.icon}
                                </div>
                                <div className="status-info">
                                    <span className="status-label">Wearables</span>
                                    <span className="status-message">{wearablesStatus.message}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning Banner */}
                    {warningBanner.show && (
                        <div className="clearance-warning-banner w-100 mb-3">
                            <span className="warning-icon">{warningBanner.icon}</span>
                            <span className="warning-text">{warningBanner.text}</span>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="clearance-info-box w-100">
                        <span className="info-icon">⚠️</span>
                        <p className="info-text">
                            Please ensure you are barefoot (or wearing socks) and remove all bags, watches, ID laces, caps, and accessories before proceeding.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}