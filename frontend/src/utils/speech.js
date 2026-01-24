import { isLocalDevice } from './network';

let voices = [];
let voicesLoaded = false;
let lastText = "";
let lastTime = 0;

// Helper to reliably load voices (Chrome loads them async)
const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        voicesLoaded = true;
        console.log("🎙️ Voices loaded:", voices.length);
    }
};

// Initialize speech synthesis
const initSpeech = () => {
    if (!window.speechSynthesis) {
        console.warn("⚠️ Speech Synthesis NOT supported in this browser");
        return;
    }

    console.log("🎙️ Speech Synthesis Supported");
    loadVoices();

    // Chrome requires this event to populate the voice list
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
};

// Initialize on load
initSpeech();

// Re-initialize function for use after navigation/refresh
export const reinitSpeech = (cancelInfo = false) => {
    if (window.speechSynthesis) {
        loadVoices();
        // Force Chrome to reload voices
        if (cancelInfo) {
            window.speechSynthesis.cancel();
        }
    }
};

// Get preferred voice with fallback logic
const getPreferredVoice = () => {
    // Always try to reload voices if empty
    if (voices.length === 0) {
        voices = window.speechSynthesis.getVoices();
    }

    // Log available voices for debugging (only once)
    if (voices.length > 0 && !window._voicesLogged) {
        console.log("🎙️ Available voices:", voices.map(v => `${v.name} (${v.lang})`));
        window._voicesLogged = true;
    }

    // Smart Voice Selection Strategy - MALE VOICES ONLY
    // 1. Microsoft David (Windows male - guaranteed male)
    // 2. Google UK English Male (Chrome male)
    // 3. Microsoft Mark (Another Windows male)
    // 4. Any voice with "male" in name
    // 5. Microsoft George (UK male)
    // 6. Fallback: Google US English (may be female but better than nothing)
    const maleVoice =
        voices.find(v => v.name.includes('David')) ||
        voices.find(v => v.name === 'Google UK English Male') ||
        voices.find(v => v.name.includes('Mark') && v.lang.includes('en')) ||
        voices.find(v => v.name.toLowerCase().includes('male') && v.lang.includes('en')) ||
        voices.find(v => v.name.includes('George')) ||
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB'));

    if (maleVoice) {
        console.log("🎙️ Selected voice:", maleVoice.name);
    }

    return maleVoice;
};

export const speak = (text) => {
    // DISABLE SPEECH ON REMOTE DEVICES (Mini PC acts as Kiosk with speech)
    if (!isLocalDevice()) {
        console.warn("Speech skipped: Remote device detected");
        return;
    }

    if (!text || typeof text !== 'string') return;

    // DEBOUNCE: Prevent repeating the exact same text within a short window (2 seconds)
    // This fixes issues where components re-render and spam the same speech command.
    const now = Date.now();
    if (text === lastText && (now - lastTime) < 2000) {
        console.log("🤫 Speech debounce suppressed duplicate:", text);
        return;
    }

    lastText = text;
    lastTime = now;

    try {
        if (!window.speechSynthesis) return;

        // Always reload voices before speaking (ensures it works after navigation)
        if (voices.length === 0) {
            voices = window.speechSynthesis.getVoices();
        }

        // Cancel any ongoing speech to avoid overlap/queueing
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const preferredVoice = getPreferredVoice();
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log("🎙️ Using voice:", preferredVoice.name);
        }

        // Adjust for male voice - lower pitch for deeper sound
        utterance.rate = 1.0;
        utterance.pitch = 0.8;

        // Chrome bug fix: sometimes speech gets stuck, resume it
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);

        // Chrome bug fix: keep speech alive on long pauses
        const resumeInterval = setInterval(() => {
            if (!window.speechSynthesis.speaking) {
                clearInterval(resumeInterval);
            } else {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);

    } catch (e) {
        console.warn("Speech synthesis error:", e);
    }
};

// Stop any ongoing speech
export const stopSpeaking = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};

// Check if speech is currently active
export const isSpeaking = () => {
    return window.speechSynthesis ? window.speechSynthesis.speaking : false;
};

// Centralized Speech Messages
export const SPEECH_MESSAGES = {
    MAX30102: {
        INSERT_FINGER: "Step 1. Insert Finger. Place your left index finger on the pulse oximeter.",
        HOLD_STEADY: "Step 2. Hold Steady. Keep your finger completely still for accurate readings.",
        COMPLETE: "Step 3. Measurement Complete. Continue to next step.",
        RESULTS_READY: "Step 3. Results Ready. All measurements complete.",
        FINGER_REMOVED: "Finger removed."
    }
};

// ============================================================================
// NOTIFICATION SOUND (Web Audio API)
// ============================================================================
let audioContext = null;

/**
 * Plays a simple notification sound using the Web Audio API.
 * This creates a soft "ping" tone that's pleasant but attention-grabbing.
 * @param {string} type - 'info', 'warning', 'error' (affects tone pitch)
 */
export const playNotificationSound = (type = 'info') => {
    try {
        // Create or reuse AudioContext
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Resume context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Create oscillator for the tone
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Set frequency based on notification type
        let frequency = 440; // Default A4 note
        if (type === 'warning') frequency = 523; // C5
        if (type === 'error') frequency = 659; // E5 (higher for urgency)

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

        // Second tone for "ding-dong" effect
        oscillator.frequency.setValueAtTime(frequency * 1.25, audioContext.currentTime + 0.1);

        // Envelope: quick attack, medium sustain, smooth decay
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Decay

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Play
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

        console.log('🔔 Notification sound played:', type);
    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
};
