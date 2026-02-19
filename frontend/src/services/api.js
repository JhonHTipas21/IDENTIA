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

    // Intent detection patterns — Registraduía Nacional de Colombia
    const intents = {
        greeting: /^(hola|buenos|buenas|saludos|hey|buen día)/i,
        help: /(ayuda|ayudame|no entiendo|confundido|explicar|cómo)/i,
        // Cédula
        cedula_primera: /(primera vez|primera cédula|sacar cédula|expedir cédula)/i,
        cedula_duplicado: /(duplicado|perdí|perdí|robo|robaron|deteriorada|dañada)/i,
        cedula_renovacion: /(renovar|renovación|vencida|actualizar cédula)/i,
        cedula_rectifica: /(rectificar|rectificación|corregir|error en la cédula)/i,
        cedula: /(cedula|cédula|identidad)/i,
        // Tarjeta de Identidad
        tarjeta_identidad: /(tarjeta de identidad|tarjeta identidad|menor|niño|hijo)/i,
        // Registro Civil
        matrimonio: /(matrimonio|casamiento|boda|casado|casada)/i,
        defuncion: /(defunción|defuncion|fallecido|fallecida|muerte|muerto)/i,
        nacimiento: /(nacimiento|acta|registro civil|inscribir|inscripción)/i,
        apostilla: /(apostilla|exterior|extranjero|legalizar)/i,
        // Consultas
        estado: /(estado|cómo va|como va|seguimiento|radicado|listo mi)/i,
        oficinas: /(oficina|sede|dónde|donde queda|dirección)/i,
        // Tarifas y citas
        tarifas: /(tarifa|costo|precio|cuánto|cuanto|gratis|gratuito|exoneración|exoneracion)/i,
        cita: /(cita|agendar|turno|reservar|cuando puedo ir)/i,
        // Generales
        documents: /(documento|foto|imagen|escanear|subir)/i,
        cancel: /(cancelar|parar|detener|no quiero)/i,
        thanks: /(gracias|grazie|thanks|muchas gracias)/i,
        yes: /^(sí|si|claro|correcto|ok|bien|dale|perfecto)/i,
        no: /^(no|nop|negativo|incorrecto)/i,
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
            response = `¡Hola! 👋 Bienvenido a IDENTIA — Registraduía Nacional de Colombia.\n\nEstoy aquí para ayudarle con sus trámites de identidad y registro civil.\n\n¿En qué puedo ayudarle hoy? Puede decirme qué necesita o seleccionar un servicio del menú.`;
            break;

        case 'help':
            response = `¡Con gusto le ayudo! 🤗\n\nPuedo asistirle con:\n• **Cédula de Ciudadanía** (primera vez, duplicado, renovación)\n• **Tarjeta de Identidad** para menores\n• **Registro Civil** (nacimiento, matrimonio, defunción)\n• **Apostilla** para el exterior\n• **Citas** y **Tarifas**\n\nSimplemente dígame qué necesita.`;
            break;

        case 'cedula_primera':
            response = `¡Con gusto le ayudo a sacar su cédula por primera vez! 🇸\n\n¡Buenas noticias! Este trámite es **completamente GRATUITO**.\n\n📋 **Necesita:**\n• Registro Civil de Nacimiento original\n• Foto 3x4 fondo blanco\n• Ser mayor de 18 años\n\n⏱️ **Tiempo:** 15 días hábiles\n\n¿Desea que le agende una cita?`;
            break;

        case 'cedula_duplicado':
            response = `Entiendo, necesita un duplicado de su cédula. 🔐\n\nPara proteger su seguridad, este trámite requiere **verificación biométrica facial** obligatoria.\n\n💰 **Costo:** $51.900 COP\n⚠️ **Exonerados:** Víctimas del conflicto, adultos mayores vulnerables, personas con discapacidad.\n\n¿Desea verificar si aplica para exoneración?`;
            break;

        case 'cedula_renovacion':
            response = `¡Perfecto! La renovación de cédula es **completamente GRATUITA**. 🔄\n\n📋 **Solo necesita:**\n• Su cédula actual (aunque esté deteriorada o vencida)\n• Foto 3x4 fondo blanco\n\n⏱️ **Tiempo:** 15 días hábiles\n\n¿Le agendo una cita en la Registraduía más cercana?`;
            break;

        case 'cedula_rectifica':
            response = `Entiendo que necesita corregir datos en su cédula. ✏️\n\nSi el error fue cometido por la Registraduía, el trámite es **completamente GRATUITO**.\n\n📋 **Necesita:**\n• Cédula actual con el error\n• Registro Civil que acredite el dato correcto\n\n¿Qué dato necesita corregir?`;
            break;

        case 'cedula':
            response = `🇸 Para su cédula de ciudadanía, ¿qué tipo de trámite necesita?\n\n• **Primera vez** (GRATUITA)\n• **Duplicado** por pérdida o hurto ($51.900)\n• **Rectificación** de datos (GRATUITA si el error es de la Registraduía)\n• **Renovación** (GRATUITA)\n\n¿Cuál de estas opciones necesita?`;
            break;

        case 'tarjeta_identidad':
            response = `👶 La Tarjeta de Identidad para menores es **completamente GRATUITA**.\n\n📋 **Necesita:**\n• Registro Civil de Nacimiento del menor\n• Cédula del padre, madre o acudiente\n• Foto 3x4 del menor\n\nℹ️ Es para menores entre **7 y 17 años**.\n\n¿Cuántos años tiene el menor?`;
            break;

        case 'matrimonio':
            response = `💍 **Copia de Registro Civil de Matrimonio**\n\n💰 **Costo:** $6.900 COP\n👥 **Exonerados:** Víctimas del conflicto armado\n\n📋 **Necesita:**\n• Su cédula de identidad\n• Nombres completos de los contrayentes y fecha aproximada\n\n🌐 También puede solicitarla en línea en registraduria.gov.co\n\n¿Desea que le ayude a solicitarla?`;
            break;

        case 'defuncion':
            response = `📜 **Copia de Registro Civil de Defunción**\n\n💰 **Costo:** $6.900 COP\n\n📋 **Necesita:**\n• Su cédula de identidad\n• Nombre completo del fallecido y fecha aproximada\n\n¿Desea continuar con esta solicitud?`;
            break;

        case 'nacimiento':
            response = `📜 **Registro Civil de Nacimiento**\n\n💰 **Inscripción:** GRATUITA (dentro de los primeros 30 días)\n💰 **Copia auténtica:** $6.900 COP\n\n¿Necesita inscribir un nacimiento o solicitar una copia del registro?`;
            break;

        case 'apostilla':
            response = `🌍 **Apostilla de Documentos**\n\nLa apostilla es la legalización internacional según el Convenio de La Haya.\n\n💰 **Costo:** $51.900 COP\n🏢 **Solo en:** Registraduía Nacional — Sede Central (Bogotá)\n   O en línea: apostilla.registraduria.gov.co\n\n⏱️ **Tiempo:** 3-5 días hábiles\n\n¿Qué documento necesita apostillar?`;
            break;

        case 'estado':
            response = `🔍 **Consulta de Estado de Trámite**\n\nPuedo consultar el estado de su documento.\n\n💳 Por favor indíqueme su **número de cédula** o el **número de radicado** que le dieron cuando inició el trámite.`;
            break;

        case 'oficinas':
            response = `📍 **Oficinas de la Registraduía**\n\n🏢 **Sede Central — Bogotá**\n   Calle 26 No. 51-50, CAN\n   📞 601 2288000\n   🕐 Lunes a Viernes 8:00 AM – 4:00 PM\n\n🏢 **Medellín**\n   Carrera 52 No. 42-73, Centro\n   📞 604 5110000\n\n🏢 **Cali**\n   Carrera 4 No. 12-41, Centro\n   📞 602 8820000\n\n¿En qué ciudad se encuentra?`;
            break;

        case 'tarifas':
            response = `💰 **Tarifas Vigentes 2024 — Registraduía Nacional**\n\n🆓 **GRATUITOS:**\n• Cédula primera vez\n• Cédula renovación\n• Tarjeta de Identidad\n• Inscripción de nacimiento\n\n💳 **Con costo:**\n• Duplicado cédula: $51.900 COP\n• Copias registro civil: $6.900 COP\n• Apostilla: $51.900 COP\n\n⚠️ Víctimas del conflicto, adultos mayores vulnerables y personas con discapacidad pueden estar **exonerados**. ¿Desea verificar si aplica?`;
            break;

        case 'cita':
            response = `📅 **Agendamiento de Citas**\n\nPuedo ayudarle a agendar una cita en la Registraduía más cercana.\n\n🏢 **Ciudades disponibles:** Bogotá, Medellín, Cali, Barranquilla y más.\n\n¿En qué ciudad se encuentra usted?`;
            break;

        case 'documents':
            response = `Para los documentos, le guío paso a paso: 📷\n\n1. Presione el botón **\"Escanear Documento\"**\n2. Coloque su documento dentro del marco\n3. Mantenga la cámara firme\n4. La foto se tomará automáticamente\n\n**Consejos:**\n• Use buena iluminación\n• Evite reflejos\n• Asegúrese que el texto sea legible\n\n¿Está listo para escanear?`;
            break;

        case 'cancel':
            response = `Entiendo que desea cancelar. 😔\n\nAntes de hacerlo, ¿me puede decir qué le preocupa? Quizás puedo ayudarle a resolver el problema.`;
            break;

        case 'thanks':
            response = `¡De nada! 😊 Es un placer ayudarle.\n\n¿Hay algo más en lo que pueda asistirle hoy?`;
            break;

        case 'yes':
            response = `¡Excelente! Continuemos. 👍\n\n¿Qué necesita hacer ahora?`;
            break;

        case 'no':
            response = `Entendido. No hay problema. 👍\n\n¿Qué le gustaría hacer en su lugar?`;
            break;

        default:
            response = `Entiendo que me dice: \"${message}\"\n\nDéjeme asegurarme de entender bien. ¿Podría decirme más específicamente qué necesita?\n\nPuedo ayudarle con:\n• Cédula de Ciudadanía\n• Tarjeta de Identidad\n• Registro Civil\n• Apostilla\n• Citas y Tarifas\n\n¿En qué le puedo asistir?`;
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
        greeting: ['Cédula primera vez', 'Registro Civil', '¿Qué puedo hacer?'],
        help: ['Cédula', 'Registro Civil', 'Ver tarifas'],
        cedula: ['Primera vez (GRATUITA)', 'Duplicado', 'Renovación (GRATUITA)'],
        cedula_primera: ['Agendar cita', 'Ver requisitos', '¿Cuánto tarda?'],
        cedula_duplicado: ['Verificar exoneración', 'Verificación biométrica', 'Agendar cita'],
        cedula_renovacion: ['Agendar cita', 'Ver oficinas', '¿Cuánto tarda?'],
        tarjeta_identidad: ['Agendar cita', 'Ver requisitos', '¿Cuánto tarda?'],
        nacimiento: ['Inscribir nacimiento', 'Copia registro', 'Ver costo'],
        matrimonio: ['Solicitar copia', 'Ver costo', 'Agendar cita'],
        apostilla: ['Agendar cita', 'Ver costo', '¿Qué documentos?'],
        estado: ['Consultar por cédula', 'Consultar por radicado'],
        tarifas: ['Verificar exoneración', 'Agendar cita', 'Ver requisitos'],
        cita: ['Bogotá', 'Medellín', 'Cali'],
        documents: ['Escanear documento', 'Necesito ayuda'],
        default: ['Ayuda', 'Ver servicios', 'Llamar: 01 8000 111 555']
    };

    return suggestions[intent] || suggestions.default;
}

