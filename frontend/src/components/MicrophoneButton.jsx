/**
 * MicrophoneButton Component
 * Giant, accessible microphone button for voice input
 * Designed for elderly users with large touch target (>50px)
 */

import { useState, useEffect } from 'react';

export default function MicrophoneButton({ isListening, onClick, disabled }) {
    const [pulseRings, setPulseRings] = useState([]);

    // Add pulse rings when listening
    useEffect(() => {
        if (!isListening) {
            setPulseRings([]);
            return;
        }

        const interval = setInterval(() => {
            setPulseRings(prev => {
                const newRings = [...prev, Date.now()];
                // Keep only last 3 rings
                return newRings.slice(-3);
            });
        }, 500);

        return () => clearInterval(interval);
    }, [isListening]);

    return (
        <div className="relative flex items-center justify-center">
            {/* Pulse rings animation */}
            {isListening && pulseRings.map((id) => (
                <div
                    key={id}
                    className="absolute w-32 h-32 rounded-full border-4 border-accent-500 animate-ping opacity-30"
                    style={{ animationDuration: '1.5s' }}
                />
            ))}

            {/* Main button */}
            <button
                className={`btn-microphone ${isListening ? 'listening' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={onClick}
                disabled={disabled}
                aria-label={isListening ? 'Dejar de escuchar' : 'Hablar con IDENTIA'}
                aria-pressed={isListening}
            >
                {isListening ? (
                    // Listening state - animated bars
                    <div className="flex items-center justify-center gap-1 h-12">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="audio-bar"
                                style={{
                                    height: `${20 + Math.random() * 20}px`,
                                    animationDelay: `${i * 0.1}s`
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    // Idle state - microphone icon
                    <svg
                        className="w-14 h-14"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                    </svg>
                )}
            </button>

            {/* Label below button */}
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="text-accessible-lg font-medium text-gray-700">
                    {isListening ? '🎙️ Escuchando...' : 'Toque para hablar'}
                </span>
            </div>
        </div>
    );
}
