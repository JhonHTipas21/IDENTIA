"""
IDENTIA - Specialized Agents Module
====================================
Defines the specialized agents that collaborate to complete
government procedures without human intervention.

Agents:
- ValidatorAgent: Document and identity verification
- LegalAgent: Legal framework analysis
- GestorAgent: Appointment scheduling and case management
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from enum import Enum
import json


class AgentStatus(Enum):
    """Status of an agent's task execution"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_INFO = "needs_info"


@dataclass
class AgentResult:
    """Result from an agent's processing"""
    status: AgentStatus
    message: str
    data: Dict[str, Any]
    next_action: Optional[str] = None
    confidence: float = 1.0


class BaseAgent(ABC):
    """Base class for all IDENTIA agents"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._context: Dict[str, Any] = {}
    
    @abstractmethod
    async def process(self, state: Dict[str, Any]) -> AgentResult:
        """Process the current state and return a result"""
        pass
    
    def set_context(self, key: str, value: Any):
        """Set context value for the agent"""
        self._context[key] = value
    
    def get_context(self, key: str, default: Any = None) -> Any:
        """Get context value"""
        return self._context.get(key, default)


class ValidatorAgent(BaseAgent):
    """
    Validator Agent
    ===============
    Responsible for:
    - Document authenticity verification
    - Identity validation (biometric matching)
    - Form data completeness checks
    - Cross-reference with government databases
    """
    
    def __init__(self):
        super().__init__(
            name="ValidatorAgent",
            description="Valida documentos e identidad del ciudadano"
        )
        self.required_documents = ["cedula", "proof_of_address", "photo"]
    
    async def process(self, state: Dict[str, Any]) -> AgentResult:
        """Validate citizen documents and identity"""
        
        documents = state.get("documents", {})
        biometric_data = state.get("biometric_data", {})
        form_data = state.get("form_data", {})
        
        validation_results = {
            "document_check": self._validate_documents(documents),
            "biometric_check": self._validate_biometrics(biometric_data),
            "form_check": self._validate_form(form_data),
        }
        
        # Determine overall status
        all_passed = all(v["passed"] for v in validation_results.values())
        missing_items = []
        
        for check_name, result in validation_results.items():
            if not result["passed"]:
                missing_items.extend(result.get("missing", []))
        
        if all_passed:
            return AgentResult(
                status=AgentStatus.COMPLETED,
                message="Todos los documentos y datos han sido validados correctamente.",
                data=validation_results,
                next_action="legal_review",
                confidence=0.95
            )
        else:
            return AgentResult(
                status=AgentStatus.NEEDS_INFO,
                message=f"Se requiere información adicional: {', '.join(missing_items)}",
                data=validation_results,
                next_action="request_documents",
                confidence=0.8
            )
    
    def _validate_documents(self, documents: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that required documents are present and valid"""
        missing = []
        validated = []
        
        for doc_type in self.required_documents:
            if doc_type in documents and documents[doc_type]:
                doc = documents[doc_type]
                # Simulate document validation
                if self._is_document_valid(doc):
                    validated.append(doc_type)
                else:
                    missing.append(f"{doc_type} (documento inválido)")
            else:
                missing.append(doc_type)
        
        return {
            "passed": len(missing) == 0,
            "validated": validated,
            "missing": missing
        }
    
    def _validate_biometrics(self, biometric_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate biometric data (facial/voice)"""
        face_match = biometric_data.get("face_match_score", 0)
        voice_match = biometric_data.get("voice_match_score", 0)
        liveness = biometric_data.get("liveness_check", False)
        
        # Thresholds for acceptance
        FACE_THRESHOLD = 0.85
        VOICE_THRESHOLD = 0.80
        
        passed = (
            face_match >= FACE_THRESHOLD and
            liveness
        )
        
        missing = []
        if face_match < FACE_THRESHOLD:
            missing.append("verificación facial")
        if not liveness:
            missing.append("prueba de vida")
        
        return {
            "passed": passed,
            "face_match": face_match,
            "voice_match": voice_match,
            "liveness": liveness,
            "missing": missing
        }
    
    def _validate_form(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate form data completeness"""
        required_fields = ["nombre", "cedula", "direccion", "telefono", "tipo_tramite"]
        missing = [f for f in required_fields if not form_data.get(f)]
        
        return {
            "passed": len(missing) == 0,
            "missing": missing
        }
    
    def _is_document_valid(self, document: Dict[str, Any]) -> bool:
        """Check if a document is valid (simulated)"""
        # In production, this would verify document authenticity
        return document.get("verified", False) or document.get("data") is not None


class LegalAgent(BaseAgent):
    """
    Legal Agent
    ===========
    Responsible for:
    - Analyzing legal requirements for procedures
    - Checking citizen eligibility based on regulations
    - Identifying required permits and approvals
    - Generating legal summaries in citizen-friendly language
    """
    
    def __init__(self):
        super().__init__(
            name="LegalAgent",
            description="Analiza requisitos legales y normativas vigentes"
        )
        self.regulations_db = self._load_regulations()
    
    def _load_regulations(self) -> Dict[str, Any]:
        """Load regulations database (simulated)"""
        return {
            "cedula_renovation": {
                "requirements": ["cedula_anterior", "foto_reciente", "comprobante_pago"],
                "eligibility": {"age_min": 18, "residency_required": True},
                "processing_time": "5-10 días hábiles",
                "cost": 500.00,
                "legal_reference": "Ley 6125 de Cédula de Identidad Personal"
            },
            "acta_nacimiento": {
                "requirements": ["cedula_solicitante", "datos_titular"],
                "eligibility": {"relationship_required": True},
                "processing_time": "3-5 días hábiles",
                "cost": 200.00,
                "legal_reference": "Ley 659 sobre Actos del Estado Civil"
            },
            "licencia_conducir": {
                "requirements": ["cedula", "examen_medico", "curso_aprobado", "foto"],
                "eligibility": {"age_min": 18, "vision_test": True},
                "processing_time": "1-3 días hábiles",
                "cost": 1500.00,
                "legal_reference": "Ley 63-17 de Movilidad y Seguridad Vial"
            }
        }
    
    async def process(self, state: Dict[str, Any]) -> AgentResult:
        """Analyze legal requirements for the procedure"""
        
        procedure_type = state.get("procedure_type", "")
        citizen_data = state.get("citizen_data", {})
        documents = state.get("documents", {})
        
        # Get regulations for this procedure
        regulations = self.regulations_db.get(procedure_type)
        
        if not regulations:
            return AgentResult(
                status=AgentStatus.FAILED,
                message=f"No se encontró información legal para el trámite: {procedure_type}",
                data={"available_procedures": list(self.regulations_db.keys())},
                confidence=1.0
            )
        
        # Check eligibility
        eligibility_result = self._check_eligibility(citizen_data, regulations["eligibility"])
        
        # Check required documents
        required_docs = regulations["requirements"]
        missing_docs = [doc for doc in required_docs if doc not in documents]
        
        # Generate citizen-friendly summary
        summary = self._generate_legal_summary(procedure_type, regulations, eligibility_result)
        
        if eligibility_result["eligible"] and not missing_docs:
            return AgentResult(
                status=AgentStatus.COMPLETED,
                message="Análisis legal completado. El ciudadano cumple con todos los requisitos.",
                data={
                    "eligibility": eligibility_result,
                    "regulations": regulations,
                    "summary": summary
                },
                next_action="schedule_appointment",
                confidence=0.92
            )
        else:
            issues = []
            if not eligibility_result["eligible"]:
                issues.extend(eligibility_result.get("issues", []))
            if missing_docs:
                issues.append(f"Documentos faltantes: {', '.join(missing_docs)}")
            
            return AgentResult(
                status=AgentStatus.NEEDS_INFO,
                message=f"Se identificaron los siguientes requisitos pendientes: {'; '.join(issues)}",
                data={
                    "eligibility": eligibility_result,
                    "missing_documents": missing_docs,
                    "summary": summary
                },
                next_action="request_info",
                confidence=0.85
            )
    
    def _check_eligibility(self, citizen_data: Dict[str, Any], eligibility_rules: Dict[str, Any]) -> Dict[str, Any]:
        """Check if citizen meets eligibility requirements"""
        issues = []
        
        # Check age
        if "age_min" in eligibility_rules:
            citizen_age = citizen_data.get("age", 0)
            if citizen_age < eligibility_rules["age_min"]:
                issues.append(f"Edad mínima requerida: {eligibility_rules['age_min']} años")
        
        # Check residency
        if eligibility_rules.get("residency_required"):
            if not citizen_data.get("is_resident", False):
                issues.append("Se requiere residencia en el país")
        
        return {
            "eligible": len(issues) == 0,
            "issues": issues
        }
    
    def _generate_legal_summary(self, procedure_type: str, regulations: Dict[str, Any], eligibility: Dict[str, Any]) -> str:
        """Generate a citizen-friendly legal summary"""
        summary = f"""
📋 **Resumen de su trámite: {procedure_type.replace('_', ' ').title()}**

📄 **Documentos necesarios:**
{chr(10).join('   • ' + doc.replace('_', ' ').title() for doc in regulations['requirements'])}

⏱️ **Tiempo de procesamiento:** {regulations['processing_time']}

💰 **Costo:** RD${regulations['cost']:,.2f}

📚 **Base legal:** {regulations['legal_reference']}
"""
        return summary.strip()


class GestorAgent(BaseAgent):
    """
    Gestor (Case Manager) Agent
    ===========================
    Responsible for:
    - Scheduling appointments with government offices
    - Managing case status and updates
    - Sending notifications to citizens
    - Coordinating between different agencies
    """
    
    def __init__(self):
        super().__init__(
            name="GestorAgent",
            description="Gestiona citas y seguimiento de trámites"
        )
        self.available_offices = self._load_offices()
    
    def _load_offices(self) -> List[Dict[str, Any]]:
        """Load available government offices"""
        return [
            {
                "id": "jce_sd",
                "name": "Junta Central Electoral - Santo Domingo",
                "services": ["cedula_renovation", "acta_nacimiento"],
                "available_slots": ["09:00", "10:00", "11:00", "14:00", "15:00"]
            },
            {
                "id": "dgii_sd",
                "name": "DGII - Santo Domingo",
                "services": ["rnc", "declaracion_impuestos"],
                "available_slots": ["08:00", "09:00", "10:00", "11:00"]
            },
            {
                "id": "intrant_sd",
                "name": "INTRANT - Santo Domingo",
                "services": ["licencia_conducir", "marbete"],
                "available_slots": ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"]
            }
        ]
    
    async def process(self, state: Dict[str, Any]) -> AgentResult:
        """Manage appointment scheduling and case tracking"""
        
        action = state.get("action", "schedule")
        procedure_type = state.get("procedure_type", "")
        citizen_preferences = state.get("preferences", {})
        
        if action == "schedule":
            return await self._schedule_appointment(procedure_type, citizen_preferences)
        elif action == "status":
            return await self._check_status(state.get("case_id", ""))
        elif action == "notify":
            return await self._send_notification(state.get("notification", {}))
        else:
            return AgentResult(
                status=AgentStatus.FAILED,
                message=f"Acción no reconocida: {action}",
                data={},
                confidence=1.0
            )
    
    async def _schedule_appointment(self, procedure_type: str, preferences: Dict[str, Any]) -> AgentResult:
        """Schedule an appointment at the appropriate office"""
        
        # Find offices that handle this procedure
        suitable_offices = [
            office for office in self.available_offices
            if procedure_type in office["services"]
        ]
        
        if not suitable_offices:
            return AgentResult(
                status=AgentStatus.FAILED,
                message=f"No se encontró oficina disponible para el trámite: {procedure_type}",
                data={"available_procedures": self._get_all_services()},
                confidence=1.0
            )
        
        # Select the best office based on preferences
        selected_office = suitable_offices[0]  # For now, select first available
        preferred_time = preferences.get("preferred_time", selected_office["available_slots"][0])
        
        # Create appointment
        appointment = {
            "office": selected_office["name"],
            "office_id": selected_office["id"],
            "date": "próximo día hábil disponible",  # Would calculate actual date
            "time": preferred_time if preferred_time in selected_office["available_slots"] else selected_office["available_slots"][0],
            "procedure": procedure_type,
            "confirmation_code": f"IDENTIA-{hash(procedure_type) % 10000:04d}"
        }
        
        return AgentResult(
            status=AgentStatus.COMPLETED,
            message=f"Cita programada exitosamente en {selected_office['name']}",
            data={
                "appointment": appointment,
                "instructions": self._get_appointment_instructions(appointment)
            },
            next_action="confirm_appointment",
            confidence=0.95
        )
    
    async def _check_status(self, case_id: str) -> AgentResult:
        """Check the status of a case"""
        # Simulated status check
        return AgentResult(
            status=AgentStatus.COMPLETED,
            message=f"Estado del caso {case_id}: En procesamiento",
            data={
                "case_id": case_id,
                "status": "processing",
                "step": 2,
                "total_steps": 4,
                "last_update": "hace 2 horas"
            },
            confidence=0.9
        )
    
    async def _send_notification(self, notification: Dict[str, Any]) -> AgentResult:
        """Send a notification to the citizen"""
        return AgentResult(
            status=AgentStatus.COMPLETED,
            message="Notificación enviada exitosamente",
            data={"notification_id": f"NOTIF-{hash(str(notification)) % 10000:04d}"},
            confidence=1.0
        )
    
    def _get_all_services(self) -> List[str]:
        """Get all available services across offices"""
        services = set()
        for office in self.available_offices:
            services.update(office["services"])
        return list(services)
    
    def _get_appointment_instructions(self, appointment: Dict[str, Any]) -> str:
        """Generate appointment instructions"""
        return f"""
📅 **Detalles de su cita:**

🏢 **Oficina:** {appointment['office']}
📆 **Fecha:** {appointment['date']}
🕐 **Hora:** {appointment['time']}
🎫 **Código de confirmación:** {appointment['confirmation_code']}

📋 **Recuerde traer:**
   • Cédula de identidad original
   • Documentos mencionados en los requisitos
   • Este código de confirmación

⚠️ **Importante:** Llegue 15 minutos antes de su cita.
""".strip()