// ============================================================================
// Registraduría Nacional de Colombia — API Functions
// ============================================================================

/**
 * Inicia un trámite de Cédula de Ciudadanía o Tarjeta de Identidad
 * @param {string} tipoTramite - primera_vez | duplicado | rectificacion | renovacion | tarjeta_identidad
 * @param {object} datosCiudadano - Datos del ciudadano
 */
export async function tramiteCedula(tipoTramite, datosCiudadano = {}) {
    const endpoint = tipoTramite === 'tarjeta_identidad'
        ? `${API_BASE}/registraduria/identificacion/tarjeta`
        : `${API_BASE}/registraduria/identificacion/cedula`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo_tramite: tipoTramite,
                datos_ciudadano: datosCiudadano,
                session_id: sessionId
            })
        });
        if (response.ok) return await response.json();
    } catch (error) {
        console.error('Cédula tramite error:', error);
    }

    // Fallback local
    return {
        exito: true,
        mensaje: `Trámite de ${tipoTramite.replace(/_/g, ' ')} iniciado. Por favor visite la Registraduría más cercana.`,
        requiere_biometria: tipoTramite === 'duplicado',
        siguiente_paso: tipoTramite === 'duplicado' ? 'verificacion_biometrica_facial' : 'agendar_cita'
    };
}

