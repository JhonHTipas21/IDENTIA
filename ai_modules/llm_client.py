"""
IDENTIA - LLM Client Module
=============================
Integration with Large Language Models for 131K token context
analysis of legal documents and citizen-friendly response generation.

Features:
- Long context document analysis
- Citizen-friendly language generation
- Intent detection and classification
- Multi-turn conversation handling
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from enum import Enum
import json


class LLMProvider(Enum):
    """Supported LLM providers"""
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


@dataclass
class LLMConfig:
    """Configuration for LLM client"""
    provider: LLMProvider = LLMProvider.GEMINI
    model: str = "gemini-2.0-flash"
    temperature: float = 0.3  # Lower for more consistent responses
    max_tokens: int = 4096
    context_window: int = 131072  # 131K tokens
    api_key: Optional[str] = None


@dataclass
class ConversationMessage:
    """Single message in a conversation"""
    role: str  # "system", "user", "assistant"
    content: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class LLMResponse:
    """Response from the LLM"""
    content: str
    tokens_used: int
    finish_reason: str
    metadata: Dict[str, Any]


# System prompt for citizen-facing AI agent
CITIZEN_AGENT_SYSTEM_PROMPT = """
Eres IDENTIA, un asistente virtual amable y paciente de la **Registraduía Nacional del Estado Civil de Colombia**. Tu propósito es ayudar a los ciudadanos colombianos con sus trámites de identidad y registro civil.

## Tu Personalidad:
- Eres EXTREMADAMENTE paciente y comprensivo, especialmente con adultos mayores
- Usas un lenguaje SENCILLO, nunca técnico ni jurídico
- Tratas a todos con respeto y dignidad
- Celebras los logros del ciudadano ("¡Muy bien!", "¡Perfecto!")
- Ofreces ayuda adicional sin que te la pidan
- Hablas en español colombiano natural y cálido

## Reglas de Comunicación:
1. SIEMPRE saluda de forma cálida
2. Explica cada paso uno a la vez
3. NUNCA uses jerga legal o técnica
4. Confirma que el ciudadano entendió antes de avanzar
5. Ofrece alternativas si algo no es claro
6. Usa emojis con moderación para hacer la conversación amigable
7. Siempre menciona si un trámite es GRATUITO

## Servicios de la Registraduía que puedes ayudar:

### 🇸 Identificación:
- Cédula de Ciudadanía: primera vez, duplicado, rectificación, renovación
- Tarjeta de Identidad para menores (7-17 años)

### 📚 Registro Civil:
- Inscripción de nacimiento (gratuita)
- Copias de registros: nacimiento, matrimonio, defunción
- Apostilla de documentos para el exterior

### 🔍 Consultas:
- Estado de su documento en trámite
- Ubicación de oficinas por ciudad
- Barra de progreso visual del trámite

### 📅 Citas y Tarifas:
- Agendamiento de citas
- Tarifas vigentes 2024
- Exoneraciones (víctimas, adultos mayores vulnerables, discapacitados)

## Tarifas Clave (2024):
- Cédula primera vez: GRATUITA
- Cédula duplicado: $51.900 COP (exonerados: víctimas, vulnerables)
- Copias registro civil: $6.900 COP
- Apostilla: $51.900 COP
- Tarjeta de Identidad: GRATUITA
- Inscripción nacimiento: GRATUITA

## Cómo Manejar Situaciones:
- Si el ciudadano está confundido: "No se preocupe, le explico de otra manera..."
- Si hay un error: "Disculpe la molestia, vamos a solucionarlo juntos..."
- Si necesita esperar: "Esto tomará un momento, pero ya casi terminamos..."
- Si completó algo: "¡Excelente! Ha completado este paso perfectamente."
- Para adultos mayores: habla más despacio y con instrucciones muy simples

## Restricciones:
- NUNCA pidas información sensible que no sea necesaria
- NUNCA compartas información de otros ciudadanos
- SIEMPRE recuerda que la privacidad es primordial
- Si no puedes ayudar, indica amablemente cómo obtener ayuda humana
- Línea de atención Registraduía: 01 8000 111 555

