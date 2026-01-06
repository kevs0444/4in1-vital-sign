import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./Clearance.css";
import "../main-components-measurement.css";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";
import { speak, stopSpeaking } from "../../../utils/speech";
import { isLocalDevice } from "../../../utils/network";

const API_BASE = '/api';

export default function Clearance() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setIsInactivityEnabled } = useInactivity();

    // BLOCK REMOTE ACCESS
    useEffect(() => {
        if (!isLocalDevice()) {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    const [step, setStep] = useState(1); // 1: Footwear, 2: Wearables, 3: Complete
    const [statusMessage, setStatusMessage] = useState("Initializing camera...");
    const [detectionStatus, setDetectionStatus] = useState("Waiting...");
    const [isCompliant, setIsCompliant] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Checks state
    const [footwearCleared, setFootwearCleared] = useState(false);
    const [wearablesCleared, setWearablesCleared] = useState(false);

    const pollerRef = useRef(null);
    const checkIntervalRef = useRef(null);
    const complianceTimerRef = useRef(null);
    const isMountedRef = useRef(true);

    // State to track which video feed to display - default to camera 1 (feet) for immediate display
    const [videoFeedUrl, setVideoFeedUrl] = useState(`${API_BASE}/camera/video_feed`);

    // Loading state for camera transitions
    const [isCameraLoading, setIsCameraLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    // Camera Config State - UPDATED based on user testing:
    // Index 0 = Weight Compliance Camera (Feet/Platform) ✅
    // Index 1 = Blood Pressure Camera (BP Monitor)
    // Index 2 = Wearables Compliance Camera (Body)
    // Camera Config State - UPDATED based on user testing:
    // Index 0 = Weight Compliance Camera (Blood Pressure Camera device)
    // Index 1 = Wearables Compliance Camera (Body)
    const [cameraConfig, setCameraConfig] = useState({
        weight_index: 0,
        wearables_index: 2,
        bp_index: 1
    });

    // Initialize
    useEffect(() => {
        isMountedRef.current = true;
        setIsInactivityEnabled(true);
        const timer = setTimeout(() => setIsVisible(true), 100);

        // Fetch Camera Config FIRST, then start check
        const init = async () => {
            try {
                // Fetch dynamic camera config from backend
                const res = await fetch(`${API_BASE}/camera/config`);
                const config = await res.json();

                if (config && config.success) {
                    console.log("📷 Mapped Camera Config:", config);
                    setCameraConfig({
                        weight_index: config.weight_index,
                        wearables_index: config.wearables_index,
                        bp_index: config.bp_index
                    });

                    // Use the dynamic index from backend
                    startFootwearCheck(config.weight_index);
                } else {
                    console.warn("⚠️ Failed to load camera config, using defaults");
                    startFootwearCheck(0); // Fallback
                }
            } catch (e) {
                console.error("Error loading camera config:", e);
                startFootwearCheck(0); // Fallback
            }
        };

        init();

        return () => {
            isMountedRef.current = false;
            clearTimeout(timer);
            // Cleanup
            stopCamera();
            stopSpeaking();
            if (pollerRef.current) clearInterval(pollerRef.current);
            if (checkIntervalRef.current) clearTimeout(checkIntervalRef.current);
            if (complianceTimerRef.current) clearTimeout(complianceTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Voice Instructions
    useEffect(() => {
        const timer = setTimeout(() => {
            if (step === 2) {
                speakOnce("Please remove any wearables like caps, watches, or bags.");
            } else if (step === 3) {
                speakOnce("You are cleared. Taking you to the next step.");
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [step]);

    const stopCamera = async () => {
        try {
            await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
            await fetch(`${API_BASE}/aux/stop`, { method: 'POST' });
        } catch (e) {
            console.error("Error stopping camera:", e);
        }
    };

    /* ============================================================ */
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const startFootwearCheck = async (forceIndex = null) => {
        setStep(1);
        setIsCompliant(false);
        setIsCameraLoading(true);

        const camIndex = forceIndex !== null ? forceIndex : cameraConfig.weight_index;
        // const camName = "Blood Pressure Camera"; // Optional fallback

        try {
            setStatusMessage("Initializing feet camera...");
            await stopCamera();
            await sleep(200);

            await fetch(`${API_BASE}/camera/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    index: camIndex
                })
            });

            await sleep(100);

            await fetch(`${API_BASE}/camera/set_mode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'feet' })
            });

            await fetch(`${API_BASE}/camera/set_settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rotation: 180,
                    zoom: 1.3,
                    square_crop: true
                })
            });

            await sleep(300);
            setVideoFeedUrl(`${API_BASE}/camera/video_feed`);
            setIsCameraLoading(false);
            setStatusMessage("Scanning for footwear...");
            console.log("✅ Feet camera started");

            setTimeout(() => {
                startPolling('feet');
            }, 500);
        } catch (e) {
            console.error("Feet cam error", e);
            setStatusMessage("Camera error");
            setIsCameraLoading(false);
        }
    };

    const startWearablesCheck = async () => {
        setStep(2);
        setIsCompliant(false);
        setIsCameraLoading(true); // Show loading during camera switch

        try {
            setStatusMessage("Switching to wearables camera...");

            // Stop the feet camera first
            await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
            await sleep(200); // Longer delay for camera to fully release

            // Start Wearables Camera
            const camIndex = cameraConfig.wearables_index;

            await fetch(`${API_BASE}/camera/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    index: camIndex  // Just pass index, no name
                })
            });

            await sleep(100);

            // Set to body/wearables detection mode
            await fetch(`${API_BASE}/camera/set_mode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'body' })
            });

            // Set camera settings for wearables view (no zoom, 180° rotation, square crop)
            await fetch(`${API_BASE}/camera/set_settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rotation: 180,
                    zoom: 1.0,
                    square_crop: true
                })
            });

            await sleep(300); // Wait for settings to apply

            // Use the same /camera video feed (it has AI detection built in)
            setVideoFeedUrl(`${API_BASE}/camera/video_feed`);
            setIsCameraLoading(false); // Hide loading

            // Only speak AFTER camera is ready and showing
            setStatusMessage("Scanning for wearables...");
            console.log("✅ Wearables camera started (Camera 0, zoom=1.0, rotation=180)");

            // Short delay to ensure video is rendering before speaking
            setTimeout(() => {
                if (!isMountedRef.current) return;
                speakOnce("Now checking for wearables. Please look at the screen.");
                startPolling('body');
            }, 500);

        } catch (e) {
            console.error("Error starting wearables camera:", e);
            setStatusMessage("Camera error. Please check hardware.");
            setIsCameraLoading(false);
        }
    };
    const lastSpokenRef = useRef(""); // To prevent repetitive speech
    const lastSpeechTimeRef = useRef(0); // To prevent rapid-fire speech

    const speakOnce = (text) => {
        const now = Date.now();
        const timeSinceLast = now - lastSpeechTimeRef.current;

        // Prevent repeating the same text (already handled)
        // AND prevent speaking ANY new text if it's been less than 1.5 seconds, 
        // effectively throttling speech to avoid "glitching" or cutting off.
        // Exception: high priority messages can be handled separately if needed, but 1.5s is usually fine.
        if (lastSpokenRef.current !== text && timeSinceLast > 1500) {
            if (!isMountedRef.current) return;
            console.log("🗣️ Speaking:", text);
            speak(text);
            lastSpokenRef.current = text;
            lastSpeechTimeRef.current = now;
        }
    };

    const startPolling = (expectedType) => {
        if (!isMountedRef.current) return;
        if (pollerRef.current) clearInterval(pollerRef.current);

        pollerRef.current = setInterval(async () => {
            if (!isMountedRef.current) {
                if (pollerRef.current) clearInterval(pollerRef.current);
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/camera/status`);
                const data = await res.json();

                // Ensure data is valid JSON
                const safeData = data || {};

                const msg = (safeData.message || "").toLowerCase();

                // Update detection status badge
                setDetectionStatus(msg);

                if (expectedType === 'feet') {
                    // Logic: Check for barefeet/socks compliance (Socks are VALID)
                    // Strict check to avoid matching "invalid" as "valid"
                    const isInvalid = msg.includes('invalid') || msg.includes('footwear') || msg.includes('shoes');
                    // Ensure 'valid' is standalone or part of a success message, NOT part of 'invalid'
                    // STRICT UPDATE: Only 'barefeet' or 'socks' are valid. Generic 'valid' or 'ready' are removed to ensure specific detection.
                    const isValidSignal = msg.includes('barefeet') || msg.includes('socks');
                    const isWaiting = msg.includes('waiting');

                    if (isValidSignal && !isInvalid) {
                        // SITUATION 1: VALID (User is ready)
                        // Fasten process: If they are valid immediately, just confirm and hold.

                        if (lastSpokenRef.current !== 'valid_hold') {
                            speakOnce("Perfect. Hold still.");
                            lastSpokenRef.current = 'valid_hold';
                        }

                        // Current frame is compliant
                        if (!complianceTimerRef.current) {
                            // Start 3-second timer if not already running
                            setStatusMessage("Valid! Hold position for 3 seconds...");
                            complianceTimerRef.current = setTimeout(() => {
                                // Success action after 3 seconds
                                setIsCompliant(true);
                                setFootwearCleared(true);
                                setStatusMessage("Footwear cleared! Proceeding...");

                                // STOP POLLING IMMEDIATELY to prevent speech glitches during transition
                                if (pollerRef.current) clearInterval(pollerRef.current);

                                // Proceed to next step
                                setTimeout(() => {
                                    if (isMountedRef.current) {
                                        // Pass the config index explicitly if needed, but the function reads from state now
                                        startWearablesCheck();
                                        lastSpokenRef.current = ""; // Reset speech tracking
                                    }
                                }, 1500);

                                // Clear timer reference
                                complianceTimerRef.current = null;
                            }, 3000); // 3 seconds wait time
                        }
                    } else if (isInvalid) {
                        // SITUATION 2: INVALID (Footwear detected)
                        setIsCompliant(false);
                        setStatusMessage("INVALID: Footwear Detected. Please remove.");

                        if (complianceTimerRef.current) {
                            clearTimeout(complianceTimerRef.current);
                            complianceTimerRef.current = null;
                        }

                        if (lastSpokenRef.current !== 'shoes') {
                            speakOnce("Footwear detected. Please remove it to proceed to wearables check.");
                            lastSpokenRef.current = 'shoes';
                        }
                    } else if (isWaiting) {
                        // SITUATION 3: WAITING (Ambient/Empty)
                        // If checking... reset timer
                        if (complianceTimerRef.current) {
                            clearTimeout(complianceTimerRef.current);
                            complianceTimerRef.current = null;
                            setStatusMessage("Checking...");
                        }

                        // Dynamic "Waiting" Speech: If we see nothing for a while?
                        // For now, let's just prompt once if we haven't said anything yet or if state changed back to waiting
                        if (lastSpokenRef.current === 'shoes' || lastSpokenRef.current === 'valid_hold') {
                            // Reset speech generic state so we can warn again if they step off?
                            // lastSpokenRef.current = 'waiting'; 
                        }

                        // If we haven't said anything at all yet (skipped intro), and we are waiting...
                        if (lastSpokenRef.current === "") {
                            // Let's give it a moment (e.g. 2s) before nagging? 
                            // Or just say it once.
                            // Speak it once to initiate interaction if nothing is happening.
                            speakOnce("Please stand on the platform for clearance.");
                            lastSpokenRef.current = "waiting_prompt";
                        }
                    }
                } else if (expectedType === 'body') {
                    // Enhanced Wearables Check
                    // FIRST: Check if the status indicates VALID/CLEAR (no wearables)
                    // Enhanced Wearables Check
                    // FIRST: Check if the status indicates VALID/CLEAR (no wearables)
                    // CRITICAL FIX: Ensure 'valid' check does NOT match 'invalid'
                    const isBodyClear = (msg.includes('valid') && !msg.includes('invalid')) ||
                        msg.includes('clear') ||
                        msg.includes('compliant') ||
                        (msg.trim() === 'bg'); // strict background check

                    if (isBodyClear) {
                        // SAFE / CLEARED - Start 2-second timer to confirm
                        if (!checkIntervalRef.current) {
                            setStatusMessage("Checking... Hold still for 2 seconds.");
                            checkIntervalRef.current = setTimeout(() => {
                                if (!isMountedRef.current) return;
                                // After 2 seconds of no wearables, mark as cleared
                                setIsCompliant(true);
                                setWearablesCleared(true);
                                setStatusMessage("No wearables detected. You are cleared.");

                                // STOP POLLING IMMEDIATELY
                                if (pollerRef.current) clearInterval(pollerRef.current);

                                if (lastSpokenRef.current !== 'clear') {
                                    speakOnce("You are compliant. Proceeding to measurement.");
                                    lastSpokenRef.current = 'clear';
                                }

                                // Proceed after brief delay
                                setTimeout(() => {
                                    if (isMountedRef.current) handleCompletion();
                                }, 1000);
                                checkIntervalRef.current = null;
                            }, 2000); // 2 second validation wait
                        }
                    } else {
                        // DETECTED SOMETHING - Check for specific items
                        // Use word boundaries to avoid false positives (e.g., "valID" matching "id")
                        // DETECTED SOMETHING - Check for specific items
                        // Support MULTIPLE detected items (e.g. watch AND bag)
                        let detectedList = [];
                        if (msg.includes('watch')) detectedList.push('watch');
                        if (msg.includes('bag') || msg.includes('backpack')) detectedList.push('bag');
                        if (msg.includes('cap') || msg.includes('hat')) detectedList.push('cap');
                        if (msg.includes('id lace') || msg.includes('id_lace') || msg.includes('lanyard')) detectedList.push('ID lace');

                        setIsCompliant(false);

                        // If concrete items found, list them. Otherwise fallback to generic.
                        let warningMsg = "";
                        let speechText = "";

                        if (detectedList.length > 0) {
                            // Smart Grammar Formatting for Speech
                            // 1 item: "cap"
                            // 2 items: "cap and bag"
                            // 3+ items: "cap, bag, and watch"
                            let itemsStr = "";
                            if (detectedList.length === 1) {
                                itemsStr = detectedList[0];
                            } else if (detectedList.length === 2) {
                                itemsStr = detectedList.join(' and ');
                            } else {
                                itemsStr = detectedList.slice(0, -1).join(', ') + ', and ' + detectedList[detectedList.length - 1];
                            }

                            warningMsg = `Detected: ${itemsStr.toUpperCase()}. Please remove.`;
                            speechText = `Please remove your ${itemsStr}.`;
                        } else {
                            // Generic invalid state
                            warningMsg = `Detected: Wearables. Please remove.`;
                            speechText = "Please remove any detected wearables.";
                        }

                        setStatusMessage(warningMsg);

                        // Smart Speech Feedback
                        // REPEAT LOGIC: If the user hasn't removed the item after ~3 seconds, repeat the instruction.
                        const now = Date.now();
                        if (speechText && lastSpokenRef.current === speechText) {
                            // Check if 3 seconds have passed since last speech
                            if (now - lastSpeechTimeRef.current > 3000) {
                                console.log("↻ Repeating instruction due to non-compliance");
                                lastSpokenRef.current = ""; // Reset to force 'speakOnce' to trigger again
                            }
                        }

                        // Use the combined speech text as the key to prevent repetition
                        if (speechText && lastSpokenRef.current !== speechText) {
                            speakOnce(speechText);
                            // speakOnce sets the ref and updates timestamp
                            // lastSpokenRef.current = speechText; 
                        }

                        if (checkIntervalRef.current) {
                            clearTimeout(checkIntervalRef.current);
                            checkIntervalRef.current = null;
                        }
                    }
                }

            } catch (e) {
                console.error("Polling error:", e);
            }
        }, 500);
    };

    const handleCompletion = async () => {
        setStep(3);

        // Stop Everything Immediately
        if (pollerRef.current) clearInterval(pollerRef.current);
        if (checkIntervalRef.current) clearTimeout(checkIntervalRef.current);
        await stopCamera(); // Ensure await
        stopSpeaking();

        setStatusMessage("✅ Clearance Complete! Proceeding to BMI...");

        // Navigate directly to BMI after brief delay
        setTimeout(() => {
            console.log("✅ Navigating to: /measure/bmi");
            navigate('/measure/bmi', { state: location.state });
        }, 1500);
    };

    const handleContinue = () => {
        // Stop camera and speech before navigating
        stopCamera();
        stopSpeaking();
        if (pollerRef.current) clearInterval(pollerRef.current);

        // Navigate directly to BMI
        navigate('/measure/bmi', { state: location.state });
    };

    const handleExit = () => {
        // Stop everything before exiting
        stopCamera();
        stopSpeaking();
        if (pollerRef.current) clearInterval(pollerRef.current);
        navigate('/login');
    };

    return (
        <motion.div
            className="container-fluid d-flex justify-content-center align-items-center min-vh-100 max-vh-100 p-0 measurement-container overflow-hidden"
            style={{ maxHeight: '100vh' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
        >
            <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content ${isVisible ? 'visible' : ''}`}>

                {/* Header */}
                <div className="text-center mb-4">
                    <h1 className="measurement-title">Pre-Measurement <span className="measurement-title-accent">Clearance</span></h1>
                    <p className="measurement-subtitle">{statusMessage}</p>
                </div>

                <div className="row g-4 justify-content-center">

                    {/* Camera Feed */}
                    <div className="col-12 col-lg-8">
                        <div className="clearance-camera-container">
                            {/* Loading Overlay - Red/Gray/White Theme */}
                            {isCameraLoading && (
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(50,50,50,0.95) 100%)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 10,
                                    borderRadius: '16px',
                                    border: '2px solid #dc2626'
                                }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        border: '4px solid rgba(255,255,255,0.2)',
                                        borderTop: '4px solid #dc2626',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></div>
                                    <p style={{
                                        color: 'white',
                                        marginTop: '1.5rem',
                                        fontSize: '1.1rem',
                                        fontWeight: '500'
                                    }}>
                                        {step === 1 ? 'Initializing Feet Camera...' : 'Switching to Wearables Camera...'}
                                    </p>
                                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                        Please wait...
                                    </p>
                                </div>
                            )}

                            <img
                                key={videoFeedUrl}
                                src={`${videoFeedUrl}?t=${Date.now()}`}
                                alt="Camera Feed"
                                className="clearance-feed"
                                style={{ opacity: isCameraLoading ? 0.3 : 1 }}
                            />

                            <div className="clearance-overlay">
                                <div className={`clearance-status-badge ${isCompliant ? 'success' : detectionStatus.toLowerCase().includes('invalid') || detectionStatus.toLowerCase().includes('remove') ? 'error' : 'warning'}`}>
                                    {isCompliant ? '✅ Compliant' : detectionStatus.toLowerCase().includes('invalid') || detectionStatus.toLowerCase().includes('remove') ? '❌ Invalid' : '⚠️ Checking...'} : {detectionStatus}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Checklist Side Panel */}
                    <div className="col-12 col-lg-4">
                        <div className="instruction-card h-100">
                            <h3 className="instruction-title mb-4">Requirements</h3>

                            <div className="instruction-list">
                                <div className={`instruction-item ${footwearCleared ? 'completed' : step === 1 ? 'active' : ''}`}>
                                    <div className="instruction-check">{footwearCleared ? '✓' : '1'}</div>
                                    <div>
                                        <strong>Footwear Check</strong>
                                        <div className="small text-muted">Remove footwear</div>
                                    </div>
                                </div>

                                <div className={`instruction-item ${wearablesCleared ? 'completed' : step === 2 ? 'active' : ''}`}>
                                    <div className="instruction-check">{wearablesCleared ? '✓' : '2'}</div>
                                    <div>
                                        <strong>Wearables Check</strong>
                                        <div className="small text-muted">Remove watches/bags</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-top">
                                <p className="small text-muted">
                                    AI is verifying your readiness. Please follow the instructions on screen.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Action Buttons */}
                <div className="measurement-navigation mt-5">
                    <button className="measurement-back-arrow me-3" onClick={handleExit} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
                        Exit
                    </button>
                    <button
                        className="measurement-button"
                        onClick={handleContinue}
                        disabled={step < 3} // Only enable when complete
                    >
                        {step === 3 ? "Continue to Measurement" : "Scanning..."}
                    </button>
                </div>

            </div>
        </motion.div>
    );
}
