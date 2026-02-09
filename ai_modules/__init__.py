# IDENTIA AI Modules
# Multimodal processing for OCR, biometrics, and voice

from .multimodal_processor import MultimodalProcessor
from .voice_module import VoiceModule, speak, listen
from .llm_client import LLMClient

__all__ = [
    "MultimodalProcessor",
    "VoiceModule",
    "speak",
    "listen",
    "LLMClient"
]
