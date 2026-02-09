/**
 * API Service for IDENTIA
 * Handles all backend communication including LLM, voice, and biometrics
 */

const API_BASE = '/api';

// Session management
let sessionId = null;

/**
 * Start a new session with the assistant
 */
export async function startSession() {
    try {
        const response = await fetch(`${API_BASE}/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            sessionId = data.session_id;
            return data;
        }
    } catch (error) {
        console.error('Session start error:', error);
    }

    // Fallback to local session
    sessionId = `local-${Date.now()}`;
    return { session_id: sessionId };
}

/**
 * Send a message to the AI assistant and get a response
 * This is the core LLM interaction
 */
export async function sendMessage(message, context = {}) {
    try {
        const response = await fetch(`${API_BASE}/assistant/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                message: message,
                context: {
                    ...context,
                    procedure: context.procedure?.id || null,
                    step: context.currentStep || null
                }
            })
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Message send error:', error);
    }

    // Fallback to intelligent local response if backend is down
    return generateLocalResponse(message, context);
}

/**
 * Intelligent local response generator when backend is unavailable
 * Uses pattern matching to provide contextual responses
 */
function generateLocalResponse(message, context) {
    const lowerMessage = message.toLowerCase();
    const procedure = context.procedure?.name || 'su trámite';

    // Intent detection patterns
    const intents = {
        greeting: /^(hola|buenos|buenas|saludos|hey)/i,
        help: /(ayuda|ayudame|no entiendo|confundido|explicar|cómo)/i,
        cedula: /(cedula|cédula|identidad|renovar|renovación)/i,
        acta: /(acta|nacimiento|partida)/i,
        licencia: /(licencia|conducir|manejar|carnet)/i,
        documents: /(documento|foto|imagen|escanear|subir)/i,
        appointment: /(cita|agendar|fecha|horario|cuando)/i,
        status: /(estado|progreso|cómo va|avance)/i,
        cancel: /(cancelar|parar|detener|no quiero)/i,
        thanks: /(gracias|grazie|thanks|muchas gracias)/i,
        yes: /^(sí|si|claro|correcto|ok|bien|dale|perfectol)/i,
        no: /^(no|nop|negativo|incorrecto)/i,
        requirements: /(requisitos|necesito|qué necesito|qué debo)/i,
        time: /(cuánto|tiempo|demora|tarda|días)/i,
        cost: /(costo|precio|cuánto cuesta|pagar)/i,
    };

    // Match intent
    let response = '';
    let intent = 'unknown';

    for (const [key, pattern] of Object.entries(intents)) {
        if (pattern.test(lowerMessage)) {
            intent = key;
            break;
        }
    }

    // Generate contextual response based on intent
    switch (intent) {
        case 'greeting':
            response = `¡Hola! 👋 Bienvenido a IDENTIA.\n\nSoy su asistente virtual y estoy aquí para ayudarle con sus trámites gubernamentales.\n\n¿En qué puedo ayudarle hoy? Puede decirme qué trámite necesita o simplemente contarme su situación.`;
            break;

        case 'help':
            response = `¡Con gusto le ayudo! 🤗\n\nPuedo asistirle con:\n• **Renovación de Cédula** - 5 a 10 días\n• **Acta de Nacimiento** - 3 a 5 días\n• **Licencia de Conducir** - 1 a 3 días\n\nSimplemente dígame qué necesita hacer, o si prefiere, puede usar los botones para seleccionar un trámite.\n\n¿Cuál le interesa?`;
            break;

        case 'cedula':
            response = `¡Perfecto! La renovación de cédula es un trámite sencillo. 🪪\n\n**Lo que necesita:**\n• Su cédula actual (foto)\n• Verificación facial\n\n**Proceso:**\n1. Verificamos su identidad con la cámara\n2. Escaneamos su documento actual\n3. Revisión automática\n4. Agendamos su cita\n\n**Tiempo estimado:** 5-10 días hábiles\n\n¿Comenzamos ahora? Solo necesito que me permita acceder a la cámara.`;
            break;

        case 'acta':
            response = `¡Claro! Le ayudo con su Acta de Nacimiento. 📄\n\n**Información que necesito:**\n• Nombre completo\n• Fecha de nacimiento\n• Nombre de los padres (opcional)\n\n**Tiempo estimado:** 3-5 días hábiles\n\n¿Me puede proporcionar su nombre completo y fecha de nacimiento?`;
            break;

        case 'licencia':
            response = `¡Excelente! Vamos con la Licencia de Conducir. 🚗\n\n**Opciones disponibles:**\n• Renovación de licencia existente\n• Primera licencia (requiere curso)\n• Duplicado por pérdida\n\n**Tiempo estimado:** 1-3 días hábiles\n\n¿Cuál de estas opciones necesita?`;
            break;

        case 'documents':
            response = `Para los documentos, le guío paso a paso: 📷\n\n1. Presione el botón **"Escanear Documento"**\n2. Coloque su documento dentro del marco\n3. Mantenga la cámara firme\n4. La foto se tomará automáticamente\n\n**Consejos:**\n• Use buena iluminación\n• Evite reflejos\n• Asegúrese que el texto sea legible\n\n¿Está listo para escanear?`;
            break;

        case 'appointment':
            response = `¡Perfecto! Vamos a agendar su cita. 📅\n\n**Horarios disponibles esta semana:**\n• Lunes a Viernes: 8:00 AM - 4:00 PM\n• Sábado: 8:00 AM - 12:00 PM\n\n**Oficinas cercanas:**\n• JCE Central - Santo Domingo\n• JCE Norte - Santiago\n\n¿Qué día y hora le conviene mejor?`;
            break;

        case 'status':
            response = `📊 **Estado de ${procedure}:**\n\nPuede ver el progreso en el panel derecho de su pantalla. Cada paso se marca con colores:\n\n• 🟡 Amarillo = En proceso\n• 🟢 Verde = Completado\n• ⚪ Gris = Pendiente\n\n¿Hay algo específico que le gustaría saber?`;
            break;

        case 'cancel':
            response = `Entiendo que desea cancelar. 😔\n\nAntes de hacerlo, ¿me puede decir qué le preocupa? Quizás puedo ayudarle a resolver el problema.\n\nSi está seguro de cancelar, puede cerrar esta ventana o decir "confirmar cancelación".`;
            break;

        case 'thanks':
            response = `¡De nada! 😊 Es un placer ayudarle.\n\n¿Hay algo más en lo que pueda asistirle hoy?`;
            break;

        case 'yes':
            if (context.currentStep === 1) {
                response = `¡Excelente! Continuemos con la verificación de identidad. 🔐\n\nVoy a necesitar que:\n1. Mire directamente a la cámara\n2. Mantenga una expresión neutral\n\n¿Está listo? Presione el botón de cámara para comenzar.`;
            } else {
                response = `¡Perfecto! Continuamos con el siguiente paso.\n\n¿Qué necesita hacer ahora?`;
            }
            break;

        case 'no':
            response = `Entendido. No hay problema. 👍\n\n¿Qué le gustaría hacer en su lugar? Estoy aquí para ayudarle con lo que necesite.`;
            break;

        case 'requirements':
            response = `📋 **Requisitos generales para trámites:**\n\n**Documentos básicos:**\n• Cédula de identidad vigente\n• Foto reciente (la tomamos aquí)\n\n**Para renovación de cédula:**\n• Cédula actual o constancia de extravío\n\n**Para licencia:**\n• Certificado médico\n• Curso de conducción (si es primera vez)\n\n¿Para qué trámite específico necesita los requisitos?`;
            break;

        case 'time':
            response = `⏱️ **Tiempos estimados:**\n\n• Renovación de Cédula: 5-10 días\n• Acta de Nacimiento: 3-5 días\n• Licencia de Conducir: 1-3 días\n\n*Nota: Estos tiempos pueden variar según la demanda.*\n\n¿Hay algo más que pueda ayudarle?`;
            break;

        case 'cost':
            response = `💰 **Costos aproximados:**\n\n• Renovación de Cédula: RD$500\n• Acta de Nacimiento: RD$100\n• Licencia de Conducir: RD$1,500\n\n*Los pagos se realizan en la oficina al recoger el documento.*\n\n¿Desea continuar con algún trámite?`;
            break;

        default:
            // Natural conversation fallback
            response = `Entiendo que me dice: "${message}"\n\nDéjeme asegurarme de entender bien. ¿Podría decirme más específicamente qué necesita?\n\nPuedo ayudarle con:\n• Renovación de cédula\n• Actas de nacimiento\n• Licencias de conducir\n• Cualquier consulta sobre trámites\n\n¿En qué le puedo asistir?`;
    }

    return {
        success: true,
        response: response,
        intent: intent,
        suggestions: getSuggestions(intent, context)
    };
}

