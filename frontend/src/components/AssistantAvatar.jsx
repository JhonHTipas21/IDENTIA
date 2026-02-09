/**
 * AssistantAvatar Component
 * Visual indicator that changes state when listening, processing, or speaking
 * Provides visual feedback for voice interaction
 */

import { useEffect, useState } from 'react';

export default function AssistantAvatar({ state = 'idle' }) {
    const [waveHeights, setWaveHeights] = useState([40, 50, 60, 50, 40]);

    // Animate audio waves when listening or speaking
    useEffect(() => {
        if (state !== 'listening' && state !== 'speaking') {
            setWaveHeights([40, 50, 60, 50, 40]);
            return;
        }

        const interval = setInterval(() => {
            setWaveHeights(prev => prev.map(() => 20 + Math.random() * 60));
        }, 150);

        return () => clearInterval(interval);
    }, [state]);

    // Avatar configurations by state
    const stateConfig = {
        idle: {
            ringColor: 'ring-primary-200',
            bgColor: 'bg-gradient-to-br from-primary-400 to-primary-600',
            pulseColor: '',
            statusText: 'Listo para ayudar',
            statusIcon: '😊',
        },
        listening: {
            ringColor: 'ring-accent-400',
            bgColor: 'bg-gradient-to-br from-accent-400 to-accent-600',
            pulseColor: 'animate-pulse',
            statusText: 'Escuchando...',
            statusIcon: '👂',
        },
        processing: {
            ringColor: 'ring-yellow-400',
            bgColor: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
            pulseColor: 'animate-pulse',
            statusText: 'Procesando...',
            statusIcon: '🤔',
        },
        speaking: {
            ringColor: 'ring-green-400',
            bgColor: 'bg-gradient-to-br from-green-400 to-green-600',
            pulseColor: '',
            statusText: 'Hablando...',
            statusIcon: '💬',
        },
    };

    const config = stateConfig[state] || stateConfig.idle;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Main avatar container */}
            <div className="relative">
                {/* Outer glow ring */}
                {(state === 'listening' || state === 'speaking') && (
                    <div
                        className={`absolute -inset-4 rounded-full opacity-30 blur-md ${config.bgColor}`}
                        style={{ animation: 'pulse 2s ease-in-out infinite' }}
                    />
                )}

                {/* Avatar circle */}
                <div
                    className={`
            relative w-28 h-28 rounded-full 
            ${config.bgColor} ${config.pulseColor}
            ring-4 ${config.ringColor}
            shadow-xl
            flex items-center justify-center
            transition-all duration-300
          `}
                >
                    {/* Face or visualization */}
                    {state === 'listening' || state === 'speaking' ? (
                        // Audio visualization
                        <div className="flex items-center justify-center gap-1 h-12">
                            {waveHeights.map((height, i) => (
                                <div
                                    key={i}
                                    className="w-2 bg-white rounded-full transition-all duration-150"
                                    style={{
                                        height: `${height}%`,
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        // Face icon
                        <div className="text-5xl">
                            {state === 'processing' ? (
                                <div className="animate-spin">⚙️</div>
                            ) : (
                                <span className="drop-shadow-lg">🤖</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Status indicator dot */}
                <div
                    className={`
            absolute bottom-1 right-1 w-6 h-6 
            rounded-full border-2 border-white
            flex items-center justify-center text-xs
            ${state === 'idle' ? 'bg-green-500' :
                            state === 'listening' ? 'bg-accent-500' :
                                state === 'processing' ? 'bg-yellow-500' :
                                    'bg-green-500'}
          `}
                >
                    {state === 'listening' && '🎤'}
                    {state === 'processing' && '⏳'}
                    {state === 'speaking' && '🔊'}
                    {state === 'idle' && '✓'}
                </div>
            </div>

            {/* Status text */}
            <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{config.statusIcon}</span>
                    <span
                        className={`
              text-accessible-lg font-medium
              ${state === 'idle' ? 'text-gray-600' : 'text-gray-800'}
            `}
                    >
                        {config.statusText}
                    </span>
                </div>

                {/* IDENTIA branding */}
                <p className="text-sm text-gray-500 mt-1">
                    Asistente IDENTIA
                </p>
            </div>

            {/* Accessibility announcement */}
            <div className="sr-only" role="status" aria-live="polite">
                {state === 'listening' && 'IDENTIA está escuchando. Hable ahora.'}
                {state === 'processing' && 'IDENTIA está procesando su solicitud.'}
                {state === 'speaking' && 'IDENTIA está respondiendo.'}
                {state === 'idle' && 'IDENTIA está listo para ayudarle.'}
            </div>
        </div>
    );
}
