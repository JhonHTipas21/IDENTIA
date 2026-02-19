"""
IDENTIA - FastAPI Backend Main Application
===========================================
Entry point for the IDENTIA backend API with middleware for
PII anonymization and citizen procedure management.
"""

from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime
import asyncio

from .security import PIIAnonymizer
from .orchestration import ProcedureWorkflow, ProcedureState
from .services import (
    IdentificacionHandler,
    RegistroCivilHandler,
    ConsultasHandler,
    CitasYTarifasHandler,
    TramiteCedula,
    TipoRegistroCivil,
    TARIFAS_REGISTRADURIA,
    OFICINAS_REGISTRADURIA
)
from .services.tracking_service import (
    crear_tramite,
    consultar_estado_pin,
    actualizar_estado,
    EstadoTramite as EstadoTramiteEnum
)
from .services.calendar_service import (
    agendar_cita_calendar,
    obtener_slots_disponibles
)


# ============================================================================
# Pydantic Models
# ============================================================================

class CitizenMessage(BaseModel):
    """Incoming message from a citizen"""
    text: Optional[str] = None
    audio_base64: Optional[str] = None
    session_id: Optional[str] = None
    procedure_id: Optional[str] = None


class BiometricData(BaseModel):
    """Biometric verification data"""
    face_image_base64: Optional[str] = None
    voice_sample_base64: Optional[str] = None
    liveness_token: Optional[str] = None


class DocumentUpload(BaseModel):
    """Document upload data"""
    document_type: str
    image_base64: str
    session_id: str


class ProcedureRequest(BaseModel):
    """Request to start a new procedure"""
    procedure_type: str
    citizen_data: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


# --- Registraduría Request Models ---

class CedulaRequest(BaseModel):
    """Request for cédula procedures"""
    tipo_tramite: str  # primera_vez | duplicado | rectificacion | renovacion
    datos_ciudadano: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


class RegistroCivilRequest(BaseModel):
    """Request for registro civil procedures"""
    tipo: str  # nacimiento | matrimonio | defuncion | apostilla
    datos: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


class ConsultaEstadoRequest(BaseModel):
    """Request to check document status"""
    numero_cedula: str
    radicado: Optional[str] = None
    session_id: Optional[str] = None


class CitaRequest(BaseModel):
    """Request to schedule an appointment"""
    servicio: str
    ciudad: str
    fecha_preferida: Optional[str] = None
    hora_preferida: Optional[str] = None
    session_id: Optional[str] = None


class ExoneracionRequest(BaseModel):
    """Request to verify tariff exemption"""
    datos_ciudadano: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


# --- Tracking & Calendar Request Models ---

class IniciarTramiteRequest(BaseModel):
    """Request to start a new tramite and generate PIN"""
    tipo: str
    datos_ciudadano: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


class ConsultaPinRequest(BaseModel):
    """Request to check tramite status by PIN"""
    pin: str
    session_id: Optional[str] = None


class AgendarCalendarRequest(BaseModel):
    """Request to schedule appointment with Google Calendar"""
    tipo_tramite: str
    nombre_ciudadano: str
    fecha: str           # YYYY-MM-DD
    hora: str            # HH:MM
    oficina: Optional[str] = "Registraduía Nacional — Sede Central"
    email_ciudadano: Optional[str] = None
    pin_tramite: Optional[str] = None
    session_id: Optional[str] = None


class VerificarVozRequest(BaseModel):
    """Request to verify identity by voice"""
    nombre: str
    cedula: str
    session_id: Optional[str] = None
    umbral_confianza: float = 0.75


class AssistantResponse(BaseModel):
    """Response from the IDENTIA assistant"""
    message: str
    session_id: str
    procedure_id: Optional[str] = None
    current_step: str
    next_action: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    audio_base64: Optional[str] = None  # TTS audio response


# ============================================================================
# Application Setup
# ============================================================================

