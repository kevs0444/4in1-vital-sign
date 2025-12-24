let voices = [];

// Helper to reliably load voices (Chrome loads them async)
const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
};

if (window.speechSynthesis) {
    console.log("🎙️ Speech Synthesis Supported");
    loadVoices();
    // Chrome requires this event to populate the voice list
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            loadVoices();
            console.log("🎙️ Voices loaded:", voices.length);
        };
    }
} else {
    console.warn("⚠️ Speech Synthesis NOT supported in this browser");
}

export const speak = (text) => {
    if (!text || typeof text !== 'string') return;

    try {
        if (!window.speechSynthesis) return;

        // Retry loading voices if they weren't ready yet
        if (voices.length === 0) {
            voices = window.speechSynthesis.getVoices();
        }

        // Cancel any ongoing speech to avoid overlap/queueing
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Smart Voice Selection Strategy
        // 1. Google US English (Natural, high quality)
        // 2. Microsoft Zira (Standard Windows decent voice)
        // 3. Any "Google" voice (Android/Chrome defaults)
        const preferredVoice = voices.find(v => v.name === 'Google US English') ||
            voices.find(v => v.name.includes('Google') && v.lang.includes('en-US')) ||
            voices.find(v => v.name.includes('Zira')) ||
            voices.find(v => v.name.includes('Google')) ||
            voices.find(v => v.lang.includes('en-US'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        // Slightly adjust for clarity
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn("Speech synthesis error:", e);
    }
};