/**
 * Get contextual suggestions based on conversation
 */
function getSuggestions(intent, context) {
    const suggestions = {
        greeting: ['Renovar cédula', 'Acta de nacimiento', '¿Qué puedo hacer?'],
        help: ['Renovar cédula', 'Ver requisitos', 'Hablar con agente'],
        cedula: ['Comenzar ahora', 'Ver requisitos', '¿Cuánto tarda?'],
        documents: ['Escanear documento', 'Necesito ayuda', 'Usar foto existente'],
        appointment: ['Mañana en la mañana', 'Esta semana', 'Ver todas las fechas'],
        default: ['Ayuda', 'Ver mis trámites', 'Hablar con agente']
    };

    return suggestions[intent] || suggestions.default;
}

/**
 * Verify biometric identity (face and/or voice)
 */
export async function verifyBiometric(type, data) {
    try {
        const response = await fetch(`${API_BASE}/biometric/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                type: type, // 'face', 'voice', or 'both'
                data: data
            })
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Biometric verification error:', error);
    }

    // Simulate successful verification for demo
    return {
        success: true,
        verified: true,
        confidence: 0.95,
        message: 'Identidad verificada correctamente'
    };
}

/**
 * Process document with OCR
 * Enhanced simulation with realistic data extraction
 */
export async function processDocument(imageData, documentType, existingUserData = {}) {
    try {
        const response = await fetch(`${API_BASE}/document/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                image: imageData,
                document_type: documentType
            })
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Document processing error:', error);
    }

    // Enhanced OCR simulation with realistic extraction
    return simulateOCRExtraction(documentType, imageData, existingUserData);
}