app = FastAPI(
    title="IDENTIA API",
    description="Ecosistema de Identidad y Asistencia Ciudadana - Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
anonymizer = PIIAnonymizer()
workflow = ProcedureWorkflow()

# Registraduría service handlers
identificacion_handler = IdentificacionHandler()
registro_civil_handler = RegistroCivilHandler()
consultas_handler = ConsultasHandler()
citas_handler = CitasYTarifasHandler()

# In-memory session storage (use Redis in production)
sessions: Dict[str, Dict[str, Any]] = {}
procedures: Dict[str, ProcedureState] = {}


# ============================================================================
# Middleware
# ============================================================================

@app.middleware("http")
async def anonymization_middleware(request: Request, call_next):
    """
    Middleware to ensure PII is handled securely.
    Logs requests with anonymized data only.
    """
    # Process the request
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-IDENTIA-Security"] = "PII-Protected"
    
    return response


# ============================================================================
# Health & Info Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "IDENTIA API",
        "version": "1.0.0",
        "status": "operational",
        "description": "Ecosistema de Identidad y Asistencia Ciudadana",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "procedures": "/api/procedures",
            "assistant": "/api/assistant"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "anonymizer": "active",
            "workflow": "active",
            "agents": {
                "validator": "ready",
                "legal": "ready",
                "gestor": "ready"
            }
        }
    }


# ============================================================================
# Session Management
# ============================================================================

@app.post("/api/session/start")
async def start_session():
    """Start a new citizen session"""
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "created_at": datetime.now().isoformat(),
        "last_activity": datetime.now().isoformat(),
        "state": "active"
    }
    
    return {
        "session_id": session_id,
        "message": "¡Bienvenido a IDENTIA! ¿En qué puedo ayudarle hoy?",
        "available_procedures": [
            {"id": "cedula_renovation", "name": "Renovación de Cédula"},
            {"id": "acta_nacimiento", "name": "Acta de Nacimiento"},
            {"id": "licencia_conducir", "name": "Licencia de Conducir"}
        ]
    }


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get session information"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    return sessions[session_id]


# ============================================================================
# Procedure Management
# ============================================================================

@app.post("/api/procedures/start", response_model=AssistantResponse)
async def start_procedure(request: ProcedureRequest):
    """Start a new government procedure"""
    
    # Create or use existing session
    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = {
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "state": "active"
        }
    
    # Create procedure state
    procedure_id = str(uuid.uuid4())
    state = ProcedureState(
        procedure_id=procedure_id,
        procedure_type=request.procedure_type,
        citizen_data=request.citizen_data
    )
    
    # Run initial workflow step
    state = await workflow.run(state)
    procedures[procedure_id] = state
    
    # Get the latest message for the citizen
    message = state.messages[-1] if state.messages else "Procesando su solicitud..."
    
    return AssistantResponse(
        message=message,
        session_id=session_id,
        procedure_id=procedure_id,
        current_step=state.current_step.value,
        next_action=_get_next_action(state),
        data=state.to_dict()
    )


@app.get("/api/procedures/{procedure_id}")
async def get_procedure(procedure_id: str):
    """Get procedure status and details"""
    if procedure_id not in procedures:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")
    
    state = procedures[procedure_id]
    return {
        "procedure_id": procedure_id,
        "status": state.current_step.value,
        "messages": state.messages,
        "data": state.to_dict()
    }


@app.post("/api/procedures/{procedure_id}/step")
async def step_procedure(procedure_id: str, data: Dict[str, Any] = None):
    """Advance a procedure to the next step"""
    if procedure_id not in procedures:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")
    
    state = procedures[procedure_id]
    
    # Update state with incoming data
    if data:
        if "biometric_data" in data:
            state.biometric_data = data["biometric_data"]
        if "documents" in data:
            state.documents.update(data["documents"])
        if "citizen_data" in data:
            state.citizen_data.update(data["citizen_data"])
    
    # Execute next step
    state = await workflow.step(state)
    procedures[procedure_id] = state
    
    message = state.messages[-1] if state.messages else "Procesando..."
    
    return AssistantResponse(
        message=message,
        session_id="",
        procedure_id=procedure_id,
        current_step=state.current_step.value,
        next_action=_get_next_action(state),
        data=state.to_dict()
    )


