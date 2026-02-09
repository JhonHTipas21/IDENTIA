"""
IDENTIA - Voice Module
=======================
Provides speech synthesis (TTS) and speech recognition (STT)
for accessible citizen interaction.

Features:
- Text-to-Speech for audio responses
- Speech-to-Text for voice input
- Language detection
- Accessibility-optimized speaking rates
"""

from dataclasses import dataclass
from typing import Optional, Callable, Dict, Any, List
from enum import Enum
import asyncio
import base64

# Note: In production, these would be real imports:
# import pyttsx3
# import speech_recognition as sr


class SpeakingRate(Enum):
    """Speaking rate presets"""
    SLOW = 120      # For elderly or hearing-impaired
    NORMAL = 150    # Default rate
    FAST = 180      # For experienced users


class VoiceGender(Enum):
    """Voice gender options"""
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"


@dataclass
class SpeechConfig:
    """Configuration for speech synthesis"""
    rate: SpeakingRate = SpeakingRate.NORMAL
    volume: float = 1.0  # 0.0 to 1.0
    voice_gender: VoiceGender = VoiceGender.FEMALE
    language: str = "es-DO"  # Dominican Spanish


@dataclass
class RecognitionResult:
    """Result from speech recognition"""
    text: str
    confidence: float
    language: str
    alternatives: List[str]
    is_final: bool


class VoiceModule:
    """
    Voice interaction module for IDENTIA.
    
    Provides accessible voice input/output for citizens
    who prefer or require voice-based interaction.
    """
    
    # Common phrases for government procedures
    COMMON_PHRASES = [
        "renovar cédula",
        "licencia de conducir", 
        "acta de nacimiento",
        "cita",
        "requisitos",
        "estado del trámite"
    ]
    
    def __init__(self, config: Optional[SpeechConfig] = None):
        """
        Initialize the voice module.
        
        Args:
            config: Speech configuration options
        """
        self.config = config or SpeechConfig()
        self._tts_engine = None
        self._recognizer = None
        self._is_listening = False
        self._initialize_engines()
    
    def _initialize_engines(self):
        """Initialize TTS and STT engines"""
        # In production:
        # self._tts_engine = pyttsx3.init()
        # self._recognizer = sr.Recognizer()
        pass
    
    async def speak(
        self, 
        text: str,
        wait: bool = True,
        callback: Optional[Callable] = None
    ) -> Optional[bytes]:
        """
        Convert text to speech.
        
        Args:
            text: Text to speak
            wait: Whether to wait for speech to complete
            callback: Optional callback when speech completes
            
        Returns:
            Audio data as bytes (for web playback)
        """
        # Clean text for speech
        clean_text = self._prepare_text_for_speech(text)
        
        # In production, this would use the TTS engine:
        # self._tts_engine.setProperty('rate', self.config.rate.value)
        # self._tts_engine.setProperty('volume', self.config.volume)
        # self._tts_engine.say(clean_text)
        # if wait:
        #     self._tts_engine.runAndWait()
        
        # Simulate TTS by returning audio placeholder
        audio_data = self._generate_audio_placeholder(clean_text)
        
        if callback:
            callback()
        
        return audio_data
    
    async def listen(
        self,
        timeout: float = 10.0,
        phrase_time_limit: float = 15.0
    ) -> RecognitionResult:
        """
        Listen for speech input.
        
        Args:
            timeout: Maximum seconds to wait for speech to start
            phrase_time_limit: Maximum seconds for the phrase
            
        Returns:
            RecognitionResult with transcribed text
        """
        self._is_listening = True
        
        # In production:
        # with sr.Microphone() as source:
        #     self._recognizer.adjust_for_ambient_noise(source)
        #     audio = self._recognizer.listen(
        #         source, 
        #         timeout=timeout,
        #         phrase_time_limit=phrase_time_limit
        #     )
        #     result = self._recognizer.recognize_google(audio, language='es-DO')
        
        # Simulate listening
        await asyncio.sleep(0.5)  # Simulate processing time
        
        self._is_listening = False
        
        # Simulated result
        return RecognitionResult(
            text="quiero renovar mi cédula",
            confidence=0.95,
            language="es-DO",
            alternatives=["quiero renovar mi cedula", "quiero renovar la cédula"],
            is_final=True
        )
    
    async def listen_streaming(
        self,
        on_partial: Callable[[str], None],
        on_final: Callable[[RecognitionResult], None],
        timeout: float = 30.0
    ):
        """
        Stream speech recognition with real-time updates.
        
        Args:
            on_partial: Callback for partial transcription results
            on_final: Callback for final transcription
            timeout: Maximum listening time
        """
        self._is_listening = True
        
        # Simulate streaming recognition
        partial_results = [
            "quiero",
            "quiero renovar",
            "quiero renovar mi",
            "quiero renovar mi cédula"
        ]
        
        for partial in partial_results:
            await asyncio.sleep(0.3)
            on_partial(partial)
        
        final_result = RecognitionResult(
            text=partial_results[-1],
            confidence=0.95,
            language="es-DO",
            alternatives=[],
            is_final=True
        )
        
        on_final(final_result)
        self._is_listening = False
    
    def is_listening(self) -> bool:
        """Check if currently listening for input"""
        return self._is_listening
    
    def stop_listening(self):
        """Stop listening for input"""
        self._is_listening = False
    
    def set_rate(self, rate: SpeakingRate):
        """Change the speaking rate"""
        self.config.rate = rate
    
    def set_volume(self, volume: float):
        """Change the volume (0.0 to 1.0)"""
        self.config.volume = max(0.0, min(1.0, volume))
    
    def _prepare_text_for_speech(self, text: str) -> str:
        """Clean and prepare text for speech synthesis"""
        # Remove markdown/formatting
        clean = text
        clean = clean.replace("**", "")
        clean = clean.replace("##", "")
        clean = clean.replace("*", "")
        clean = clean.replace("•", "")
        clean = clean.replace("#", "")
        
        # Replace emojis with descriptions
        emoji_map = {
            "👋": "",
            "✅": "Listo, ",
            "⚠️": "Atención, ",
            "📄": "",
            "📋": "",
            "🎉": "¡Excelente! ",
            "📸": "",
            "🪪": "",
            "🚗": "",
            "📅": "",
            "🏢": "",
            "🕐": "",
            "🎫": "",
        }
        
        for emoji, replacement in emoji_map.items():
            clean = clean.replace(emoji, replacement)
        
        # Add natural pauses
        clean = clean.replace("\n\n", ". ")
        clean = clean.replace("\n", ", ")
        
        return clean.strip()
    
    def _generate_audio_placeholder(self, text: str) -> bytes:
        """Generate placeholder audio data"""
        # In production, this would return actual audio bytes
        # For now, return a placeholder
        return b"AUDIO_PLACEHOLDER_" + text[:50].encode()
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        return [
            "es-DO",  # Dominican Spanish
            "es-ES",  # Spain Spanish
            "es-MX",  # Mexican Spanish
            "en-US",  # US English
        ]


