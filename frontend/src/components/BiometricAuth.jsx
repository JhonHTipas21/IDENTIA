/**
 * BiometricAuth Component
 * Facial and voice biometric authentication for IDENTIA
 * "One touch/look" verification for elderly users
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export default function BiometricAuth({
    onSuccess,
    onClose,
    onError,
    mode = 'face' // 'face', 'voice', or 'both'
}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('intro'); // intro, scanning, analyzing, success, error
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [faceDetected, setFaceDetected] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const [voiceRecording, setVoiceRecording] = useState(false);

    // Instructions by phase
    const instructions = {
        intro: {
            title: '🔐 Verificación de Identidad',
            subtitle: 'Un proceso simple y seguro',
            steps: mode === 'face'
                ? ['Mire directamente a la cámara', 'Mantenga una expresión neutral', 'Espere 3 segundos']
                : mode === 'voice'
                    ? ['Presione el botón de micrófono', 'Diga su nombre completo', 'Hablaremos para verificar']
                    : ['Primero verificaremos su rostro', 'Luego su voz', 'Solo tomará unos segundos']
        },
        scanning: {
            face: 'Escaneando su rostro...',
            voice: 'Escuchando su voz...'
        },
        analyzing: 'Analizando...',
        success: '✅ ¡Identidad verificada!',
        error: '❌ No se pudo verificar'
    };

    // Initialize camera for face detection
    useEffect(() => {
        if (mode !== 'voice' && (phase === 'intro' || phase === 'scanning')) {
            initCamera();
        }

        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [mode, phase]);

    const initCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setHasCamera(true);
            }
        } catch (error) {
            console.error('Camera error:', error);
            setMessage('No se pudo acceder a la cámara');
        }
    };

    // Simulate face detection (in production, use face-api.js or similar)
    useEffect(() => {
        if (phase !== 'scanning' || mode === 'voice') return;

        const detectFace = setInterval(() => {
            // Simulate face detection with random success
            const detected = Math.random() > 0.3;
            setFaceDetected(detected);

            if (detected) {
                setProgress(prev => {
                    const newProgress = prev + 15;
                    if (newProgress >= 100) {
                        clearInterval(detectFace);
                        captureAndVerify();
                    }
                    return Math.min(newProgress, 100);
                });
            }
        }, 500);

        return () => clearInterval(detectFace);
    }, [phase, mode]);

    // Start biometric scanning
    const startScanning = useCallback(() => {
        setPhase('scanning');
        setProgress(0);
        setMessage(instructions.scanning[mode === 'voice' ? 'voice' : 'face']);
    }, [mode]);

    // Capture face and verify
    const captureAndVerify = useCallback(async () => {
        setPhase('analyzing');
        setMessage(instructions.analyzing);

        // Capture frame from video
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = 320;
            canvas.height = 240;
            ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        }

        // Simulate biometric verification (2 second delay)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate 95% success rate
        const success = Math.random() > 0.05;

        if (success) {
            setPhase('success');
            setMessage(instructions.success);

            // Callback after showing success
            setTimeout(() => {
                onSuccess?.({
                    type: mode,
                    verified: true,
                    confidence: 0.97,
                    timestamp: new Date().toISOString()
                });
            }, 1500);
        } else {
            setPhase('error');
            setMessage('No pudimos verificar su identidad. Por favor, intente de nuevo.');
        }
    }, [mode, onSuccess]);

    // Voice verification
    const startVoiceVerification = useCallback(() => {
        setVoiceRecording(true);
        setPhase('scanning');
        setMessage('Por favor, diga: "Mi nombre es..."');

        // Simulate voice recording and verification
        setTimeout(() => {
            setVoiceRecording(false);
            setProgress(50);
            setMessage('Analizando voz...');

            setTimeout(() => {
                setProgress(100);
                setPhase('success');
                setMessage(instructions.success);

                setTimeout(() => {
                    onSuccess?.({
                        type: 'voice',
                        verified: true,
                        confidence: 0.94,
                        timestamp: new Date().toISOString()
                    });
                }, 1500);
            }, 2000);
        }, 3000);
    }, [onSuccess]);

    // Retry verification
    const retry = useCallback(() => {
        setPhase('intro');
        setProgress(0);
        setFaceDetected(false);
        setMessage('');
    }, []);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-accessible-xl font-bold">
                            {phase === 'success' ? '🎉' : '🔐'} Verificación Biométrica
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="mt-2 opacity-90">
                        {mode === 'face' ? 'Reconocimiento facial' :
                            mode === 'voice' ? 'Verificación por voz' :
                                'Verificación completa'}
                    </p>
                </div>

                {/* Content area */}
                <div className="p-6">
                    {/* Intro phase */}
                    {phase === 'intro' && (
                        <div className="text-center space-y-6">
                            <div className="w-24 h-24 mx-auto bg-primary-50 rounded-full flex items-center justify-center">
                                <span className="text-5xl">
                                    {mode === 'face' ? '👤' : mode === 'voice' ? '🎤' : '🔐'}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-accessible-lg font-bold text-gray-800">
                                    {instructions.intro.title}
                                </h3>
                                <p className="text-gray-600 mt-1">
                                    {instructions.intro.subtitle}
                                </p>
                            </div>

                            <ul className="text-left space-y-3 bg-gray-50 rounded-xl p-4">
                                {instructions.intro.steps.map((step, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">
                                            {i + 1}
                                        </span>
                                        <span className="text-accessible-base text-gray-700">{step}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={mode === 'voice' ? startVoiceVerification : startScanning}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-accessible-lg font-bold shadow-lg hover:shadow-xl transition-all"
                            >
                                {mode === 'voice' ? '🎤 Comenzar con voz' : '📷 Comenzar verificación'}
                            </button>
                        </div>
                    )}

                    {/* Scanning phase - Face */}
                    {phase === 'scanning' && mode !== 'voice' && (
                        <div className="space-y-4">
                            {/* Camera preview */}
                            <div className="relative aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />

                                {/* Face outline guide */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className={`w-40 h-52 border-4 rounded-[50%] transition-colors duration-300 ${faceDetected ? 'border-green-500 shadow-lg shadow-green-500/30' : 'border-white/50 border-dashed'
                                        }`} />
                                </div>

                                {/* Status indicator */}
                                <div className="absolute top-4 left-4 right-4">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-yellow-500'
                                        } text-white text-sm font-medium`}>
                                        <span className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-white' : 'bg-white animate-pulse'}`} />
                                        {faceDetected ? '✓ Rostro detectado' : 'Buscando rostro...'}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Escaneando...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-green-500 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <p className="text-center text-gray-600">
                                Mantenga su rostro dentro del óvalo
                            </p>
                        </div>
                    )}

                    {/* Scanning phase - Voice */}
                    {phase === 'scanning' && mode === 'voice' && (
                        <div className="text-center space-y-6">
                            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${voiceRecording ? 'bg-red-500 animate-pulse' : 'bg-primary-100'
                                }`}>
                                <span className="text-6xl">{voiceRecording ? '🎙️' : '🎤'}</span>
                            </div>

                            <div>
                                <h3 className="text-accessible-lg font-bold text-gray-800">
                                    {voiceRecording ? 'Escuchando...' : message}
                                </h3>
                                {voiceRecording && (
                                    <p className="text-gray-600 mt-2">
                                        Diga: "Mi nombre es [su nombre completo]"
                                    </p>
                                )}
                            </div>

                            {/* Audio waveform visualization */}
                            {voiceRecording && (
                                <div className="flex items-center justify-center gap-1 h-16">
                                    {[...Array(9)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-2 bg-red-500 rounded-full animate-pulse"
                                            style={{
                                                height: `${20 + Math.random() * 40}px`,
                                                animationDelay: `${i * 0.1}s`
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Analyzing phase */}
                    {phase === 'analyzing' && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-24 h-24 mx-auto border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            <div>
                                <h3 className="text-accessible-lg font-bold text-gray-800">
                                    Verificando identidad...
                                </h3>
                                <p className="text-gray-600 mt-2">
                                    Esto solo tomará un momento
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success phase */}
                    {phase === 'success' && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                                <span className="text-5xl">✅</span>
                            </div>
                            <div>
                                <h3 className="text-accessible-xl font-bold text-green-600">
                                    ¡Identidad Verificada!
                                </h3>
                                <p className="text-gray-600 mt-2">
                                    Bienvenido/a. Puede continuar con su trámite.
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                Verificación segura completada
                            </div>
                        </div>
                    )}

                    {/* Error phase */}
                    {phase === 'error' && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-5xl">😔</span>
                            </div>
                            <div>
                                <h3 className="text-accessible-lg font-bold text-red-600">
                                    Verificación fallida
                                </h3>
                                <p className="text-gray-600 mt-2">
                                    {message}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={retry}
                                    className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium"
                                >
                                    🔄 Intentar de nuevo
                                </button>
                                <button
                                    onClick={() => onError?.('Verification failed')}
                                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium"
                                >
                                    Necesito ayuda
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Security note */}
                <div className="bg-gray-50 px-6 py-4 border-t">
                    <p className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                        🔒 Sus datos biométricos están protegidos y no se almacenan
                    </p>
                </div>
            </div>
        </div>
    );
}
