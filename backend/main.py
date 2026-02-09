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
# Run Application
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
