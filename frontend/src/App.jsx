/**
 * IDENTIA - Main Application
 * Ecosistema de Identidad y Asistencia Ciudadana
 * 
 * Features:
 * - Real voice recognition (Web Speech API)
 * - AI generative responses
 * - Biometric authentication (face/voice)
 * - Accessible interface for elderly users
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import MicrophoneButton from './components/MicrophoneButton';
import CameraViewer from './components/CameraViewer';
import StatusPanel from './components/StatusPanel';
import AssistantAvatar from './components/AssistantAvatar';
import MessageBubble from './components/MessageBubble';
import ProcedureSelector from './components/ProcedureSelector';
import BiometricAuth from './components/BiometricAuth';
import DocumentReview from './components/DocumentReview';
import voiceService from './services/voice';
import { startSession, sendMessage, processDocument } from './services/api';

function App() {
    // Core state
    const [currentStep, setCurrentStep] = useState('welcome');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');

    // Messages and conversation
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: '¡Hola! 👋 Soy IDENTIA, su asistente del gobierno.\n\nEstoy aquí para ayudarle con sus trámites. Puede hablar conmigo usando el micrófono o escribir su consulta.\n\n¿En qué puedo servirle hoy?'
        }
    ]);

    // Procedure state
    const [selectedProcedure, setSelectedProcedure] = useState(null);
    const [procedureStatus, setProcedureStatus] = useState({
        steps: [
            { id: 1, name: 'Verificar Identidad', status: 'pending' },
            { id: 2, name: 'Subir Documentos', status: 'pending' },
            { id: 3, name: 'Revisión Legal', status: 'pending' },
            { id: 4, name: 'Agendar Cita', status: 'pending' },
        ],
        currentStep: 0
    });

    // UI state
    const [showCamera, setShowCamera] = useState(false);
    const [showBiometric, setShowBiometric] = useState(false);
    const [biometricMode, setBiometricMode] = useState('face');
    const [isVerified, setIsVerified] = useState(false);
    const [showDocumentReview, setShowDocumentReview] = useState(false);
    const [documentData, setDocumentData] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [documentType, setDocumentType] = useState('cedula');
    const [textInput, setTextInput] = useState('');

    // Refs
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Initialize session on mount
    useEffect(() => {
        startSession().then(() => {
            console.log('IDENTIA session started');
        });
    }, []);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Speak the assistant's welcome message
    useEffect(() => {
        const timer = setTimeout(() => {
            speakMessage(messages[0].content);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    /**
     * Speak a message using TTS
     */
    const speakMessage = useCallback((text) => {
        setIsSpeaking(true);
        voiceService.speak(text, {
            rate: 0.85, // Slower for elderly users
            onEnd: () => setIsSpeaking(false)
        });
    }, []);

    /**
     * Process user input and get AI response
     */
    const processUserInput = useCallback(async (userText) => {
        if (!userText.trim()) return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: userText
        };
        setMessages(prev => [...prev, userMessage]);

        // Clear input
        setTextInput('');
        setInterimTranscript('');

        // Show processing state
        setIsProcessing(true);

        try {
            // Get AI response
            const response = await sendMessage(userText, {
                procedure: selectedProcedure,
                currentStep: procedureStatus.currentStep,
                isVerified: isVerified
            });

            // Add assistant response
            const assistantMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.response
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Speak the response
            speakMessage(response.response);

            // Handle special intents
            handleIntent(response.intent, userText);

        } catch (error) {
            console.error('Error processing message:', error);
            const errorMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Disculpe, tuve un problema procesando su solicitud. ¿Puede repetir lo que necesita?'
            };
            setMessages(prev => [...prev, errorMessage]);
            speakMessage(errorMessage.content);
        } finally {
            setIsProcessing(false);
        }
    }, [selectedProcedure, procedureStatus.currentStep, isVerified, speakMessage]);

    /**
     * Handle special intents from AI response
     */
    const handleIntent = useCallback((intent, userText) => {
        const lowerText = userText.toLowerCase();

        // Auto-detect procedure selection from voice
        if (lowerText.includes('cédula') || lowerText.includes('cedula')) {
            if (!selectedProcedure) {
                handleProcedureSelect({
                    id: 'cedula_renovation',
                    name: 'Renovación de Cédula',
                    icon: '🪪'
                });
            }
        } else if (lowerText.includes('acta') || lowerText.includes('nacimiento')) {
            if (!selectedProcedure) {
                handleProcedureSelect({
                    id: 'acta_nacimiento',
                    name: 'Acta de Nacimiento',
                    icon: '📄'
                });
            }
        } else if (lowerText.includes('licencia') || lowerText.includes('conducir')) {
            if (!selectedProcedure) {
                handleProcedureSelect({
                    id: 'licencia_conducir',
                    name: 'Licencia de Conducir',
                    icon: '🚗'
                });
            }
        }

        // Handle verification requests
        if (lowerText.includes('verificar') || lowerText.includes('identidad')) {
            if (procedureStatus.currentStep === 1 && !isVerified) {
                setTimeout(() => setShowBiometric(true), 1500);
            }
        }
    }, [selectedProcedure, procedureStatus.currentStep, isVerified]);

    /**
     * Handle procedure selection (from button or voice)
     */
    const handleProcedureSelect = useCallback((procedure) => {
        setSelectedProcedure(procedure);
        setCurrentStep('chat');

        const responseMessage = {
            id: Date.now(),
            role: 'assistant',
            content: `¡Perfecto! Vamos a iniciar su trámite de **${procedure.name}**.\n\nPrimero necesito verificar su identidad. Es muy fácil:\n\n• Solo mire a la cámara\n• O diga su nombre\n\n¿Está listo para la verificación biométrica?`
        };

        setMessages(prev => [...prev, responseMessage]);
        speakMessage(responseMessage.content);

        // Update status
        setProcedureStatus(prev => ({
            ...prev,
            steps: prev.steps.map((step, idx) =>
                idx === 0 ? { ...step, status: 'current' } : step
            ),
            currentStep: 1
        }));
    }, [speakMessage]);

    /**
     * Start voice recognition
     */
    const startListening = useCallback(() => {
        // Stop any ongoing speech first
        voiceService.stopSpeaking();
        setIsSpeaking(false);

        setIsListening(true);
        setInterimTranscript('');

        voiceService.startListening({
            onInterim: (transcript) => {
                setInterimTranscript(transcript);
            },
            onResult: (transcript) => {
                setIsListening(false);
                processUserInput(transcript);
            },
            onError: (error) => {
                setIsListening(false);
                console.error('Voice error:', error);

                // Add error message
                const errorMessage = {
                    id: Date.now(),
                    role: 'assistant',
                    content: `${error}\n\nPuede intentar de nuevo o escribir su mensaje en el campo de texto.`
                };
                setMessages(prev => [...prev, errorMessage]);
            },
            onEnd: () => {
                setIsListening(false);
                setInterimTranscript('');
            }
        });
    }, [processUserInput]);

    /**
     * Stop voice recognition
     */
    const stopListening = useCallback(() => {
        voiceService.stopListening();
        setIsListening(false);
    }, []);

    /**
     * Handle microphone button click
     */
    const handleMicrophoneToggle = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    /**
     * Handle text input submission
     */
    const handleTextSubmit = useCallback((e) => {
        e.preventDefault();
        if (textInput.trim() && !isProcessing) {
            processUserInput(textInput);
        }
    }, [textInput, isProcessing, processUserInput]);

    /**
     * Handle biometric verification success
     */
    const handleBiometricSuccess = useCallback((result) => {
        setShowBiometric(false);
        setIsVerified(true);

        const successMessage = {
            id: Date.now(),
            role: 'assistant',
            content: `✅ **¡Identidad verificada correctamente!**\n\nBienvenido/a. Su verificación biométrica fue exitosa con ${Math.round(result.confidence * 100)}% de confianza.\n\nAhora necesito una foto de su documento. ¿Tiene su cédula a mano?`
        };

        setMessages(prev => [...prev, successMessage]);
        speakMessage(successMessage.content);

        // Update status
        setProcedureStatus(prev => ({
            ...prev,
            steps: prev.steps.map((step, idx) => {
                if (idx === 0) return { ...step, status: 'complete' };
                if (idx === 1) return { ...step, status: 'current' };
                return step;
            }),
            currentStep: 2
        }));
    }, [speakMessage]);

    /**
     * Handle camera capture - shows DocumentReview for verification
     */
    const handleCapture = useCallback(async (imageData) => {
        setShowCamera(false);
        setIsProcessing(true);
        setCapturedImage(imageData);

        // Add user action message
        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: '📷 [Documento escaneado]'
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            // Process document with OCR
            const result = await processDocument(imageData, documentType);

            // Show confidence message
            const confidencePercent = Math.round((result.confidence || 0.85) * 100);
            const scanMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: `📋 **Documento procesado** (${confidencePercent}% confianza)\n\nPor favor revise los datos extraídos y corrija cualquier error antes de confirmar.`
            };
            setMessages(prev => [...prev, scanMessage]);
            speakMessage('Documento procesado. Por favor revise los datos extraídos.');

            // Store extracted data and show review modal
            setDocumentData(result);
            setShowDocumentReview(true);
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: '❌ No pude procesar el documento. ¿Puede intentar tomar otra foto con mejor iluminación?'
            };
            setMessages(prev => [...prev, errorMessage]);
            speakMessage(errorMessage.content);
        } finally {
            setIsProcessing(false);
        }
    }, [speakMessage, documentType]);

    /**
     * Handle document data confirmation from review
     */
    const handleDocumentConfirm = useCallback((confirmedData, wasEdited) => {
        setShowDocumentReview(false);

        // Build confirmation message
        let messageContent = `✅ **¡Datos ${wasEdited ? 'corregidos y ' : ''}confirmados!**\n\n`;
        messageContent += `**Información verificada:**\n`;

        // Show key fields based on document type
        if (confirmedData.nombre) messageContent += `• **Nombre:** ${confirmedData.nombre}\n`;
        if (confirmedData.cedula) messageContent += `• **Cédula:** ${confirmedData.cedula}\n`;
        if (confirmedData.pasaporte) messageContent += `• **Pasaporte:** ${confirmedData.pasaporte}\n`;
        if (confirmedData.licencia) messageContent += `• **Licencia:** ${confirmedData.licencia}\n`;
        if (confirmedData.fecha_nacimiento) messageContent += `• **Fecha de nacimiento:** ${confirmedData.fecha_nacimiento}\n`;
        if (confirmedData.fecha_expiracion) messageContent += `• **Fecha de expiración:** ${confirmedData.fecha_expiracion}\n`;

        messageContent += `\n${wasEdited ? 'Sus correcciones han sido guardadas. ' : ''}Continuemos con el siguiente paso.`;

        const confirmMessage = {
            id: Date.now(),
            role: 'assistant',
            content: messageContent
        };

        setMessages(prev => [...prev, confirmMessage]);
        speakMessage('Datos confirmados correctamente. Continuemos con el siguiente paso.');

        // Update procedure status
        setProcedureStatus(prev => ({
            ...prev,
            steps: prev.steps.map((step, idx) => {
                if (idx <= 1) return { ...step, status: 'complete' };
                if (idx === 2) return { ...step, status: 'current' };
                return step;
            }),
            currentStep: 3
        }));

        // Clear document data
        setDocumentData(null);
        setCapturedImage(null);
    }, [speakMessage]);

    /**
     * Handle retry document scan
     */
    const handleDocumentRetry = useCallback(() => {
        setShowDocumentReview(false);
        setDocumentData(null);
        setCapturedImage(null);
        setShowCamera(true);

        const retryMessage = {
            id: Date.now(),
            role: 'assistant',
            content: '📷 Vamos a tomar otra foto. Por favor coloque el documento dentro del marco.'
        };
        setMessages(prev => [...prev, retryMessage]);
    }, []);

    /**
     * Get avatar state based on current activity
     */
    const getAvatarState = () => {
        if (isListening) return 'listening';
        if (isProcessing) return 'processing';
        if (isSpeaking) return 'speaking';
        return 'idle';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="bg-primary-500 text-white py-4 px-6 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                            <span className="text-primary-500 text-2xl font-bold">ID</span>
                        </div>
                        <div>
                            <h1 className="text-accessible-xl font-bold">IDENTIA</h1>
                            <p className="text-sm opacity-80">Asistente de Trámites</p>
                        </div>
                    </div>

                    {/* Verified badge */}
                    {isVerified && (
                        <div className="flex items-center gap-2 bg-green-500 px-4 py-2 rounded-full">
                            <span>✓</span>
                            <span className="text-sm font-medium">Verificado</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-4xl mx-auto p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left side - Chat area */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Avatar */}
                        <div className="flex justify-center py-4">
                            <AssistantAvatar state={getAvatarState()} />
                        </div>

                        {/* Show procedure selector if on welcome step */}
                        {currentStep === 'welcome' && (
                            <ProcedureSelector onSelect={handleProcedureSelect} />
                        )}

                        {/* Message area */}
                        <div className="card min-h-[300px] max-h-[500px] overflow-y-auto">
                            <div className="space-y-4">
                                {messages.map(message => (
                                    <MessageBubble
                                        key={message.id}
                                        role={message.role}
                                        content={message.content}
                                    />
                                ))}

                                {/* Interim transcript (live voice feedback) */}
                                {interimTranscript && (
                                    <div className="flex justify-end">
                                        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl italic">
                                            {interimTranscript}...
                                        </div>
                                    </div>
                                )}

                                {/* Processing indicator */}
                                {isProcessing && (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></span>
                                            <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                            <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                        </div>
                                        <span className="text-accessible-base">Procesando...</span>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Text input form */}
                        <form onSubmit={handleTextSubmit} className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Escriba su mensaje aquí..."
                                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none text-accessible-base"
                                disabled={isProcessing || isListening}
                            />
                            <button
                                type="submit"
                                disabled={!textInput.trim() || isProcessing}
                                className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
                            >
                                Enviar
                            </button>
                        </form>

                        {/* Voice input and action buttons */}
                        <div className="flex flex-col items-center gap-4 py-6">
                            <MicrophoneButton
                                isListening={isListening}
                                onClick={handleMicrophoneToggle}
                                disabled={isProcessing}
                            />

                            <div className="flex gap-4 flex-wrap justify-center">
                                {/* Biometric verification button */}
                                {selectedProcedure && !isVerified && (
                                    <button
                                        className="btn-accent flex items-center gap-2"
                                        onClick={() => {
                                            setBiometricMode('face');
                                            setShowBiometric(true);
                                        }}
                                    >
                                        🔐 Verificar Identidad
                                    </button>
                                )}

                                {/* Document scan button */}
                                <button
                                    className="btn-primary"
                                    onClick={() => setShowCamera(true)}
                                    aria-label="Abrir cámara para escanear documento"
                                >
                                    📷 Escanear Documento
                                </button>

                                {/* Voice biometric option */}
                                {selectedProcedure && !isVerified && (
                                    <button
                                        className="btn-primary flex items-center gap-2"
                                        onClick={() => {
                                            setBiometricMode('voice');
                                            setShowBiometric(true);
                                        }}
                                    >
                                        🎤 Verificar con Voz
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right side - Status panel */}
                    <div className="lg:col-span-1">
                        <StatusPanel
                            procedure={selectedProcedure}
                            steps={procedureStatus.steps}
                            currentStep={procedureStatus.currentStep}
                        />
                    </div>
                </div>
            </main>

            {/* Camera modal */}
            {showCamera && (
                <CameraViewer
                    onCapture={handleCapture}
                    onClose={() => setShowCamera(false)}
                    documentType={documentType}
                />
            )}

            {/* Document Review modal */}
            {showDocumentReview && documentData && (
                <DocumentReview
                    documentType={documentType}
                    extractedData={documentData.extracted}
                    documentImage={capturedImage}
                    onConfirm={handleDocumentConfirm}
                    onRetry={handleDocumentRetry}
                    onClose={() => setShowDocumentReview(false)}
                />
            )}

            {/* Biometric authentication modal */}
            {showBiometric && (
                <BiometricAuth
                    mode={biometricMode}
                    onSuccess={handleBiometricSuccess}
                    onClose={() => setShowBiometric(false)}
                    onError={(error) => {
                        setShowBiometric(false);
                        const errorMessage = {
                            id: Date.now(),
                            role: 'assistant',
                            content: 'No pudimos verificar su identidad. ¿Desea intentar de nuevo o necesita ayuda?'
                        };
                        setMessages(prev => [...prev, errorMessage]);
                        speakMessage(errorMessage.content);
                    }}
                />
            )}

            {/* Footer */}
            <footer className="bg-primary-500 text-white py-4 mt-8">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <p className="text-accessible-base opacity-80">
                        IDENTIA - Gobierno Digital • Sus datos están protegidos 🔒
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;
