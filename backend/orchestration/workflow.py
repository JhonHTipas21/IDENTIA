"""
IDENTIA - LangGraph Workflow Module
====================================
Manages the lifecycle of government procedures using LangGraph
for stateful agent orchestration.

Workflow States:
1. START -> Biometric Validation
2. Biometric Validation -> Document Analysis
3. Document Analysis -> Legal Review
4. Legal Review -> Appointment Scheduling
5. Appointment Scheduling -> COMPLETE
"""

from typing import TypedDict, Literal, Annotated, List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import operator
from datetime import datetime

# Note: In production, use actual langgraph:
# from langgraph.graph import StateGraph, END
# For now, we implement a compatible interface


class WorkflowStep(Enum):
    """Steps in the procedure workflow"""
    START = "start"
    BIOMETRIC_VALIDATION = "biometric_validation"
    DOCUMENT_ANALYSIS = "document_analysis"
    LEGAL_REVIEW = "legal_review"
    SCHEDULING = "scheduling"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class ProcedureState:
    """
    State object for a government procedure.
    Contains all information needed to process a citizen's request.
    """
    # Procedure identification
    procedure_id: str = ""
    procedure_type: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # Current workflow state
    current_step: WorkflowStep = WorkflowStep.START
    step_history: List[str] = field(default_factory=list)
    
    # Citizen data
    citizen_id: str = ""
    citizen_data: Dict[str, Any] = field(default_factory=dict)
    
    # Documents
    documents: Dict[str, Any] = field(default_factory=dict)
    ocr_results: Dict[str, Any] = field(default_factory=dict)
    
    # Biometric data
    biometric_data: Dict[str, Any] = field(default_factory=dict)
    
    # Processing results
    validation_result: Dict[str, Any] = field(default_factory=dict)
    legal_result: Dict[str, Any] = field(default_factory=dict)
    appointment: Dict[str, Any] = field(default_factory=dict)
    
    # Error handling
    error: Optional[str] = None
    retry_count: int = 0
    
    # Messages for the citizen
    messages: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary"""
        return {
            "procedure_id": self.procedure_id,
            "procedure_type": self.procedure_type,
            "created_at": self.created_at,
            "current_step": self.current_step.value,
            "step_history": self.step_history,
            "citizen_id": self.citizen_id,
            "citizen_data": self.citizen_data,
            "documents": self.documents,
            "ocr_results": self.ocr_results,
            "biometric_data": self.biometric_data,
            "validation_result": self.validation_result,
            "legal_result": self.legal_result,
            "appointment": self.appointment,
            "error": self.error,
            "messages": self.messages
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProcedureState":
        """Create state from dictionary"""
        state = cls()
        for key, value in data.items():
            if key == "current_step":
                state.current_step = WorkflowStep(value)
            elif hasattr(state, key):
                setattr(state, key, value)
        return state


class ProcedureWorkflow:
    """
    LangGraph-compatible workflow for government procedures.
    
    This class manages the state machine for processing a citizen's
    procedure request through multiple validation and processing steps.
    """
    
    def __init__(self):
        from .agents import ValidatorAgent, LegalAgent, GestorAgent
        
        self.validator = ValidatorAgent()
        self.legal = LegalAgent()
        self.gestor = GestorAgent()
        
        # Define state transitions
        self.transitions = {
            WorkflowStep.START: self._handle_start,
            WorkflowStep.BIOMETRIC_VALIDATION: self._handle_biometric,
            WorkflowStep.DOCUMENT_ANALYSIS: self._handle_documents,
            WorkflowStep.LEGAL_REVIEW: self._handle_legal,
            WorkflowStep.SCHEDULING: self._handle_scheduling,
        }
    
    async def run(self, initial_state: ProcedureState) -> ProcedureState:
        """
        Run the complete workflow from start to finish.
        
        Args:
            initial_state: The initial procedure state
            
        Returns:
            The final procedure state after processing
        """
        state = initial_state
        
        while state.current_step not in [WorkflowStep.COMPLETE, WorkflowStep.ERROR]:
            handler = self.transitions.get(state.current_step)
            
            if not handler:
                state.error = f"No handler for step: {state.current_step}"
                state.current_step = WorkflowStep.ERROR
                break
            
            try:
                state = await handler(state)
                state.step_history.append(state.current_step.value)
            except Exception as e:
                state.error = str(e)
                state.current_step = WorkflowStep.ERROR
                state.messages.append(
                    "Lo sentimos, ocurrió un error procesando su solicitud. "
                    "Por favor intente nuevamente."
                )
        
        return state
    
    async def step(self, state: ProcedureState) -> ProcedureState:
        """
        Execute a single step in the workflow.
        
        Args:
            state: Current procedure state
            
        Returns:
            Updated procedure state
        """
        handler = self.transitions.get(state.current_step)
        
        if not handler:
            state.error = f"No handler for step: {state.current_step}"
            state.current_step = WorkflowStep.ERROR
            return state
        
        return await handler(state)
    
    async def _handle_start(self, state: ProcedureState) -> ProcedureState:
        """Initial step - validate we have minimum required info"""
        
        if not state.procedure_type:
            state.messages.append(
                "¡Bienvenido a IDENTIA! 👋\n"
                "¿En qué trámite puedo ayudarle hoy?"
            )
            return state
        
        state.messages.append(
            f"Perfecto, vamos a iniciar su trámite de {state.procedure_type.replace('_', ' ')}.\n"
            "Primero necesito verificar su identidad."
        )
        state.current_step = WorkflowStep.BIOMETRIC_VALIDATION
        return state
    
    async def _handle_biometric(self, state: ProcedureState) -> ProcedureState:
        """Handle biometric validation step"""
        
        # Check if we have biometric data
        if not state.biometric_data:
            state.messages.append(
                "📸 Por favor, mire a la cámara para verificar su identidad.\n"
                "Esto solo tomará unos segundos."
            )
            return state
        
        # Validate using the validator agent
        validation_state = {
            "documents": state.documents,
            "biometric_data": state.biometric_data,
            "form_data": state.citizen_data
        }
        
        result = await self.validator.process(validation_state)
        state.validation_result = result.data
        
        if result.status.value == "completed":
            state.messages.append(
                "✅ ¡Identidad verificada correctamente!\n"
                "Ahora revisaremos sus documentos."
            )
            state.current_step = WorkflowStep.DOCUMENT_ANALYSIS
        elif result.status.value == "needs_info":
            state.messages.append(
                "⚠️ " + result.message + "\n"
                "Por favor, intente nuevamente."
            )
        else:
            state.error = result.message
            state.current_step = WorkflowStep.ERROR
        
        return state
    
    async def _handle_documents(self, state: ProcedureState) -> ProcedureState:
        """Handle document analysis step"""
        
        if not state.documents:
            state.messages.append(
                "📄 Ahora necesito que tome una foto de su cédula.\n"
                "Colóquela dentro del marco en la pantalla."
            )
            return state
        
        # Validate documents
        validation_state = {
            "documents": state.documents,
            "biometric_data": state.biometric_data,
            "form_data": state.citizen_data
        }
        
        result = await self.validator.process(validation_state)
        
        if result.status.value == "completed":
            state.messages.append(
                "✅ Documentos verificados correctamente.\n"
                "Revisando requisitos legales..."
            )
            state.current_step = WorkflowStep.LEGAL_REVIEW
        else:
            missing = result.data.get("document_check", {}).get("missing", [])
            if missing:
                state.messages.append(
                    f"📋 Necesito los siguientes documentos adicionales:\n"
                    + "\n".join(f"  • {doc}" for doc in missing)
                )
            else:
                state.messages.append("⚠️ " + result.message)
        
        return state
    
    async def _handle_legal(self, state: ProcedureState) -> ProcedureState:
        """Handle legal review step"""
        
        legal_state = {
            "procedure_type": state.procedure_type,
            "citizen_data": state.citizen_data,
            "documents": state.documents
        }
        
        result = await self.legal.process(legal_state)
        state.legal_result = result.data
        
        if result.status.value == "completed":
            summary = result.data.get("summary", "")
            state.messages.append(
                "✅ Análisis legal completado.\n\n" + summary +
                "\n\n¿Desea programar una cita?"
            )
            state.current_step = WorkflowStep.SCHEDULING
        elif result.status.value == "needs_info":
            state.messages.append("⚠️ " + result.message)
        else:
            state.error = result.message
            state.current_step = WorkflowStep.ERROR
        
        return state
    
    async def _handle_scheduling(self, state: ProcedureState) -> ProcedureState:
        """Handle appointment scheduling step"""
        
        scheduling_state = {
            "action": "schedule",
            "procedure_type": state.procedure_type,
            "preferences": state.citizen_data.get("preferences", {})
        }
        
        result = await self.gestor.process(scheduling_state)
        
        if result.status.value == "completed":
            appointment = result.data.get("appointment", {})
            instructions = result.data.get("instructions", "")
            
            state.appointment = appointment
            state.messages.append(
                "🎉 ¡Excelente! Su trámite ha sido procesado.\n\n" +
                instructions
            )
            state.current_step = WorkflowStep.COMPLETE
        else:
            state.messages.append("⚠️ " + result.message)
        
        return state
    
    def get_workflow_diagram(self) -> str:
        """Get a text representation of the workflow"""
        return """
┌─────────────────────────────────────────────────────────────────┐
│                    IDENTIA Workflow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐                                                   │
│   │  START  │                                                   │
│   └────┬────┘                                                   │
│        │                                                         │
│        ▼                                                         │
│   ┌─────────────────────┐                                       │
│   │ BIOMETRIC VALIDATION │◄──────────────┐                      │
│   └──────────┬──────────┘               │                       │
│              │                           │ Retry                 │
│              ▼                           │                       │
│   ┌─────────────────────┐               │                       │
│   │  DOCUMENT ANALYSIS  │───────────────┘                       │
│   └──────────┬──────────┘                                       │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────┐                                       │
│   │    LEGAL REVIEW     │                                       │
│   └──────────┬──────────┘                                       │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────┐                                       │
│   │     SCHEDULING      │                                       │
│   └──────────┬──────────┘                                       │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────┐                                       │
│   │      COMPLETE       │                                       │
│   └─────────────────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
"""
