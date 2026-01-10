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

    // --- STATE ---
    const [feedUrl, setFeedUrl] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [step, setStep] = useState('feet'); // 'feet' | 'body' | 'done'

    const [status, setStatus] = useState({
        feet: { message: "Initializing...", is_compliant: false, violations: [] },
        body: { message: "Waiting...", is_compliant: false, violations: [] }
    });

    const isMountedRef = useRef(true);
    const lastSpokenRef = useRef("");
    const lastSpokenTimeRef = useRef(0);
    const complianceFrameCount = useRef(0);
    const holdStillSpokenRef = useRef(false); // Track if we said "Hold Still" for current cycle

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!isLocalDevice()) navigate('/login', { replace: true });

        isMountedRef.current = true;
        setIsInactivityEnabled(false);
        startClearance();

        const interval = setInterval(async () => {
            if (!isMountedRef.current) return;
            try {
                const res = await fetch(`${API_BASE}/clearance/status`);
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data);

                    if (isMountedRef.current) {
                        // --- STABILITY & FLOW LOGIC ---
                        if (data.stage === 'feet') {
                            if (data.feet && data.feet.is_compliant) {
                                complianceFrameCount.current += 1;

                                // 1. Speak "Hold Still" at start of compliance
                                if (complianceFrameCount.current === 1 && !holdStillSpokenRef.current) {
                                    speak("Correct. Hold still.");
                                    holdStillSpokenRef.current = true;
                                }

                                // 2. Proceed after ~2.5 seconds (count 3 at 1000ms interval = 2s wait from count 1)
                                if (complianceFrameCount.current >= 3) {
                                    console.log("✅ Feet Stable! Switching...");
                                    complianceFrameCount.current = 0;
                                    holdStillSpokenRef.current = false;
                                    await switchToBody();
                                }
                            } else {
                                // Reset if violation appears
                                complianceFrameCount.current = 0;
                                holdStillSpokenRef.current = false;
                                handleSpeech(data); // Handle violation speech
                            }
                        }
                        else if (data.stage === 'body') {
                            if (data.body && data.body.is_compliant) {
                                complianceFrameCount.current += 1;

                                if (complianceFrameCount.current === 1 && !holdStillSpokenRef.current) {
                                    speak("Clear. Hold still.");
                                    holdStillSpokenRef.current = true;
                                }

                                if (complianceFrameCount.current >= 3) {
                                    console.log("✅ Body Stable! Auto-Navigating...");
                                    setIsReady(true);
                                    setStep('done');

                                    speak("You are clear. Proceeding.");
                                    try { navigator.sendBeacon(`${API_BASE}/clearance/stop`); } catch (e) { }
                                    navigate('/measure/bmi', { state: location.state });
                                }
                            } else {
                                complianceFrameCount.current = 0;
                                holdStillSpokenRef.current = false;
                                setIsReady(false);
                                handleSpeech(data); // Handle violation speech
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Status Poll Error", e);
            }
        }, 1000);

        const cleanup = () => {
            isMountedRef.current = false;
            clearInterval(interval);
            stopClearance();
            stopSpeaking();
            setIsInactivityEnabled(true);
        };

        window.addEventListener('beforeunload', cleanup);
        return () => {
            cleanup();
            window.removeEventListener('beforeunload', cleanup);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- ALERT SPEECH LOGIC (Violations Only) ---
    const handleSpeech = (data) => {
        const now = Date.now();
        // Don't spam violation alerts if we just said something recently
        if (now - lastSpokenTimeRef.current < 3500) return;

        let messageToSpeak = "";

        if (data.stage === 'feet') {
            if (data.feet && !data.feet.is_compliant) {
                const violations = data.feet.violations || [];
                if (violations.some(v => v.includes('shoe') || v.includes('footwear') || v.includes('sneaker') || v.includes('boot'))) {
                    messageToSpeak = "Please remove your footwear.";
                } else if (violations.length > 0) {
                    messageToSpeak = "Please remove your shoes.";
                }
                else if (data.feet.message && data.feet.message.includes("STAND ON SCALE")) {
                    messageToSpeak = "Please stand on the scale.";
                }
            }
        }
        else if (data.stage === 'body') {
            if (data.body && !data.body.is_compliant) {
                const violations = data.body.violations || [];
                const items = [...new Set(violations)];

                if (items.length > 0) {
                    let itemList = "";
                    if (items.length === 1) {
                        itemList = items[0];
                    } else if (items.length === 2) {
                        itemList = `${items[0]} and ${items[1]}`;
                    } else {
                        const last = items.pop();
                        itemList = `${items.join(', ')}, and ${last}`;
                    }
                    messageToSpeak = `Please remove your ${itemList}.`;
                }
            }
        }

        if (messageToSpeak && isMountedRef.current) {
            console.log("🗣️ Speaking Alert:", messageToSpeak);
            speak(messageToSpeak);
            lastSpokenRef.current = messageToSpeak;
            lastSpokenTimeRef.current = now;
        }
    };


    // --- API CALLS ---
    const startClearance = async () => {
        try {
            await fetch(`${API_BASE}/clearance/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setFeedUrl(`${API_BASE}/clearance/stream?t=${Date.now()}`);
            setStep('feet');
            setTimeout(() => speak("Please perform the clearance check. Step 1. Weight Compliance."), 500);
        } catch (e) {
            console.error("Clearance start failed", e);
        }
    };

    const switchToBody = async () => {
        try {
            speak("Feet Clear. Step 2. Wearables Check. Please look at the camera.");
            await fetch(`${API_BASE}/clearance/switch_to_body`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setStep('body');
        } catch (e) {
            console.error("Switch failed", e);
        }
    }

    const stopClearance = () => {
        try {
            navigator.sendBeacon(`${API_BASE}/clearance/stop`);
        } catch (e) { }
    };

    const handleNext = () => {
        stopClearance();
        stopSpeaking();
        navigate('/measure/bmi', { state: location.state });
    };

    // UI Helpers
    const getStatusMessage = () => {
        if (complianceFrameCount.current > 0) {
            return "⏳ HOLD STILL...";
        }
        if (step === 'feet') return `👟 FEET: ${status.feet?.message || 'Scanning...'}`;
        if (step === 'body') return `👕 BODY: ${status.body?.message || 'Scanning...'}`;
        return "✅ ALL CLEAR";
    }

    return (
        <div className="d-flex flex-column vh-100 bg-white overflow-hidden">
            <div className="py-3 text-center border-bottom">
                <h2 className="fw-bold text-dark mb-0">
                    Pre-Measurement <span style={{ color: '#dc3545' }}>Clearance</span>
                </h2>
                <small className="text-muted">
                    {step === 'feet' ? "Please stand on the platform (Feet Scan)" : "Checking for wearables (Body Scan)"}
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
                    {feedUrl ? (
                        <img src={feedUrl} className="w-100 h-100" style={{ objectFit: 'contain' }} alt="Live Feed" />
                    ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-white">
                            <div className="spinner-border text-danger me-2"></div> Loading...
                        </div>
                    )}

                    <div className="position-absolute bottom-0 start-0 w-100 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                        <div className="d-flex justify-content-center">
                            <span className={`badge px-4 py-2 rounded-pill fs-5 ${(step === 'feet' && status.feet?.is_compliant) || (step === 'body' && status.body?.is_compliant)
                                    ? 'bg-success' : 'bg-danger'
                                }`}>
                                {getStatusMessage()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="py-3 bg-light text-center border-top">
                <button
                    onClick={handleNext}
                    disabled={!isReady}
                    className={`btn btn-lg px-5 py-2 rounded-pill fw-bold ${isReady ? 'btn-success' : 'btn-secondary'}`}
                >
                    {isReady ? "✅ CONTINUE" : "Processing..."}
                </button>
            </div>
        </div>
    );
}