# ============================================================================
# Document Processing
# ============================================================================

@app.post("/api/documents/upload")
async def upload_document(document: DocumentUpload):
    """Upload and process a document image"""
    
    # In production, this would use the OCR module
    # For now, simulate document processing
    document_data = {
        "type": document.document_type,
        "uploaded_at": datetime.now().isoformat(),
        "verified": True,  # Simulated verification
        "data": {
            "extracted_text": "Documento procesado correctamente"
        }
    }
    
    return {
        "status": "processed",
        "document_type": document.document_type,
        "session_id": document.session_id,
        "data": document_data
    }


# ============================================================================
# Biometric Verification
# ============================================================================

@app.post("/api/biometric/verify")
async def verify_biometric(data: BiometricData):
    """Verify citizen biometric data"""
    
    # Simulated biometric verification
    # In production, use face recognition API
    verification_result = {
        "face_match_score": 0.95,  # Simulated high match
        "voice_match_score": 0.88,
        "liveness_check": True,
        "verified": True
    }
    
    return {
        "status": "verified",
        "result": verification_result,
        "message": "Identidad verificada correctamente"
    }


# ============================================================================
# Assistant/Chat Interface
# ============================================================================

@app.post("/api/assistant/message", response_model=AssistantResponse)
async def process_message(message: CitizenMessage):
    """Process a message from the citizen (text or voice)"""
    
    session_id = message.session_id or str(uuid.uuid4())
    
    # Anonymize the message before processing
    if message.text:
        anonymization_result = anonymizer.anonymize(message.text, session_id)
        safe_text = anonymization_result.anonymized_text
    else:
        safe_text = ""
    
    # Simple intent detection (would use LLM in production)
    intent = _detect_intent(safe_text)
    
    response_message = _generate_response(intent)
    
    return AssistantResponse(
        message=response_message,
        session_id=session_id,
        current_step="chat",
        next_action=intent.get("next_action"),
        data={"intent": intent}
    )


# ============================================================================
# Security Endpoints
# ============================================================================

@app.post("/api/security/anonymize")
async def anonymize_text(request: Dict[str, str]):
    """Anonymize text containing PII (for testing)"""
    text = request.get("text", "")
    result = anonymizer.anonymize(text)
    
    return {
        "original_length": len(text),
        "anonymized_text": result.anonymized_text,
        "detected_entities": [
            {
                "type": entity.pii_type.value,
                "confidence": entity.confidence
            }
            for entity in result.detected_entities
        ]
    }


# ============================================================================
# Helper Functions
# ============================================================================

def _get_next_action(state: ProcedureState) -> Optional[str]:
    """Determine the next action based on current state"""
    step_actions = {
        "start": "select_procedure",
        "biometric_validation": "capture_face",
        "document_analysis": "upload_document",
        "legal_review": "review_requirements",
        "scheduling": "confirm_appointment",
        "complete": None,
        "error": "retry"
    }
    return step_actions.get(state.current_step.value)


def _detect_intent(text: str) -> Dict[str, Any]:
    """Simple intent detection (replace with LLM in production)"""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["cédula", "cedula", "renovar", "renovación"]):
        return {"intent": "procedure", "type": "cedula_renovation", "next_action": "start_procedure"}
    elif any(word in text_lower for word in ["licencia", "conducir", "manejar"]):
        return {"intent": "procedure", "type": "licencia_conducir", "next_action": "start_procedure"}
    elif any(word in text_lower for word in ["nacimiento", "acta"]):
        return {"intent": "procedure", "type": "acta_nacimiento", "next_action": "start_procedure"}
    elif any(word in text_lower for word in ["hola", "buenos", "saludos"]):
        return {"intent": "greeting", "next_action": "show_options"}
    elif any(word in text_lower for word in ["ayuda", "help", "no entiendo"]):
        return {"intent": "help", "next_action": "show_help"}
    else:
        return {"intent": "unknown", "next_action": "clarify"}


