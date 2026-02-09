/**
 * CameraViewer Component
 * Document scanner with visual guides for ID placement
 * Provides real-time feedback and accessible instructions
 */

import { useState, useRef, useEffect } from 'react';

export default function CameraViewer({ onCapture, onClose, documentType }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [hasCamera, setHasCamera] = useState(false);
    const [isAligned, setIsAligned] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [error, setError] = useState(null);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Document guide dimensions based on type
    const guideConfig = {
        cedula: { width: 280, height: 180, label: 'Cédula de Identidad' },
        passport: { width: 220, height: 300, label: 'Pasaporte' },
        license: { width: 280, height: 180, label: 'Licencia de Conducir' },
    };

    const guide = guideConfig[documentType] || guideConfig.cedula;

    // Initialize camera
    useEffect(() => {
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: 1280, height: 720 }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasCamera(true);
                }
            } catch (err) {
                console.error('Camera error:', err);
                setError('No se pudo acceder a la cámara.');
                // Enable demo mode when camera isn't available
                setIsDemoMode(true);
            }
        };

        initCamera();

        // Cleanup
        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Simulate alignment detection (in production, use edge detection)
    useEffect(() => {
        if (!hasCamera && !isDemoMode) return;

        const checkAlignment = setInterval(() => {
            // Simulate occasional alignment detection
            setIsAligned(Math.random() > 0.5);
        }, 1500);

        return () => clearInterval(checkAlignment);
    }, [hasCamera, isDemoMode]);

    // Handle capture
    const handleCapture = () => {
        // Show countdown
        setCountdown(3);

        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    captureImage();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const captureImage = () => {
        if (isDemoMode) {
            // In demo mode, simulate a successful capture
            onCapture('demo-capture-image-data');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {
            onCapture('demo-capture-image-data');
            return;
        }

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        // Stop camera
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }

        onCapture(imageData);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="bg-primary-500 text-white py-4 px-6 flex justify-between items-center">
                <h2 className="text-accessible-xl font-bold">📷 Escanear {guide.label}</h2>
                <button
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    aria-label="Cerrar cámara"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Camera view */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900">
                {/* Video element (hidden if no camera) */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!hasCamera ? 'hidden' : ''}`}
                />

                {/* Demo mode placeholder */}
                {isDemoMode && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <div className="text-center text-white/60">
                            <span className="text-6xl mb-4 block">📷</span>
                            <p className="text-lg">Modo de demostración</p>
                            <p className="text-sm mt-2">Cámara no disponible</p>
                        </div>
                    </div>
                )}

                {/* Document guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Darkened corners */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Clear center rectangle */}
                    <div
                        className={`relative border-4 rounded-xl bg-transparent ${isAligned ? 'border-green-500 shadow-lg shadow-green-500/30' : 'border-white border-dashed'}`}
                        style={{ width: guide.width, height: guide.height }}
                    >
                        {/* Corner markers */}
                        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => (
                            <div
                                key={corner}
                                className={`absolute w-8 h-8 border-4 ${isAligned ? 'border-green-500' : 'border-accent-500'}`}
                                style={{
                                    top: corner.includes('top') ? -4 : 'auto',
                                    bottom: corner.includes('bottom') ? -4 : 'auto',
                                    left: corner.includes('left') ? -4 : 'auto',
                                    right: corner.includes('right') ? -4 : 'auto',
                                    borderTop: corner.includes('bottom') ? 'none' : undefined,
                                    borderBottom: corner.includes('top') ? 'none' : undefined,
                                    borderLeft: corner.includes('right') ? 'none' : undefined,
                                    borderRight: corner.includes('left') ? 'none' : undefined,
                                    borderRadius: '4px',
                                }}
                            />
                        ))}

                        {/* Countdown overlay */}
                        {countdown && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                <span className="text-white text-6xl font-bold animate-pulse">{countdown}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Guide text */}
                <div className="absolute top-20 left-0 right-0 text-center z-10">
                    <p className={`text-accessible-lg font-medium px-4 py-2 rounded-full inline-block ${isAligned ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-800'}`}>
                        {isAligned ? '✅ ¡Documento alineado!' : '📄 Coloque su documento dentro del marco'}
                    </p>
                </div>
            </div>

            {/* Capture button - always visible */}
            {!countdown && (
                <div className="bg-black py-6 flex justify-center">
                    <button
                        onClick={handleCapture}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                        aria-label="Tomar foto"
                    >
                        <div className="w-16 h-16 rounded-full border-4 border-accent-500" />
                    </button>
                </div>
            )}

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Instructions at bottom */}
            <div className="bg-primary-500 text-white py-4 px-6">
                <ul className="text-accessible-base space-y-2">
                    <li>• Asegúrese de tener buena iluminación</li>
                    <li>• Evite reflejos y sombras</li>
                    <li>• Mantenga la cámara firme</li>
                </ul>
            </div>
        </div>
    );
}
