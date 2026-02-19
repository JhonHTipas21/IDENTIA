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
import RegistraduriaMenu from './components/RegistraduriaMenu';
import BiometricAuth from './components/BiometricAuth';
import DocumentReview from './components/DocumentReview';
import CalendarPicker from './components/CalendarPicker';
import Navigation from './components/Navigation';
import StatusView from './components/StatusView';
import voiceService from './services/voice';
import {
    startSession, sendMessage, processDocument,
    tramiteCedula, consultarTarifas, agendarCita
} from './services/api';


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
            content: '¡Hola! 👋 Soy IDENTIA, su asistente de la **Registraduría Nacional de Colombia**.\n\nEstoy aquí para ayudarle con sus trámites de identidad y registro civil. Puede hablar conmigo usando el micrófono o escribir su consulta.\n\n¿En qué puedo servirle hoy?'
        }
    ]);

    // Registraduría menu state
    const [showRegistraduriaMenu, setShowRegistraduriaMenu] = useState(false);

    // Navigation history stack — each entry is a state snapshot for "Volver"
    const [navHistory, setNavHistory] = useState([]);

    // Procedure state
    const [selectedProcedure, setSelectedProcedure] = useState(null);
    // flowStep: 'identity' | 'document' | 'legal' | 'schedule' | 'done'
    const [flowStep, setFlowStep] = useState('identity');
    const [tramitePin, setTramitePin] = useState(null);
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
    const [showCalendar, setShowCalendar] = useState(false);
    const [showStatusView, setShowStatusView] = useState(false);
    const [voiceVerifyMode, setVoiceVerifyMode] = useState(false); // true when waiting for name+cedula by voice
    const [matrimonioMode, setMatrimonioMode] = useState(false); // true when waiting for marriage registration number

    // Refs
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    // Stable ref to startListening — avoids circular dependency in handleProcedureSelect
    const startListeningRef = useRef(null);

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
     * Includes voice identity verification detection
     */
    /**
     * Push current nav state to history stack
     */
    const _pushNavHistory = useCallback(() => {
        setNavHistory(prev => [...prev, {
            currentStep,
            selectedProcedure,
            flowStep,
            isVerified,
            tramitePin,
            voiceVerifyMode,
            matrimonioMode,
            procedureStatus,
            showRegistraduriaMenu,
        }]);
    }, [currentStep, selectedProcedure, flowStep, isVerified, tramitePin,
        voiceVerifyMode, matrimonioMode, procedureStatus, showRegistraduriaMenu]);

    /**
     * Go back to previous nav state
     */
    const handleBack = useCallback(() => {
        setNavHistory(prev => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            setCurrentStep(last.currentStep);
            setSelectedProcedure(last.selectedProcedure);
            setFlowStep(last.flowStep);
            setIsVerified(last.isVerified);
            setTramitePin(last.tramitePin);
            setVoiceVerifyMode(last.voiceVerifyMode);
            setMatrimonioMode(last.matrimonioMode);
            setProcedureStatus(last.procedureStatus);
            setShowRegistraduriaMenu(last.showRegistraduriaMenu);
            return prev.slice(0, -1);
        });
    }, []);

    /**
     * Go home — reset flow but keep session and messages
     */
    const handleHome = useCallback(() => {
        setCurrentStep('welcome');
        setSelectedProcedure(null);
        setFlowStep('identity');
        setIsVerified(false);
        setTramitePin(null);
        setVoiceVerifyMode(false);
        setMatrimonioMode(false);
        setShowRegistraduriaMenu(false);
        setShowCamera(false);
        setShowBiometric(false);
        setShowDocumentReview(false);
        setShowCalendar(false);
        setDocumentData(null);
        setCapturedImage(null);
        setNavHistory([]);
        setProcedureStatus({
            steps: [
                { id: 1, name: 'Verificar Identidad', status: 'pending' },
                { id: 2, name: 'Subir Documentos', status: 'pending' },
                { id: 3, name: 'Revisión Legal', status: 'pending' },
                { id: 4, name: 'Agendar Cita', status: 'pending' },
            ],
            currentStep: 0
        });
        const homeMsg = {
            id: Date.now(),
            role: 'assistant',
            content: '🏠 Ha vuelto al menú principal. ¿En qué puedo ayudarle?'
        };
        setMessages(prev => [...prev, homeMsg]);
        speakMessage('Ha vuelto al menú principal. ¿En qué puedo ayudarle?');
    }, [speakMessage]);

    const processUserInput = useCallback(async (userText) => {
        if (!userText.trim()) return;

        // --- Consultar estado del trámite ---
        const lowerCheck = userText.toLowerCase();
        if (
            lowerCheck.includes('consultar estado') ||
            lowerCheck.includes('estado de mi trámite') ||
            lowerCheck.includes('estado del trámite') ||
            lowerCheck.includes('mi pin') ||
            lowerCheck.includes('seguimiento')
        ) {
            setShowStatusView(true);
            const msg = { id: Date.now(), role: 'assistant', content: '📋 Abriendo consulta de estado. Por favor ingrese su PIN de 6 caracteres.' };
            setMessages(prev => [...prev, msg]);
            return;
        }

        // --- Matrimonio registration number mode ---
        if (matrimonioMode) {
            // Only accept numeric input
            const onlyDigits = userText.replace(/\D/g, '');
            const validPattern = /^\d{7,11}$/.test(onlyDigits) || /^\d{2}-\d{4}-\d{7}$/.test(userText.trim());

            const userMsg = { id: Date.now(), role: 'user', content: userText };
            setMessages(prev => [...prev, userMsg]);
            setTextInput('');

            if (!validPattern || onlyDigits.length < 7) {
                const errMsg = {
                    id: Date.now() + 1, role: 'assistant',
                    content: '⚠️ El número de registro debe contener entre 7 y 11 dígitos.\n\nPor favor diga o escriba solo los números de su registro de matrimonio.'
                };
                setMessages(prev => [...prev, errMsg]);
                speakMessage('El número de registro debe contener entre 7 y 11 dígitos. Por favor intente de nuevo.');
                return;
            }

            setMatrimonioMode(false);
            const okMsg = {
                id: Date.now() + 1, role: 'assistant',
                content: `✅ **Número de registro recibido:** \`${onlyDigits}\`\n\nProcesando su solicitud de Registro de Matrimonio...`
            };
            setMessages(prev => [...prev, okMsg]);
            speakMessage(`Número de registro recibido: ${onlyDigits}. Procesando su solicitud.`);
            return;
        }

        // --- Voice identity verification mode ---
        // If we're waiting for name + cedula by voice, intercept and verify
        if (voiceVerifyMode && selectedProcedure) {
            const cedulaMatch = userText.match(/\b(\d{6,12})\b/);
            const hasName = userText.trim().split(' ').length >= 2;

            if (cedulaMatch && hasName) {
                const cedula = cedulaMatch[1];
                const nombre = userText.replace(cedula, '').trim();

                // Add user message
                setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userText }]);
                setTextInput('');
                setInterimTranscript('');
                setIsProcessing(true);

                try {
                    const res = await fetch('/api/verificacion/voz', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre, cedula, umbral_confianza: 0.75 })
                    });
                    const data = await res.json();

                    const msg = { id: Date.now() + 1, role: 'assistant', content: data.mensaje };
                    setMessages(prev => [...prev, msg]);
                    speakMessage(data.mensaje);

                    if (data.verificado) {
                        setVoiceVerifyMode(false);
                        setIsVerified(true);
                        // Auto-advance state machine
                        setFlowStep('legal');
                        setProcedureStatus(prev => ({
                            ...prev,
                            steps: prev.steps.map((s, i) => {
                                if (i === 0) return { ...s, status: 'complete' };
                                if (i === 1) return { ...s, status: 'complete' };
                                if (i === 2) return { ...s, status: 'complete' };
                                if (i === 3) return { ...s, status: 'current' };
                                return s;
                            }),
                            currentStep: 4
                        }));

                        // Generate PIN and advance to scheduling
                        setTimeout(async () => {
                            await _generarPinYAvanzar(selectedProcedure, { nombre });
                        }, 1500);
                    }
                } catch {
                    const fallback = {
                        id: Date.now() + 1, role: 'assistant',
                        content: 'No logré encontrarte, por favor intenta decir tu cédula nuevamente o solicita ayuda.\n\n📞 Línea de ayuda: **01 8000 111 555**'
                    };
                    setMessages(prev => [...prev, fallback]);
                    speakMessage(fallback.content);
                } finally {
                    setIsProcessing(false);
                }
                return;
            }
        }

        // Add user message
        const userMessage = { id: Date.now(), role: 'user', content: userText };
        setMessages(prev => [...prev, userMessage]);
        setTextInput('');
        setInterimTranscript('');
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
        // Special case: show Registraduría full menu
        if (procedure.id === 'ver_todos') {
            setShowRegistraduriaMenu(true);
            return;
        }

        // Push current state to nav history before changing
        _pushNavHistory();

        setSelectedProcedure(procedure);
        setCurrentStep('chat');
        setShowRegistraduriaMenu(false);

        // Matrimonio: activate voice registration number mode
        if (procedure.id === 'matrimonio' || procedure.name?.toLowerCase().includes('matrimonio')) {
            setMatrimonioMode(true);
        }

        // Contextual message based on the selected service
        let content = `¡Perfecto! Vamos a iniciar su trámite de **${procedure.name}**.\n\n`;

        if (procedure.requiereBiometria) {
            content += `Este trámite requiere **verificación biométrica facial** por seguridad.\n\n`;
            content += `Por favor mire a la cámara cuando esté listo. 👁️`;
        } else {
            content += `Primero necesito verificar su identidad. Es muy fácil:\n\n`;
            content += `• Solo mire a la cámara\n• O diga su nombre\n\n`;
            content += `¿Está listo para la verificación?`;
        }

        if (procedure.tarifa) {
            const esGratuita = procedure.tarifa === 'GRATUITA' || procedure.tarifa.startsWith('Desde GRATUITA');
            content += `\n\n💰 **Tarifa:** ${procedure.tarifa}`;
            if (esGratuita) content += ` ✅`;
        }

        const responseMessage = { id: Date.now(), role: 'assistant', content };
        setMessages(prev => [...prev, responseMessage]);
        speakMessage(responseMessage.content);

        // Matrimonio: emit voice prompt and auto-start mic after message
        if (procedure.id === 'matrimonio' || procedure.name?.toLowerCase().includes('matrimonio')) {
            setTimeout(() => {
                const matrimonioPrompt = {
                    id: Date.now() + 10,
                    role: 'assistant',
                    content: '🎤 **Registro de Matrimonio**\n\nPor favor, diga claramente el **número de su registro de matrimonio**.\n\nEjemplo: *"11-2023-1234567"* o simplemente los dígitos: *"11234567"*'
                };
                setMessages(prev => [...prev, matrimonioPrompt]);
                speakMessage('Por favor, diga claramente el número de su registro de matrimonio.');
                // Auto-start microphone after TTS (use ref to avoid circular dependency)
                setTimeout(() => startListeningRef.current?.(), 3500);
            }, 2200);
        }

        // Update status
        setProcedureStatus(prev => ({
            ...prev,
            steps: prev.steps.map((step, idx) =>
                idx === 0 ? { ...step, status: 'current' } : step
            ),
            currentStep: 1
        }));

        // Auto-trigger biometric for duplicates
        if (procedure.requiereBiometria) {
            setTimeout(() => {
                setBiometricMode('face');
                setShowBiometric(true);
            }, 2000);
        }
    }, [speakMessage]);

    /**
     * Handle selection from RegistraduriaMenu (full menu)
     */
    const handleRegistraduriaSelect = useCallback((servicio) => {
        handleProcedureSelect(servicio);
    }, [handleProcedureSelect]);



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

    // Keep startListeningRef in sync so matrimonio timeout can call it without circular deps
    useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

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
     * Auto-advances: identity → legal → schedule (skips document scan for voice-verified users)
     */
    const handleBiometricSuccess = useCallback(async (result) => {
        setShowBiometric(false);
        setIsVerified(true);
        setFlowStep('legal');

        const successMessage = {
            id: Date.now(),
            role: 'assistant',
            content: `✅ **¡Identidad verificada!** (${Math.round(result.confidence * 100)}% de confianza)\n\nExcelente. Estamos procesando su solicitud...\n\n⏳ Revisión legal automática en curso.`
        };
        setMessages(prev => [...prev, successMessage]);
        speakMessage(successMessage.content);

        // Mark identity + document + legal as complete, scheduling as current
        setProcedureStatus(prev => ({
            ...prev,
            steps: prev.steps.map((step, idx) => {
                if (idx === 0) return { ...step, status: 'complete' };
                if (idx === 1) return { ...step, status: 'complete' };
                if (idx === 2) return { ...step, status: 'complete' };
                if (idx === 3) return { ...step, status: 'current' };
                return step;
            }),
            currentStep: 4
        }));

        // Auto-advance to scheduling after brief delay
        setTimeout(async () => {
            await _generarPinYAvanzar(selectedProcedure, {});
        }, 2000);
    }, [speakMessage, selectedProcedure]);


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
     * Advances directly to 'Agendar Cita' (does NOT get stuck at 'Revisión Legal')
     */
    const handleDocumentConfirm = useCallback(async (confirmedData, wasEdited) => {
        setShowDocumentReview(false);

        let messageContent = `✅ **¡Datos ${wasEdited ? 'corregidos y ' : ''}confirmados!**\n\n**Información verificada:**\n`;
        if (confirmedData.nombre) messageContent += `• **Nombre:** ${confirmedData.nombre}\n`;
        if (confirmedData.cedula) messageContent += `• **Cédula:** ${confirmedData.cedula}\n`;
        if (confirmedData.fecha_nacimiento) messageContent += `• **Fecha de nacimiento:** ${confirmedData.fecha_nacimiento}\n`;
        if (confirmedData.fecha_expiracion) messageContent += `• **Fecha de expiración:** ${confirmedData.fecha_expiracion}\n`;
        messageContent += `\n⏳ Procesando revisión legal automática...`;

        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: messageContent }]);
        speakMessage('Datos confirmados. Procesando revisión legal.');

        // Mark docs + legal as complete, advance to scheduling
        setFlowStep('schedule');
        setProcedureStatus(prev => ({
            ...prev,
            steps: prev.steps.map((step, idx) => {
                if (idx <= 2) return { ...step, status: 'complete' };
                if (idx === 3) return { ...step, status: 'current' };
                return step;
            }),
            currentStep: 4
        }));

        setDocumentData(null);
        setCapturedImage(null);

        // Generate PIN and open calendar
        setTimeout(async () => {
            await _generarPinYAvanzar(selectedProcedure, confirmedData);
        }, 1500);
    }, [speakMessage, selectedProcedure]);


    /**
     * Generate PIN via backend and open CalendarPicker
     * Called after identity verification or document confirmation
     */
    const _generarPinYAvanzar = async (procedure, datosExtra) => {
        try {
            const res = await fetch('/api/tramites/iniciar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: procedure?.id || 'tramite_general',
                    datos_ciudadano: datosExtra || {}
                })
            });
            const data = await res.json();
            const pin = data.pin;
            setTramitePin(pin);

            const pinMsg = {
                id: Date.now(),
                role: 'assistant',
                content: (
                    `✅ **Revisión legal completada.**\n\n` +
                    `📌 **Su PIN de seguimiento es: \`${pin}\`**\n` +
                    `Guárdelo para consultar el estado de su trámite en cualquier momento.\n\n` +
                    `📅 Ahora vamos a agendar su cita en la Registraduría.`
                )
            };
            setMessages(prev => [...prev, pinMsg]);
            speakMessage(`Su PIN de seguimiento es ${pin.split('').join(' ')}. Ahora agendemos su cita.`);

            // Open calendar after message
            setTimeout(() => setShowCalendar(true), 1200);
        } catch {
            // Fallback: open calendar without PIN
            const fallbackPin = Math.random().toString(36).substring(2, 8).toUpperCase();
            setTramitePin(fallbackPin);
            const msg = {
                id: Date.now(),
                role: 'assistant',
                content: `📅 Excelente. Ahora agendemos su cita en la Registraduría.\n\n📌 **PIN provisional: \`${fallbackPin}\`**`
            };
            setMessages(prev => [...prev, msg]);
            speakMessage(msg.content);
            setTimeout(() => setShowCalendar(true), 1200);
        }
    };

    /**
     * Handle calendar confirmation — marks procedure as done
     */
    const handleCalendarConfirm = useCallback((citaData) => {
        setShowCalendar(false);
        setFlowStep('done');

        // Mark all steps complete
        setProcedureStatus(prev => ({
            ...prev,
            steps: prev.steps.map(step => ({ ...step, status: 'complete' })),
            currentStep: 5
        }));

        const doneMsg = {
            id: Date.now(),
            role: 'assistant',
            content: (
                `🎉 **¡Trámite completado exitosamente!**\n\n` +
                `${citaData?.mensaje || 'Su cita ha sido agendada.'}\n\n` +
                `📌 **PIN de seguimiento: \`${tramitePin}\`**\n\n` +
                `Puede consultar el estado de su trámite en cualquier momento diciendo o escribiendo su PIN.\n\n` +
                `📞 Línea de ayuda: **01 8000 111 555**`
            )
        };
        setMessages(prev => [...prev, doneMsg]);
        speakMessage('¡Trámite completado! Su cita ha sido agendada exitosamente.');
    }, [tramitePin, speakMessage]);

    /**
     * Activate voice verification mode
     */
    const handleVoiceVerifyStart = useCallback(() => {
        setVoiceVerifyMode(true);
        const msg = {
            id: Date.now(),
            role: 'assistant',
            content: `🎤 **Verificación por Voz**\n\nPor favor diga su **nombre completo** y **número de cédula** en la misma frase.\n\nEjemplo: *"Juan Carlos Pérez García 1023456789"*`
        };
        setMessages(prev => [...prev, msg]);
        speakMessage('Por favor diga su nombre completo y número de cédula.');
        // Auto-start listening
        setTimeout(() => startListening?.(), 800);
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

                        {/* Navigation bar — show when inside any flow (card click or text-driven) */}
                        {(currentStep !== 'welcome' || selectedProcedure) && (
                            <Navigation
                                canGoBack={navHistory.length > 0}
                                onBack={handleBack}
                                onHome={handleHome}
                            />
                        )}

                        {/* Avatar */}
                        <div className="flex justify-center py-4">
                            <AssistantAvatar state={getAvatarState()} />
                        </div>

                        {/* Show procedure selector if on welcome step */}
                        {currentStep === 'welcome' && !showRegistraduriaMenu && (
                            <ProcedureSelector onSelect={handleProcedureSelect} />
                        )}

                        {/* Show full Registraduría menu when requested */}
                        {currentStep === 'welcome' && showRegistraduriaMenu && (
                            <div>
                                <button
                                    onClick={() => setShowRegistraduriaMenu(false)}
                                    className="mb-3 flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium text-accessible-base"
                                    aria-label="Volver al menú rápido"
                                >
                                    ← Volver al menú rápido
                                </button>
                                <RegistraduriaMenu onSelect={handleRegistraduriaSelect} />
                            </div>
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

                        {/* ── Microphone (centered, with bottom margin) ── */}
                        <div className="flex flex-col items-center mb-8 pt-4">
                            <MicrophoneButton
                                isListening={isListening}
                                onClick={handleMicrophoneToggle}
                                disabled={isProcessing}
                            />
                            {voiceVerifyMode && (
                                <p className="mt-3 text-sm text-amber-600 font-medium animate-pulse">
                                    🎤 Escuchando... diga su nombre y cédula
                                </p>
                            )}
                        </div>

                        {/* ── Action buttons (only when a procedure is active) ── */}
                        {selectedProcedure && (
                            <div className="flex flex-wrap justify-center gap-3 pb-4">
                                {/* Estado del trámite — always visible when procedure active */}
                                <button
                                    className="btn-secondary flex items-center gap-2"
                                    onClick={() => setShowStatusView(true)}
                                    aria-label="Consultar estado del trámite por PIN"
                                >
                                    📋 Estado
                                </button>
                                {/* Biometric face verification */}
                                {!isVerified && flowStep === 'identity' && (
                                    <button
                                        className="btn-accent flex items-center gap-2"
                                        onClick={() => { setBiometricMode('face'); setShowBiometric(true); }}
                                        aria-label="Verificar identidad con cámara"
                                    >
                                        🔐 Verificar Identidad
                                    </button>
                                )}

                                {/* Voice verification (priority method) */}
                                {!isVerified && flowStep === 'identity' && (
                                    <button
                                        className="btn-primary flex items-center gap-2"
                                        onClick={handleVoiceVerifyStart}
                                        aria-label="Verificar identidad por voz"
                                    >
                                        🎤 Verificar con Voz
                                    </button>
                                )}

                                {/* Document scan (only after identity verified) */}
                                {isVerified && flowStep !== 'done' && (
                                    <button
                                        className="btn-primary flex items-center gap-2"
                                        onClick={() => setShowCamera(true)}
                                        aria-label="Escanear documento"
                                    >
                                        📷 Escanear Documento
                                    </button>
                                )}

                                {/* Open calendar manually if in schedule step */}
                                {flowStep === 'schedule' && (
                                    <button
                                        className="btn-accent flex items-center gap-2"
                                        onClick={() => setShowCalendar(true)}
                                        aria-label="Agendar cita"
                                    >
                                        📅 Agendar Cita
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ── PIN Banner ── */}
                        {tramitePin && (
                            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex items-center gap-3">
                                <span className="text-2xl">📌</span>
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">PIN de seguimiento</p>
                                    <p className="font-mono font-bold text-amber-900 text-accessible-lg tracking-widest">{tramitePin}</p>
                                </div>
                                <button
                                    className="ml-auto text-xs text-amber-600 hover:text-amber-800 underline"
                                    onClick={() => navigator.clipboard?.writeText(tramitePin)}
                                    title="Copiar PIN"
                                >
                                    Copiar
                                </button>
                            </div>
                        )}
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

            {/* Status View modal */}
            {showStatusView && (
                <StatusView onClose={() => setShowStatusView(false)} />
            )}

            {/* Calendar modal */}
            {showCalendar && (
                <CalendarPicker
                    tramiteTipo={selectedProcedure?.name || 'Trámite'}
                    nombreCiudadano={documentData?.extracted?.nombre || documentData?.nombre || ''}
                    oficina="Registraduría Nacional — Sede Central"
                    pinTramite={tramitePin}
                    onConfirm={handleCalendarConfirm}
                    onClose={() => setShowCalendar(false)}
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