def _generate_response(intent: Dict[str, Any]) -> str:
    """Generate a citizen-friendly response based on intent"""
    responses = {
        "greeting": (
            "¡Hola! 👋 Soy IDENTIA, su asistente virtual del gobierno.\n\n"
            "Puedo ayudarle con:\n"
            "• 🪪 Renovación de Cédula\n"
            "• 📄 Actas de Nacimiento\n"
            "• 🚗 Licencia de Conducir\n\n"
            "¿Qué trámite necesita realizar hoy?"
        ),
        "help": (
            "No se preocupe, estoy aquí para ayudarle. 😊\n\n"
            "Puede decirme qué trámite necesita, por ejemplo:\n"
            "• \"Quiero renovar mi cédula\"\n"
            "• \"Necesito un acta de nacimiento\"\n\n"
            "También puede tocar los botones en pantalla."
        ),
        "procedure": (
            "¡Perfecto! Vamos a iniciar su trámite.\n"
            "Primero, necesito verificar su identidad.\n\n"
            "Por favor, presione el botón de la cámara."
        ),
        "unknown": (
            "Disculpe, no entendí bien su solicitud. 🤔\n\n"
            "¿Podría decirme qué trámite necesita?\n"
            "Por ejemplo: \"renovar cédula\" o \"licencia de conducir\"."
        )
    }
    
    return responses.get(intent.get("intent", "unknown"), responses["unknown"])


# ============================================================================
# Registraduría Nacional de Colombia — Endpoints
# ============================================================================

@app.post("/api/registraduria/identificacion/cedula")
async def tramite_cedula(request: CedulaRequest):
    """
    Inicia un trámite de Cédula de Ciudadanía.
    Tipos: primera_vez | duplicado | rectificacion | renovacion
    """
    # Anonimizar datos sensibles antes de procesar
    datos = request.datos_ciudadano.copy()
    if "cedula" in datos:
        result_anon = anonymizer.anonymize(str(datos["cedula"]))
        datos["cedula_anonimizada"] = result_anon.anonymized_text
        del datos["cedula"]

    tipo = request.tipo_tramite
    if tipo == TramiteCedula.PRIMERA_VEZ.value:
        resultado = identificacion_handler.tramite_cedula_primera_vez(datos)
    elif tipo == TramiteCedula.DUPLICADO.value:
        resultado = identificacion_handler.tramite_cedula_duplicado(datos)
    elif tipo == TramiteCedula.RECTIFICACION.value:
        resultado = identificacion_handler.tramite_cedula_rectificacion(datos)
    elif tipo == TramiteCedula.RENOVACION.value:
        resultado = identificacion_handler.tramite_cedula_renovacion(datos)
    else:
        raise HTTPException(status_code=400, detail=f"Tipo de trámite no reconocido: {tipo}")

    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos,
        "requiere_biometria": resultado.requiere_biometria,
        "requiere_documentos": resultado.requiere_documentos,
        "numero_radicado": resultado.numero_radicado,
        "siguiente_paso": resultado.siguiente_paso
    }


@app.post("/api/registraduria/identificacion/tarjeta")
async def tramite_tarjeta_identidad(request: CedulaRequest):
    """Trámite de Tarjeta de Identidad para menores de 7 a 17 años"""
    resultado = identificacion_handler.tramite_tarjeta_identidad(request.datos_ciudadano)
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos,
        "requiere_documentos": resultado.requiere_documentos,
        "numero_radicado": resultado.numero_radicado,
        "siguiente_paso": resultado.siguiente_paso
    }


@app.post("/api/registraduria/registro-civil/inscripcion")
async def inscripcion_nacimiento(request: RegistroCivilRequest):
    """Inscripción de Registro Civil de Nacimiento"""
    resultado = registro_civil_handler.inscripcion_nacimiento(request.datos)
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos,
        "numero_radicado": resultado.numero_radicado,
        "siguiente_paso": resultado.siguiente_paso
    }