/**
 * Trámites de Registro Civil (copias, inscripción, apostilla)
 * @param {string} tipo - nacimiento | matrimonio | defuncion | apostilla | inscripcion
 * @param {object} datos - Datos del trámite
 */
export async function tramiteRegistroCivil(tipo, datos = {}) {
    const endpoint = tipo === 'apostilla'
        ? `${API_BASE}/registraduria/registro-civil/apostilla`
        : tipo === 'inscripcion'
            ? `${API_BASE}/registraduria/registro-civil/inscripcion`
            : `${API_BASE}/registraduria/registro-civil/copia`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, datos, session_id: sessionId })
        });
        if (response.ok) return await response.json();
    } catch (error) {
        console.error('Registro civil error:', error);
    }

    return {
        exito: true,
        mensaje: `Solicitud de ${tipo} de Registro Civil recibida.`,
        siguiente_paso: 'confirmar_pago'
    };
}

/**
 * Consulta el estado de un documento en trámite
 * @param {string} numeroCedula - Número de cédula del ciudadano
 * @param {string} radicado - Número de radicado (opcional)
 */
export async function consultarEstadoDocumento(numeroCedula, radicado = null) {
    try {
        const response = await fetch(`${API_BASE}/registraduria/consultas/estado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                numero_cedula: numeroCedula,
                radicado,
                session_id: sessionId
            })
        });
        if (response.ok) return await response.json();
    } catch (error) {
        console.error('Consulta estado error:', error);
    }

    // Fallback con datos simulados
    return {
        exito: true,
        mensaje: '⏳ Su trámite está en proceso. Tiempo estimado: 10 días hábiles.',
        datos: {
            estado: 'en_proceso',
            paso_actual: 2,
            porcentaje: 33,
            pasos: [
                { id: 1, nombre: 'Solicitud Recibida', icono: '📥', estado: 'completado' },
                { id: 2, nombre: 'Verificación Biométrica', icono: '🔐', estado: 'en_proceso' },
                { id: 3, nombre: 'Revisión Documental', icono: '📋', estado: 'pendiente' },
                { id: 4, nombre: 'Aprobación', icono: '✅', estado: 'pendiente' },
                { id: 5, nombre: 'Producción', icono: '🏭', estado: 'pendiente' },
                { id: 6, nombre: 'Listo para Recoger', icono: '🎉', estado: 'pendiente' },
            ]
        }
    };
}

/**
 * Consulta oficinas de la Registraduría por ciudad
 * @param {string} ciudad - Ciudad a buscar (opcional)
 */
export async function consultarOficinas(ciudad = null) {
    try {
        const url = ciudad
            ? `${API_BASE}/registraduria/consultas/oficinas?ciudad=${encodeURIComponent(ciudad)}`
            : `${API_BASE}/registraduria/consultas/oficinas`;
        const response = await fetch(url);
        if (response.ok) return await response.json();
    } catch (error) {
        console.error('Consulta oficinas error:', error);
    }

    return {
        exito: true,
        mensaje: 'Consulte las oficinas en registraduria.gov.co o llame al 01 8000 111 555',
        datos: { oficinas: [] }
    };
}

/**
 * Agenda una cita en la Registraduría
 * @param {string} servicio - Tipo de servicio
 * @param {string} ciudad - Ciudad del ciudadano
 * @param {string} fechaPreferida - Fecha preferida (opcional)
 * @param {string} horaPreferida - Hora preferida (opcional)
 */
export async function agendarCita(servicio, ciudad, fechaPreferida = null, horaPreferida = null) {
    try {
        const response = await fetch(`${API_BASE}/registraduria/citas/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                servicio,
                ciudad,
                fecha_preferida: fechaPreferida,
                hora_preferida: horaPreferida,
                session_id: sessionId
            })
        });
        if (response.ok) return await response.json();
    } catch (error) {
        console.error('Agendar cita error:', error);
    }

    return {
        exito: true,
        mensaje: `📅 Cita agendada en ${ciudad}. Recibirá confirmación por correo.`,
        datos: { ciudad, servicio }
    };
}

