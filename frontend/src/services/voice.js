/**
 * Voice Service for IDENTIA
 * Real-time speech recognition and text-to-speech
 * Uses Web Speech API for browser-native voice interaction
 */

class VoiceService {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.spanishVoice = null;

        this.initRecognition();
        this.loadSpanishVoice();
    }

    /**
     * Initialize speech recognition
     */
    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-DO'; // Dominican Spanish
        this.recognition.maxAlternatives = 1;
    }

    /**
     * Load Spanish voice for TTS
     */
    loadSpanishVoice() {
        const loadVoices = () => {
            const voices = this.synthesis.getVoices();
            // Prefer Latin American Spanish, fallback to any Spanish
            this.spanishVoice = voices.find(v => v.lang === 'es-MX') ||
                voices.find(v => v.lang === 'es-ES') ||
                voices.find(v => v.lang.startsWith('es')) ||
                voices[0];
        };

        loadVoices();
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = loadVoices;
        }
    }

    /**
     * Start listening for voice input
     * @param {Object} callbacks - { onResult, onInterim, onError, onEnd }
     */
    startListening(callbacks = {}) {
        if (!this.recognition) {
            callbacks.onError?.('Reconocimiento de voz no disponible en este navegador');
            return false;
        }

        // Stop any ongoing speech
        this.stopSpeaking();

        this.isListening = true;

        let finalTranscript = '';
        let interimTranscript = '';

        this.recognition.onresult = (event) => {
            interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Send interim results for live feedback
            if (interimTranscript) {
                callbacks.onInterim?.(interimTranscript);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;

            if (finalTranscript.trim()) {
                callbacks.onResult?.(finalTranscript.trim());
            }
            callbacks.onEnd?.();
        };

        this.recognition.onerror = (event) => {
            this.isListening = false;

            let errorMessage = 'Error de reconocimiento de voz';

            switch (event.error) {
                case 'not-allowed':
                    errorMessage = 'Por favor, permita el acceso al micrófono';
                    break;
                case 'no-speech':
                    errorMessage = 'No se detectó ninguna voz. Intente de nuevo.';
                    break;
                case 'network':
                    errorMessage = 'Error de conexión. Verifique su internet.';
                    break;
                case 'aborted':
                    errorMessage = 'Escucha cancelada';
                    break;
            }

            callbacks.onError?.(errorMessage);
        };

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Error starting recognition:', error);
            callbacks.onError?.('No se pudo iniciar el reconocimiento de voz');
            return false;
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    /**
     * Speak text using TTS
     * @param {string} text - Text to speak
     * @param {Object} options - { rate, pitch, volume, onEnd }
     */
    speak(text, options = {}) {
        if (!this.synthesis) {
            console.warn('Speech synthesis not available');
            options.onEnd?.();
            return;
        }

        // Stop any ongoing speech
        this.stopSpeaking();

        // Clean text for better speech
        const cleanText = text
            .replace(/[*#]/g, '')
            .replace(/\n+/g, '. ')
            .replace(/•/g, '')
            .replace(/\[.*?\]/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Configure voice
        if (this.spanishVoice) {
            utterance.voice = this.spanishVoice;
        }
        utterance.lang = 'es-MX';
        utterance.rate = options.rate || 0.9; // Slightly slower for elderly users
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        utterance.onstart = () => {
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            options.onEnd?.();
        };

        utterance.onerror = () => {
            this.isSpeaking = false;
            options.onEnd?.();
        };

        this.synthesis.speak(utterance);
    }

    /**
     * Stop speaking
     */
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }
    }

    /**
     * Check if browser supports speech
     */
    isSupported() {
        return {
            recognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
            synthesis: !!window.speechSynthesis
        };
    }
}

// Singleton instance
const voiceService = new VoiceService();
export default voiceService;
