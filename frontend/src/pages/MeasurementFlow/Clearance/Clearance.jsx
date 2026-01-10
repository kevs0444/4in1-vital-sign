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

    const getStatusBadge = () => {
        if (complianceFrameCount.current > 0) return { text: "⏳ HOLD STILL...", class: "bg-warning" };
        if (cameraError) return { text: "⚠️ CAMERA ERROR", class: "bg-danger" };
        if (isCompliant) return { text: `✅ ${displayMessage}`, class: "bg-success" };
        if (step === 'feet') return { text: `👟 ${displayMessage}`, class: "bg-danger" };
        return { text: `👕 ${displayMessage}`, class: "bg-danger" };
    };

    const badge = getStatusBadge();

    return (
        <div className="d-flex flex-column vh-100 bg-white overflow-hidden">
            <div className="py-3 text-center border-bottom">
                <h2 className="fw-bold text-dark mb-0">
                    Pre-Measurement <span style={{ color: '#dc3545' }}>Clearance</span>
                </h2>
                <small className="text-muted">
                    {step === 'feet' ? "Step 1: Feet Scan" : step === 'body' ? "Step 2: Body Scan" : "Complete"}
                </small>
            </div>

            <div className="flex-grow-1 d-flex align-items-center justify-content-center p-3" style={{ minHeight: 0 }}>
                <div className="position-relative" style={{
                    width: '100%',
                    maxWidth: '640px',
                    aspectRatio: '4/3',
                    background: '#000',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                    {cameraError ? (
                        <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white bg-dark">
                            <h4 className="text-danger">Camera Connection Issue</h4>
                            <p className="text-center px-4">Camera failed to initialize or connection lost.</p>
                            <button onClick={handleRetry} className="btn btn-outline-light mt-3 px-4">
                                🔄 Retry Camera
                            </button>
                        </div>
                    ) : feedUrl ? (
                        <img src={feedUrl} className="w-100 h-100" style={{ objectFit: 'contain' }} alt="Live Feed" />
                    ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-white">
                            <div className="spinner-border text-danger me-2"></div> Loading...
                        </div>
                    )}

                    {!cameraError && (
                        <div className="position-absolute bottom-0 start-0 w-100 p-3"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                            <div className="d-flex justify-content-center">
                                <span className={`badge px-4 py-2 rounded-pill fs-5 ${badge.class}`}>
                                    {badge.text}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="py-3 bg-light text-center border-top">
                <button
                    onClick={handleManualContinue}
                    className={`btn btn-lg px-5 py-2 rounded-pill fw-bold ${isReady ? 'btn-success' : 'btn-secondary'}`}
                >
                    {isReady ? "✅ CONTINUE" : "Skip / Continue"}
                </button>
            </div>
        </div>
    );
}