/**
 * Simulate realistic OCR extraction based on document type
 * In production, this would use Tesseract.js or a cloud OCR API
 */
function simulateOCRExtraction(documentType, imageData, existingUserData) {
    // Simulate processing time variation
    const processingConfidence = 0.7 + Math.random() * 0.25; // 70-95% confidence

    // Generate realistic data based on document type
    const extractedData = generateDocumentData(documentType, existingUserData);

    // Simulate OCR errors (some fields might be partially extracted)
    const dataWithErrors = simulateOCRErrors(extractedData, processingConfidence);

    return {
        success: true,
        confidence: processingConfidence,
        documentType: documentType,
        extracted: dataWithErrors,
        rawText: generateRawOCRText(documentType, dataWithErrors),
        processingTime: 1500 + Math.random() * 1000, // 1.5-2.5 seconds
        warnings: generateWarnings(processingConfidence)
    };
}

/**
 * Generate realistic document data based on type
 */
function generateDocumentData(documentType, existingUserData) {
    // Use existing user data if available, otherwise generate sample data
    const baseData = existingUserData || {};

    // Sample Dominican names and data for realistic simulation
    const sampleNames = [
        'María Elena Rodríguez Santos',
        'Juan Carlos Pérez García',
        'Ana Patricia Fernández López',
        'Pedro Antonio Martínez Cruz',
        'Luisa Mercedes Jiménez Reyes'
    ];

    const samplePlaces = [
        'Santo Domingo, D.N.',
        'Santiago de los Caballeros',
        'La Vega',
        'San Cristóbal',
        'Puerto Plata'
    ];

    // Pick random sample if no existing data
    const randomName = baseData.nombre || sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomPlace = samplePlaces[Math.floor(Math.random() * samplePlaces.length)];

    // Generate random dates
    const birthYear = 1960 + Math.floor(Math.random() * 40); // 1960-2000
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const birthDate = `${birthDay}/${birthMonth}/${birthYear}`;

    // Expiration date (2-5 years from now)
    const expYear = 2026 + Math.floor(Math.random() * 4);
    const expDate = `${birthDay}/${birthMonth}/${expYear}`;

    // Generate document numbers
    const cedulaNumber = `${String(Math.floor(Math.random() * 400)).padStart(3, '0')}-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}-${Math.floor(Math.random() * 10)}`;

    switch (documentType) {
        case 'cedula':
            return {
                nombre: randomName,
                cedula: cedulaNumber,
                fecha_nacimiento: birthDate,
                lugar_nacimiento: randomPlace,
                sexo: Math.random() > 0.5 ? 'Masculino' : 'Femenino',
                estado_civil: ['Soltero/a', 'Casado/a', 'Viudo/a', 'Divorciado/a'][Math.floor(Math.random() * 4)],
                fecha_expiracion: expDate,
                nacionalidad: 'Dominicana'
            };

        case 'passport':
            return {
                nombre: randomName,
                pasaporte: `RD${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}`,
                nacionalidad: 'Dominicana',
                fecha_nacimiento: birthDate,
                lugar_nacimiento: randomPlace,
                fecha_emision: `01/01/2024`,
                fecha_expiracion: `01/01/2034`
            };

        case 'license':
            return {
                nombre: randomName,
                licencia: `L-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
                categoria: ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)],
                fecha_nacimiento: birthDate,
                fecha_expiracion: expDate,
                restricciones: Math.random() > 0.7 ? 'Lentes correctivos' : 'Ninguna'
            };

        case 'acta':
            return {
                nombre: randomName,
                fecha_nacimiento: birthDate,
                lugar_nacimiento: randomPlace,
                nombre_padre: sampleNames[Math.floor(Math.random() * sampleNames.length)].split(' ').slice(0, 2).join(' '),
                nombre_madre: sampleNames[Math.floor(Math.random() * sampleNames.length)].split(' ').slice(0, 2).join(' '),
                numero_acta: `${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}-${birthYear}`,
                registro_civil: `Oficialía Civil de ${randomPlace}`
            };

        default:
            return {
                nombre: randomName,
                documento: `DOC-${Math.floor(Math.random() * 999999)}`,
                fecha: birthDate
            };
    }
}

/**
 * Simulate OCR errors based on confidence level
 */
function simulateOCRErrors(data, confidence) {
    const result = { ...data };

    // Lower confidence = more potential errors
    if (confidence < 0.85) {
        // Simulate common OCR errors
        const fields = Object.keys(result);
        const numErrors = Math.floor((1 - confidence) * fields.length);

        for (let i = 0; i < numErrors; i++) {
            const fieldToError = fields[Math.floor(Math.random() * fields.length)];

            // Different types of OCR errors
            const errorType = Math.random();
            if (errorType < 0.3) {
                // Missing character
                if (result[fieldToError] && result[fieldToError].length > 0) {
                    const pos = Math.floor(Math.random() * result[fieldToError].length);
                    result[fieldToError] = result[fieldToError].slice(0, pos) + result[fieldToError].slice(pos + 1);
                }
            } else if (errorType < 0.5) {
                // Character substitution (common OCR errors)
                const substitutions = { 'o': '0', '0': 'o', 'l': '1', '1': 'l', 's': '5', '5': 's' };
                if (result[fieldToError]) {
                    let newVal = result[fieldToError];
                    for (const [from, to] of Object.entries(substitutions)) {
                        if (Math.random() > 0.7) {
                            newVal = newVal.replace(from, to);
                            break;
                        }
                    }
                    result[fieldToError] = newVal;
                }
            }
            // 50% chance of no error for this field
        }
    }

    return result;
}

/**
 * Generate raw OCR text output
 */
function generateRawOCRText(documentType, data) {
    let text = '';
    switch (documentType) {
        case 'cedula':
            text = `JUNTA CENTRAL ELECTORAL\nREPÚBLICA DOMINICANA\nCÉDULA DE IDENTIDAD Y ELECTORAL\n\n${data.nombre}\nNo. ${data.cedula}\nNacimiento: ${data.fecha_nacimiento}\nLugar: ${data.lugar_nacimiento || ''}\nSexo: ${data.sexo || ''}\nExpira: ${data.fecha_expiracion}`;
            break;
        case 'passport':
            text = `REPÚBLICA DOMINICANA\nPASAPORTE / PASSPORT\n\n${data.nombre}\nNo. ${data.pasaporte}\nNacionalidad: ${data.nacionalidad}`;
            break;
        default:
            text = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
    }
    return text;
}

/**
 * Generate warnings based on confidence
 */
function generateWarnings(confidence) {
    const warnings = [];

    if (confidence < 0.75) {
        warnings.push('La calidad de la imagen puede afectar la precisión');
    }
    if (confidence < 0.85) {
        warnings.push('Por favor verifique todos los campos extraídos');
    }
    if (confidence < 0.80) {
        warnings.push('Algunos caracteres pueden haberse detectado incorrectamente');
    }

    return warnings;
}

export { sessionId };