Responde siempre en español colombiano, de forma natural y cálida.
"""


class LLMClient:
    """
    Client for interacting with Large Language Models.
    
    Supports 131K token context for analyzing extensive legal
    documents and regulations in a single pass.
    """
    
    def __init__(self, config: Optional[LLMConfig] = None):
        """
        Initialize the LLM client.
        
        Args:
            config: LLM configuration options
        """
        self.config = config or LLMConfig()
        self._conversation_history: List[ConversationMessage] = []
        self._system_prompt = CITIZEN_AGENT_SYSTEM_PROMPT
        self._client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the LLM client based on provider"""
        # In production:
        # if self.config.provider == LLMProvider.GEMINI:
        #     import google.generativeai as genai
        #     genai.configure(api_key=self.config.api_key)
        #     self._client = genai.GenerativeModel(self.config.model)
        pass
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None
    ) -> LLMResponse:
        """
        Generate a response from the LLM.
        
        Args:
            prompt: User prompt
            system_prompt: Optional override for system prompt
            context: Optional additional context (documents, etc.)
            
        Returns:
            LLMResponse with generated content
        """
        full_prompt = self._build_prompt(prompt, system_prompt, context)
        
        # In production, call the actual LLM API:
        # response = await self._client.generate_content_async(full_prompt)
        # return LLMResponse(
        #     content=response.text,
        #     tokens_used=response.usage_metadata.total_token_count,
        #     finish_reason=response.candidates[0].finish_reason.name,
        #     metadata={}
        # )
        
        # Simulated response
        response_content = self._generate_simulated_response(prompt)
        
        return LLMResponse(
            content=response_content,
            tokens_used=len(prompt.split()) * 2,  # Simulated
            finish_reason="STOP",
            metadata={}
        )
    
    async def analyze_document(
        self,
        document_text: str,
        analysis_type: str = "summary"
    ) -> Dict[str, Any]:
        """
        Analyze a legal document using the full context window.
        
        Args:
            document_text: Full text of the document
            analysis_type: Type of analysis ("summary", "requirements", "eligibility")
            
        Returns:
            Analysis results
        """
        analysis_prompts = {
            "summary": "Resume este documento legal en términos simples que un ciudadano común pueda entender:",
            "requirements": "Lista todos los requisitos mencionados en este documento:",
            "eligibility": "Identifica los criterios de elegibilidad mencionados:"
        }
        
        prompt = f"{analysis_prompts.get(analysis_type, analysis_prompts['summary'])}\n\n{document_text}"
        
        response = await self.generate(prompt)
        
        return {
            "analysis_type": analysis_type,
            "result": response.content,
            "document_length": len(document_text),
            "tokens_used": response.tokens_used
        }
    
    async def chat(self, message: str) -> str:
        """
        Have a conversational exchange with the LLM.
        
        Args:
            message: User message
            
        Returns:
            Assistant's response
        """
        # Add to conversation history
        self._conversation_history.append(
            ConversationMessage(role="user", content=message)
        )
        
        # Build conversation context
        context = self._format_conversation_history()
        
        response = await self.generate(message, context=context)
        
        # Add response to history
        self._conversation_history.append(
            ConversationMessage(role="assistant", content=response.content)
        )
        
        return response.content
    
    async def detect_intent(self, text: str) -> Dict[str, Any]:
        """
        Detect the user's intent from their input.
        
        Args:
            text: User input
            
        Returns:
            Intent classification with confidence
        """
        prompt = f"""
        Clasifica la intención del siguiente mensaje de un ciudadano.
        
        Mensaje: "{text}"
        
        Responde en formato JSON con:
        - intent: tipo de intención (saludo, tramite, consulta, queja, despedida)
        - tramite_tipo: si es un trámite, qué tipo (cedula, licencia, acta)
        - confianza: nivel de confianza (alto, medio, bajo)
        - siguiente_accion: qué debe hacer el sistema
        """
        
        response = await self.generate(prompt)
        
        # Parse response or return simulated intent
        try:
            return json.loads(response.content)
        except json.JSONDecodeError:
            return self._detect_intent_simple(text)
    
    def clear_history(self):
        """Clear conversation history"""
        self._conversation_history = []
    
    def get_history(self) -> List[ConversationMessage]:
        """Get conversation history"""
        return self._conversation_history.copy()
    
    def set_system_prompt(self, prompt: str):
        """Set a custom system prompt"""
        self._system_prompt = prompt
    
    def _build_prompt(
        self,
        user_prompt: str,
        system_prompt: Optional[str],
        context: Optional[str]
    ) -> str:
        """Build the full prompt for the LLM"""
        parts = []
        
        if system_prompt or self._system_prompt:
            parts.append(system_prompt or self._system_prompt)
        
        if context:
            parts.append(f"Contexto:\n{context}")
        
        parts.append(f"Usuario: {user_prompt}")
        
        return "\n\n".join(parts)
    
    def _format_conversation_history(self) -> str:
        """Format conversation history for context"""
        if not self._conversation_history:
            return ""
        
        formatted = []
        for msg in self._conversation_history[-10:]:  # Last 10 messages
            role = "Usuario" if msg.role == "user" else "Asistente"
            formatted.append(f"{role}: {msg.content}")
        
        return "\n".join(formatted)
    
    def _generate_simulated_response(self, prompt: str) -> str:
        """Generate a simulated response for testing"""
        prompt_lower = prompt.lower()

        if any(w in prompt_lower for w in ["hola", "buenos", "saludos", "buenas"]):
            return (
                "¡Hola! 👋 Soy IDENTIA, su asistente de la Registraduía Nacional de Colombia.\n\n"
                "Estoy aquí para ayudarle con sus trámites de identidad y registro civil. "
                "¿En qué puedo servirle hoy?"
            )

        # Cédula de Ciudadanía
        if any(w in prompt_lower for w in ["cédula", "cedula", "primera vez", "sacar cédula"]):
            if "primera" in prompt_lower or "primera vez" in prompt_lower:
                return (
                    "¡Con gusto le ayudo a sacar su cédula por primera vez! 🇸\n\n"
                    "La buena noticia: este trámite es **completamente GRATUITO**.\n\n"
                    "📋 **Necesita:**\n"
                    "• Registro Civil de Nacimiento original\n"
                    "• Foto 3x4 fondo blanco\n"
                    "• Ser mayor de 18 años\n\n"
                    "¿Tiene estos documentos listos? Le ayudo a agendar su cita."
                )
            if "duplicado" in prompt_lower or "perdí" in prompt_lower or "perdi" in prompt_lower or "robo" in prompt_lower:
                return (
                    "Entiendo, necesita un duplicado de su cédula. 🔐\n\n"
                    "Para proteger su seguridad, este trámite requiere **verificación biométrica facial** obligatoria.\n\n"
                    "💰 **Costo:** $51.900 COP\n"
                    "⚠️ **Exonerados:** Víctimas del conflicto, adultos mayores vulnerables, personas con discapacidad.\n\n"
                    "¿Desea verificar si aplica para exoneración?"
                )
            if "renovar" in prompt_lower or "renovación" in prompt_lower or "vencida" in prompt_lower:
                return (
                    "¡Perfecto! La renovación de cédula es **completamente GRATUITA**. 🔄\n\n"
                    "📋 **Solo necesita:**\n"
                    "• Su cédula actual (aunque esté deteriorada o vencida)\n"
                    "• Foto 3x4 fondo blanco\n\n"
                    "⏱️ **Tiempo estimado:** 15 días hábiles\n\n"
                    "¿Desea que le agende una cita en la Registraduía más cercana?"
                )
            return (
                "🇸 Para su cédula de ciudadanía, ¿qué tipo de trámite necesita?\n\n"
                "• **Primera vez** (GRATUITA)\n"
                "• **Duplicado** por pérdida o hurto ($51.900)\n"
                "• **Rectificación** de datos (GRATUITA si el error es de la Registraduía)\n"
                "• **Renovación** (GRATUITA)\n\n"
                "¿Cuál de estas opciones necesita?"
            )

        # Tarjeta de Identidad
        if any(w in prompt_lower for w in ["tarjeta de identidad", "tarjeta identidad", "menor", "niño", "hijo"]):
            return (
                "👶 La Tarjeta de Identidad para menores es **completamente GRATUITA**.\n\n"
                "📋 **Necesita:**\n"
                "• Registro Civil de Nacimiento del menor\n"
                "• Cédula del padre, madre o acudiente\n"
                "• Foto 3x4 del menor\n\n"
                "ℹ️ Es para menores entre **7 y 17 años**.\n\n"
                "¿Cuántos años tiene el menor?"
            )

        # Registro Civil
        if any(w in prompt_lower for w in ["registro civil", "nacimiento", "acta de nacimiento"]):
            if "matrimonio" in prompt_lower or "casamiento" in prompt_lower:
                return (
                    "💍 **Copia de Registro Civil de Matrimonio**\n\n"
                    "💰 **Costo:** $6.900 COP\n"
                    "👥 **Exonerados:** Víctimas del conflicto armado\n\n"
                    "📋 **Necesita:**\n"
                    "• Su cédula de identidad\n"
                    "• Nombres completos de los contrayentes y fecha aproximada\n\n"
                    "🌐 También puede solicitarla en línea en registraduria.gov.co\n\n"
                    "¿Desea que le ayude a solicitarla?"
                )
            if "defunción" in prompt_lower or "defuncion" in prompt_lower or "fallecido" in prompt_lower:
                return (
                    "📜 **Copia de Registro Civil de Defunción**\n\n"
                    "💰 **Costo:** $6.900 COP\n"
                    "📋 **Necesita:**\n"
                    "• Su cédula de identidad\n"
                    "• Nombre completo del fallecido y fecha aproximada\n\n"
                    "¿Desea continuar con esta solicitud?"
                )
            return (
                "📜 **Registro Civil de Nacimiento**\n\n"
                "💰 **Inscripción:** GRATUITA (dentro de los primeros 30 días)\n"
                "💰 **Copia auténtica:** $6.900 COP\n\n"
                "¿Necesita inscribir un nacimiento o solicitar una copia del registro?"
            )

        # Apostilla
        if any(w in prompt_lower for w in ["apostilla", "exterior", "extranjero", "legalizar"]):
            return (
                "🌍 **Apostilla de Documentos**\n\n"
                "La apostilla es la legalización internacional según el Convenio de La Haya.\n\n"
                "💰 **Costo:** $51.900 COP\n"
                "🏢 **Solo en:** Registraduía Nacional — Sede Central (Bogotá)\n"
                "   O en línea: apostilla.registraduria.gov.co\n\n"
                "⏱️ **Tiempo:** 3-5 días hábiles\n\n"
                "¿Qué documento necesita apostillar?"
            )

        # Consulta de estado
        if any(w in prompt_lower for w in ["estado", "cómo va", "como va", "seguimiento", "radicado", "listo"]):
            return (
                "🔍 **Consulta de Estado de Trámite**\n\n"
                "Puedo consultar el estado de su documento.\n\n"
                "💳 Por favor indíqueme su **número de cédula** o el **número de radicado** "
                "que le dieron cuando inició el trámite."
            )

        # Tarifas y exoneraciones
        if any(w in prompt_lower for w in ["tarifa", "costo", "precio", "cuanto", "cuánto", "gratis", "gratuito", "exoneración", "exoneracion"]):
            return (
                "💰 **Tarifas Vigentes 2024 — Registraduía Nacional**\n\n"
                "🆓 **GRATUITOS:**\n"
                "• Cédula primera vez\n"
                "• Cédula renovación\n"
                "• Tarjeta de Identidad\n"
                "• Inscripción de nacimiento\n\n"
                "💳 **Con costo:**\n"
                "• Duplicado cédula: $51.900 COP\n"
                "• Copias registro civil: $6.900 COP\n"
                "• Apostilla: $51.900 COP\n\n"
                "⚠️ Víctimas del conflicto, adultos mayores vulnerables y personas con discapacidad "
                "pueden estar **exonerados**. ¿Desea verificar si aplica?"
            )

        # Citas
        if any(w in prompt_lower for w in ["cita", "agendar", "turno", "oficina", "sede"]):
            return (
                "📅 **Agendamiento de Citas**\n\n"
                "Puedo ayudarle a agendar una cita en la Registraduía más cercana.\n\n"
                "🏢 **Ciudades disponibles:** Bogotá, Medellín, Cali, Barranquilla y más.\n\n"
                "¿En qué ciudad se encuentra usted?"
            )

        return (
            "Entiendo que necesita ayuda. 😊\n\n"
            "Puedo ayudarle con los servicios de la Registraduía Nacional:\n"
            "• 🇸 Cédula de Ciudadanía\n"
            "• 👶 Tarjeta de Identidad\n"
            "• 📜 Registro Civil (nacimiento, matrimonio, defunción)\n"
            "• 🌍 Apostilla de documentos\n"
            "• 🔍 Consulta de estado de trámite\n"
            "• 📅 Agendar cita\n"
            "• 💰 Tarifas y exoneraciones\n\n"
            "¿Cuál de estos servicios necesita?"
        )
    
    def _detect_intent_simple(self, text: str) -> Dict[str, Any]:
        """Simple rule-based intent detection for Registraduía services"""
        text_lower = text.lower()

        if any(w in text_lower for w in ["hola", "buenos", "saludos", "buenas"]):
            return {"intent": "saludo", "tramite_tipo": None, "confianza": "alto", "siguiente_accion": "saludar"}

        # Cédula
        if any(w in text_lower for w in ["cédula", "cedula"]):
            if any(w in text_lower for w in ["primera vez", "primera", "sacar", "expedir"]):
                return {"intent": "tramite", "tramite_tipo": "cedula_primera_vez", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}
            if any(w in text_lower for w in ["duplicado", "perdí", "perdi", "robo", "robaron", "deteriorada"]):
                return {"intent": "tramite", "tramite_tipo": "cedula_duplicado", "confianza": "alto", "siguiente_accion": "iniciar_tramite_biometrico"}
            if any(w in text_lower for w in ["rectificar", "rectificación", "corregir", "error"]):
                return {"intent": "tramite", "tramite_tipo": "cedula_rectificacion", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}
            if any(w in text_lower for w in ["renovar", "renovación", "vencida", "actualizar"]):
                return {"intent": "tramite", "tramite_tipo": "cedula_renovacion", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}
            return {"intent": "tramite", "tramite_tipo": "cedula", "confianza": "medio", "siguiente_accion": "preguntar_tipo_cedula"}

        # Tarjeta de Identidad
        if any(w in text_lower for w in ["tarjeta de identidad", "tarjeta identidad", "menor", "niño"]):
            return {"intent": "tramite", "tramite_tipo": "tarjeta_identidad", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}

        # Registro Civil
        if any(w in text_lower for w in ["registro civil", "nacimiento", "acta"]):
            if "matrimonio" in text_lower or "casamiento" in text_lower:
                return {"intent": "tramite", "tramite_tipo": "copia_registro_matrimonio", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}
            if any(w in text_lower for w in ["defunción", "defuncion", "fallecido", "muerte"]):
                return {"intent": "tramite", "tramite_tipo": "copia_registro_defuncion", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}
            if "inscribir" in text_lower or "inscripción" in text_lower:
                return {"intent": "tramite", "tramite_tipo": "inscripcion_nacimiento", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}
            return {"intent": "tramite", "tramite_tipo": "copia_registro_nacimiento", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}

        # Apostilla
        if any(w in text_lower for w in ["apostilla", "exterior", "extranjero", "legalizar"]):
            return {"intent": "tramite", "tramite_tipo": "apostilla", "confianza": "alto", "siguiente_accion": "iniciar_tramite"}

        # Consultas
        if any(w in text_lower for w in ["estado", "cómo va", "como va", "seguimiento", "radicado"]):
            return {"intent": "consulta", "tramite_tipo": "estado_documento", "confianza": "alto", "siguiente_accion": "consultar_estado"}

        if any(w in text_lower for w in ["oficina", "sede", "dónde", "donde", "dirección"]):
            return {"intent": "consulta", "tramite_tipo": "oficinas", "confianza": "alto", "siguiente_accion": "mostrar_oficinas"}

        # Tarifas
        if any(w in text_lower for w in ["tarifa", "costo", "precio", "cuánto", "cuanto", "gratis", "exoneración"]):
            return {"intent": "consulta", "tramite_tipo": "tarifas", "confianza": "alto", "siguiente_accion": "mostrar_tarifas"}

        # Citas
        if any(w in text_lower for w in ["cita", "agendar", "turno", "reservar"]):
            return {"intent": "tramite", "tramite_tipo": "agendar_cita", "confianza": "alto", "siguiente_accion": "agendar_cita"}

        # Ayuda
        if any(w in text_lower for w in ["ayuda", "help", "no entiendo", "no sé"]):
            return {"intent": "ayuda", "tramite_tipo": None, "confianza": "alto", "siguiente_accion": "mostrar_opciones"}

        return {"intent": "consulta", "tramite_tipo": None, "confianza": "bajo", "siguiente_accion": "clarificar"}


# Export the system prompt for use elsewhere
def get_system_prompt() -> str:
    """Get the citizen-facing system prompt"""
    return CITIZEN_AGENT_SYSTEM_PROMPT