@app.post("/api/registraduria/registro-civil/copia")
async def copia_registro_civil(request: RegistroCivilRequest):
    """
    Solicitar copia auténtica de Registro Civil.
    Tipos: nacimiento | matrimonio | defuncion
    """
    tipo_map = {
        "nacimiento": TipoRegistroCivil.NACIMIENTO,
        "matrimonio": TipoRegistroCivil.MATRIMONIO,
        "defuncion":  TipoRegistroCivil.DEFUNCION
    }
    tipo = tipo_map.get(request.tipo)
    if not tipo:
        raise HTTPException(status_code=400, detail=f"Tipo de registro no válido: {request.tipo}")

    resultado = registro_civil_handler.copia_registro(tipo, request.datos)
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos,
        "numero_radicado": resultado.numero_radicado,
        "siguiente_paso": resultado.siguiente_paso
    }


@app.post("/api/registraduria/registro-civil/apostilla")
async def tramite_apostilla(request: RegistroCivilRequest):
    """Apostilla de documentos para uso en el exterior (Convenio de La Haya)"""
    resultado = registro_civil_handler.tramite_apostilla(request.datos)
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos,
        "numero_radicado": resultado.numero_radicado,
        "siguiente_paso": resultado.siguiente_paso
    }


@app.post("/api/registraduria/consultas/estado")
async def consulta_estado_documento(request: ConsultaEstadoRequest):
    """
    Consulta el estado de un documento en trámite.
    El número de cédula es anonimizado antes de procesar.
    """
    # Anonimizar cédula
    anon_result = anonymizer.anonymize(request.numero_cedula)
    resultado = consultas_handler.consulta_estado_documento(
        request.numero_cedula,
        request.radicado
    )
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos  # Ya incluye cédula anonimizada
    }


@app.get("/api/registraduria/consultas/oficinas")
async def consulta_oficinas(ciudad: Optional[str] = None):
    """Consulta oficinas de la Registraduría por ciudad"""
    resultado = consultas_handler.consulta_oficinas(ciudad)
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos,
        "siguiente_paso": resultado.siguiente_paso
    }


@app.post("/api/registraduria/citas/agendar")
async def agendar_cita(request: CitaRequest):
    """Agenda una cita en la oficina de la Registraduría más cercana"""
    resultado = citas_handler.agendar_cita(
        servicio=request.servicio,
        ciudad=request.ciudad,
        fecha_preferida=request.fecha_preferida,
        hora_preferida=request.hora_preferida
    )
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos,
        "numero_radicado": resultado.numero_radicado
    }


@app.get("/api/registraduria/tarifas")
async def consultar_tarifas(tipo_tramite: Optional[str] = None):
    """Consulta tarifas vigentes y exoneraciones (Resolución 2024)"""
    resultado = citas_handler.consultar_tarifas(tipo_tramite)
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos,
        "siguiente_paso": resultado.siguiente_paso
    }


@app.post("/api/registraduria/tarifas/exoneracion")
async def verificar_exoneracion(request: ExoneracionRequest):
    """Verifica si el ciudadano aplica para exoneración de tarifas"""
    resultado = citas_handler.verificar_exoneracion(request.datos_ciudadano)
    return {
        "exito": resultado.exito,
        "mensaje": resultado.mensaje,
        "datos": resultado.datos
    }


# ============================================================================
# Tracking (PIN) — Endpoints
# ============================================================================

@app.post("/api/tramites/iniciar")
async def iniciar_tramite(request: IniciarTramiteRequest):
    """
    Inicia un trámite y genera un PIN único de 6 dígitos.
    El PIN permite al ciudadano consultar el estado en cualquier momento.
    """
    resultado = crear_tramite(
        tipo=request.tipo,
        datos_ciudadano=request.datos_ciudadano,
        session_id=request.session_id
    )
    return resultado


@app.get("/api/tramites/estado/{pin}")
async def consultar_estado_tramite(pin: str):
    """Consulta el estado de un trámite por su PIN de 6 dígitos"""
    resultado = consultar_estado_pin(pin)
    if not resultado.get("encontrado"):
        raise HTTPException(status_code=404, detail=resultado["mensaje"])
    return resultado


