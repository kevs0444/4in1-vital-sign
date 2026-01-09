import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./Clearance.css";
import "../main-components-measurement.css";
import { isLocalDevice } from "../../../utils/network";

const API_BASE = '/api';

export default function Clearance() {
    const navigate = useNavigate();
    const { setIsInactivityEnabled } = useInactivity();

    // --- STATE ---
    const [feedUrl, setFeedUrl] = useState(null);
    const [isReady, setIsReady] = useState(false);

    const isMountedRef = useRef(true);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!isLocalDevice()) navigate('/login', { replace: true });

        isMountedRef.current = true;
        setIsInactivityEnabled(false);
        startClearance();

        const cleanup = () => {
            isMountedRef.current = false;
            stopClearance();
            setIsInactivityEnabled(true);
        };

        window.addEventListener('beforeunload', cleanup);
        return () => {
            cleanup();
            window.removeEventListener('beforeunload', cleanup);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-ready after 2 seconds (camera only mode - no AI validation)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isMountedRef.current) {
                setIsReady(true);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // --- API CALLS ---
    const startClearance = async () => {
        try {
            await fetch(`${API_BASE}/clearance/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setFeedUrl(`${API_BASE}/clearance/stream?t=${Date.now()}`);
        } catch (e) {
            console.error("Clearance start failed", e);
        }
    };

    const stopClearance = () => {
        try {
            navigator.sendBeacon(`${API_BASE}/clearance/stop`);
        } catch (e) { }
    };

    const handleNext = () => {
        stopClearance();
        navigate('/measure/bmi');
    };

    return (
        <div className="d-flex flex-column vh-100 bg-white overflow-hidden">
            {/* Compact Header */}
            <div className="py-3 text-center border-bottom">
                <h2 className="fw-bold text-dark mb-0">
                    Pre-Measurement <span style={{ color: '#dc3545' }}>Clearance</span>
                </h2>
                <small className="text-muted">Camera preview - AI detection disabled</small>
            </div>

            {/* Camera View - Fixed Height, No Scroll */}
            <div className="flex-grow-1 d-flex align-items-center justify-content-center p-3" style={{ minHeight: 0 }}>
                <div className="position-relative" style={{
                    width: '100%',
                    maxWidth: '400px',
                    aspectRatio: '1/2', /* 480x960 stitched = 1:2 */
                    background: '#000',
                    borderRadius: '16px',
                    overflow: 'hidden'
                }}>
                    {/* The Single Stitched Feed */}
                    {feedUrl ? (
                        <img src={feedUrl} className="w-100 h-100" style={{ objectFit: 'contain' }} alt="Unified Feed" />
                    ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-white">
                            <div className="spinner-border text-danger me-2"></div> Loading...
                        </div>
                    )}

                    {/* Top Overlay (Body) */}
                    <div className="position-absolute top-0 start-0 w-100 p-2" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="badge bg-danger">👕 Body</span>
                            <span className="badge bg-secondary">📷 Camera Only</span>
                        </div>
                    </div>

                    {/* Center Divider */}
                    <div className="position-absolute w-100" style={{ top: '50%', borderTop: '2px dashed rgba(255,255,255,0.4)' }}></div>

                    {/* Bottom Overlay (Feet) */}
                    <div className="position-absolute bottom-0 start-0 w-100 p-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="badge bg-danger">👟 Feet</span>
                            <span className="badge bg-secondary">📷 Camera Only</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Footer */}
            <div className="py-3 bg-light text-center border-top">
                <button
                    onClick={handleNext}
                    disabled={!isReady}
                    className={`btn btn-lg px-5 py-2 rounded-pill fw-bold ${isReady ? 'btn-success' : 'btn-secondary'}`}
                >
                    {isReady ? "✅ CONTINUE" : "Loading Cameras..."}
                </button>
            </div>
        </div>
    );
}