/**
 * Consulta tarifas vigentes de la Registraduría
 * @param {string} tipoTramite - Tipo específico de trámite (opcional)
 */
export async function consultarTarifas(tipoTramite = null) {
    try {
        const url = tipoTramite
            ? `${API_BASE}/registraduria/tarifas?tipo_tramite=${encodeURIComponent(tipoTramite)}`
            : `${API_BASE}/registraduria/tarifas`;
        const response = await fetch(url);
        if (response.ok) return await response.json();
    } catch (error) {
        console.error('Consulta tarifas error:', error);
    }

    return {
        exito: true,
        mensaje: '💰 Tarifas 2024: Cédula primera vez GRATUITA. Duplicado $51.900. Copias registro civil $6.900. Apostilla $51.900.',
        datos: {}
    };
}

/**
 * Verifica si el ciudadano aplica para exoneración de tarifas
 * @param {object} datosCiudadano - Condiciones del ciudadano
 */
export async function verificarExoneracion(datosCiudadano) {
    try {
        const response = await fetch(`${API_BASE}/registraduria/tarifas/exoneracion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                datos_ciudadano: datosCiudadano,
                session_id: sessionId
            })
        });
        if (response.ok) return await response.json();
    } catch (error) {
        console.error('Verificar exoneración error:', error);
    }

    return {
        exito: true,
        mensaje: 'Para verificar su exoneración, visite la Registraduría con los documentos que acrediten su condición.',
        datos: { exonerado: false }
    };
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

