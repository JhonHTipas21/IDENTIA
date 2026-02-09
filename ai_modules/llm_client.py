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
Eres IDENTIA, un asistente virtual amable y paciente del gobierno dominicano. Tu propósito es ayudar a los ciudadanos con sus trámites gubernamentales.

## Tu Personalidad:
- Eres EXTREMADAMENTE paciente y comprensivo
- Usas un lenguaje SENCILLO, nunca técnico
- Tratas a todos con respeto y dignidad
- Celebras los logros del ciudadano ("¡Muy bien!", "¡Perfecto!")
- Ofreces ayuda adicional sin que te la pidan

## Reglas de Comunicación:
1. SIEMPRE saluda de forma cálida
2. Explica cada paso uno a la vez
3. NUNCA uses jerga legal o técnica
4. Confirma que el ciudadano entendió antes de avanzar
5. Ofrece alternativas si algo no es claro
6. Usa emojis con moderación para hacer la conversación amigable

## Cómo Manejar Situaciones:
- Si el ciudadano está confundido: "No se preocupe, le explico de otra manera..."
- Si hay un error: "Disculpe la molestia, vamos a solucionarlo juntos..."
- Si necesita esperar: "Esto tomará un momento, pero ya casi terminamos..."
- Si completó algo: "¡Excelente! Ha completado este paso perfectamente."

## Trámites que Puedes Ayudar:
- Renovación de Cédula
- Actas de Nacimiento
- Licencia de Conducir
- Consulta de estado de trámites
- Información sobre requisitos

## Restricciones:
- NUNCA pidas información sensible que no sea necesaria
- NUNCA compartas información de otros ciudadanos
- SIEMPRE recuerda que la privacidad es primordial
- Si no puedes ayudar, indica amablemente cómo obtener ayuda humana

Responde siempre en español dominicano, de forma natural y cálida.
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
        
        if any(word in prompt_lower for word in ["hola", "buenos", "saludos"]):
            return (
                "¡Hola! 👋 Soy IDENTIA, su asistente del gobierno.\n\n"
                "Estoy aquí para ayudarle con sus trámites. "
                "¿En qué puedo servirle hoy?"
            )
        
        if "cédula" in prompt_lower or "cedula" in prompt_lower:
            return (
                "¡Con gusto le ayudo con su cédula! 🪪\n\n"
                "Para renovar su cédula necesita:\n"
                "• Su cédula anterior\n"
                "• Una foto reciente\n"
                "• El comprobante de pago\n\n"
                "¿Tiene estos documentos listos?"
            )
        
        if "licencia" in prompt_lower:
            return (
                "¡Perfecto! Le ayudo con su licencia de conducir. 🚗\n\n"
                "Para obtener o renovar su licencia necesita:\n"
                "• Cédula de identidad\n"
                "• Examen médico\n"
                "• Curso de conducción aprobado\n"
                "• Foto reciente\n\n"
                "¿Ya tiene el examen médico?"
            )
        
        return (
            "Entiendo que necesita ayuda. 😊\n\n"
            "Puedo ayudarle con:\n"
            "• Renovación de Cédula\n"
            "• Licencia de Conducir\n"
            "• Actas de Nacimiento\n\n"
            "¿Cuál de estos trámites necesita?"
        )
    
    def _detect_intent_simple(self, text: str) -> Dict[str, Any]:
        """Simple rule-based intent detection"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ["hola", "buenos", "saludos"]):
            return {
                "intent": "saludo",
                "tramite_tipo": None,
                "confianza": "alto",
                "siguiente_accion": "saludar"
            }
        
        if "cédula" in text_lower or "cedula" in text_lower:
            return {
                "intent": "tramite",
                "tramite_tipo": "cedula_renovation",
                "confianza": "alto",
                "siguiente_accion": "iniciar_tramite"
            }
        
        if "licencia" in text_lower:
            return {
                "intent": "tramite",
                "tramite_tipo": "licencia_conducir",
                "confianza": "alto",
                "siguiente_accion": "iniciar_tramite"
            }
        
        if any(word in text_lower for word in ["nacimiento", "acta"]):
            return {
                "intent": "tramite",
                "tramite_tipo": "acta_nacimiento",
                "confianza": "alto",
                "siguiente_accion": "iniciar_tramite"
            }
        
        return {
            "intent": "consulta",
            "tramite_tipo": None,
            "confianza": "bajo",
            "siguiente_accion": "clarificar"
        }


# Export the system prompt for use elsewhere
def get_system_prompt() -> str:
    """Get the citizen-facing system prompt"""
    return CITIZEN_AGENT_SYSTEM_PROMPT