# Singleton instance for convenience
_voice_module: Optional[VoiceModule] = None


def get_voice_module() -> VoiceModule:
    """Get or create the voice module singleton"""
    global _voice_module
    if _voice_module is None:
        _voice_module = VoiceModule()
    return _voice_module


# Convenience functions
async def speak(text: str, wait: bool = True) -> Optional[bytes]:
    """
    Speak text aloud.
    
    Args:
        text: Text to speak
        wait: Whether to wait for completion
        
    Returns:
        Audio data bytes
    """
    module = get_voice_module()
    return await module.speak(text, wait)


async def listen(timeout: float = 10.0) -> RecognitionResult:
    """
    Listen for speech input.
    
    Args:
        timeout: Maximum seconds to wait
        
    Returns:
        Recognition result with transcribed text
    """
    module = get_voice_module()
    return await module.listen(timeout)


# Web Audio API integration for browser-based TTS
class WebSpeechSynthesis:
    """
    Web Speech API wrapper for browser-based TTS.
    Returns JavaScript code for client-side execution.
    """
    
    @staticmethod
    def generate_speak_script(text: str, config: SpeechConfig) -> str:
        """Generate JavaScript for Web Speech API"""
        rate_map = {
            SpeakingRate.SLOW: 0.8,
            SpeakingRate.NORMAL: 1.0,
            SpeakingRate.FAST: 1.2
        }
        
        rate = rate_map.get(config.rate, 1.0)
        
        return f"""
        const utterance = new SpeechSynthesisUtterance("{text}");
        utterance.lang = "{config.language}";
        utterance.rate = {rate};
        utterance.volume = {config.volume};
        speechSynthesis.speak(utterance);
        """
    
    @staticmethod
    def generate_listen_script() -> str:
        """Generate JavaScript for Web Speech Recognition API"""
        return """
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'es-DO';
        recognition.interimResults = true;
        recognition.continuous = false;
        
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            const isFinal = event.results[event.results.length - 1].isFinal;
            // Send to backend via WebSocket or callback
            handleSpeechResult(transcript, isFinal);
        };
        
        recognition.start();
        """