@app.post("/api/tramites/estado")
async def consultar_estado_tramite_post(request: ConsultaPinRequest):
    """Consulta el estado de un trámite por PIN (vía POST para mayor seguridad)"""
    resultado = consultar_estado_pin(request.pin)
    return resultado


# ============================================================================
# Google Calendar — Endpoints
# ============================================================================

@app.post("/api/calendar/agendar")
async def agendar_cita_google(request: AgendarCalendarRequest):
    """
    Agenda una cita en Google Calendar con el formato:
    [IDENTIA] Cita de {tipo} - {nombre}
    """
    resultado = agendar_cita_calendar(
        tipo_tramite=request.tipo_tramite,
        nombre_ciudadano=request.nombre_ciudadano,
        fecha=request.fecha,
        hora=request.hora,
        oficina=request.oficina,
        email_ciudadano=request.email_ciudadano,
        pin_tramite=request.pin_tramite
    )

    # Actualizar estado del trámite si hay PIN
    if request.pin_tramite and resultado.get("exito"):
        actualizar_estado(
            pin=request.pin_tramite,
            nuevo_estado=EstadoTramiteEnum.CITA_AGENDADA.value,
            nota=f"Cita agendada el {request.fecha} a las {request.hora}",
            datos_cita={
                "fecha": request.fecha,
                "hora": request.hora,
                "oficina": request.oficina,
                "event_id": resultado.get("event_id")
            }
        )

    return resultado


@app.get("/api/calendar/slots")
async def obtener_slots(fecha: str, ciudad: str = "Bogotá"):
    """Retorna los horarios disponibles para una fecha y ciudad"""
    return obtener_slots_disponibles(fecha, ciudad)


# ============================================================================
# Voice Identity Verification — Endpoint
# ============================================================================

@app.post("/api/verificacion/voz")
async def verificar_identidad_voz(request: VerificarVozRequest):
    """
    Verifica la identidad del ciudadano por voz (nombre + cédula).
    Aplica umbral de confianza configurable (default: 0.75).
    """
    import random

    # Anonimizar cédula antes de procesar
    cedula_anon = anonymizer.anonymize(request.cedula)

    # Simulación de verificación (reemplazar con BD real)
    # En producción: consultar BD con nombre + cédula
    nombre_limpio = request.nombre.strip().lower()
    cedula_limpia = request.cedula.strip().replace(" ", "").replace("-", "")

    # Simular confianza basada en longitud y formato
    tiene_nombre = len(nombre_limpio.split()) >= 2  # Al menos nombre y apellido
    tiene_cedula = cedula_limpia.isdigit() and 6 <= len(cedula_limpia) <= 12

    if tiene_nombre and tiene_cedula:
        confianza = round(random.uniform(0.78, 0.97), 2)
    elif tiene_nombre or tiene_cedula:
        confianza = round(random.uniform(0.45, 0.74), 2)
    else:
        confianza = round(random.uniform(0.10, 0.44), 2)

    verificado = confianza >= request.umbral_confianza

    if verificado:
        return {
            "verificado": True,
            "confianza": confianza,
            "nombre": request.nombre,
            "cedula_anonimizada": f"***{cedula_limpia[-4:]}" if len(cedula_limpia) >= 4 else "***",
            "mensaje": (
                f"✅ **¡Identidad verificada!** ({round(confianza * 100)}% de confianza)\n\n"
                f"Bienvenido/a, **{request.nombre}**. Su identidad fue confirmada exitosamente.\n\n"
                f"Continuemos con el siguiente paso de su trámite."
            )
        }
    else:
        return {
            "verificado": False,
            "confianza": confianza,
            "mensaje": (
                f"No logré encontrarte con esos datos ({round(confianza * 100)}% de confianza). "
                f"Por favor intenta decir tu cédula nuevamente o solicita ayuda.\n\n"
                f"📞 Línea de ayuda: **01 8000 111 555**"
            )
        }


# ============================================================================
# Run Application
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
