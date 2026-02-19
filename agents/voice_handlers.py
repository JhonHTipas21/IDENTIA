"""
agents/voice_handlers.py — IDENTIA v1.5
=========================================
Handlers de voz especializados por tipo de trámite.

Cada handler encapsula:
- El prompt TTS que se emite al usuario
- La validación del input de voz (STT)
- La extracción del dato relevante

Uso:
    from agents.voice_handlers import HANDLERS, MatrimonioVoiceHandler
    handler = HANDLERS.get('matrimonio')
    prompt = handler.get_prompt()
    numero = handler.extract_numero(texto_reconocido)
    valido = handler.validate_registro(numero)
"""

import re
from dataclasses import dataclass
from typing import Optional


# ─── Base Handler ─────────────────────────────────────────────────────────────

class BaseVoiceHandler:
    """Handler base para flujos de voz especializados."""

    def get_prompt(self) -> str:
        """Retorna el texto que debe pronunciar el TTS al activar el flujo."""
        raise NotImplementedError

    def validate(self, text: str) -> bool:
        """Valida si el texto reconocido contiene el dato esperado."""
        raise NotImplementedError

    def extract(self, text: str) -> Optional[str]:
        """Extrae el dato relevante del texto reconocido."""
        raise NotImplementedError

    def error_message(self) -> str:
        """Mensaje de error TTS cuando la validación falla."""
        raise NotImplementedError


# ─── Matrimonio Handler ───────────────────────────────────────────────────────

class MatrimonioVoiceHandler(BaseVoiceHandler):
    """
    Handler para el flujo de Registro de Matrimonio.

    Patrón de registro civil colombiano:
      - Formato largo:  XX-XXXX-XXXXXXX  (ej: 11-2023-1234567)
      - Formato corto:  7 a 11 dígitos consecutivos (ej: 11234567)

    Solo acepta inputs numéricos (o con guiones).
    """

    # Patrón oficial Registraduría Colombia
    PATRON_LARGO = re.compile(r'\b(\d{2})-(\d{4})-(\d{7})\b')
    PATRON_CORTO = re.compile(r'\b(\d{7,11})\b')

    def get_prompt(self) -> str:
        return (
            "Por favor, diga claramente el número de su registro de matrimonio. "
            "Por ejemplo: once guión dos mil veintitrés guión uno dos tres cuatro cinco seis siete."
        )

    def get_prompt_short(self) -> str:
        """Versión corta del prompt para reintentos."""
        return "Diga su número de registro de matrimonio."

    def validate_registro(self, text: str) -> bool:
        """
        Valida si el texto contiene un número de registro civil válido.

        Args:
            text: Texto transcrito por STT

        Returns:
            True si se encuentra un número válido
        """
        clean = self._clean(text)
        return bool(
            self.PATRON_LARGO.search(clean) or
            self.PATRON_CORTO.search(clean)
        )

    def validate(self, text: str) -> bool:
        return self.validate_registro(text)

    def extract_numero(self, text: str) -> Optional[str]:
        """
        Extrae el número de registro del texto reconocido.

        Prioriza el formato largo (XX-XXXX-XXXXXXX).
        Si no encuentra, retorna solo los dígitos.

        Args:
            text: Texto transcrito por STT

        Returns:
            Número de registro normalizado o None
        """
        clean = self._clean(text)

        # Intentar formato largo primero
        m = self.PATRON_LARGO.search(clean)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

        # Formato corto
        m = self.PATRON_CORTO.search(clean)
        if m:
            return m.group(1)

        return None

    def extract(self, text: str) -> Optional[str]:
        return self.extract_numero(text)

    def error_message(self) -> str:
        return (
            "No pude reconocer un número de registro válido. "
            "Por favor diga solo los números de su registro de matrimonio."
        )

    def _clean(self, text: str) -> str:
        """Normaliza el texto: convierte palabras numéricas básicas y elimina ruido."""
        t = text.lower().strip()

        # Reemplazos de palabras numéricas comunes en español
        reemplazos = {
            'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3',
            'cuatro': '4', 'cinco': '5', 'seis': '6', 'siete': '7',
            'ocho': '8', 'nueve': '9', 'guión': '-', 'guion': '-',
            'punto': '.', 'coma': ',',
        }
        for palabra, digito in reemplazos.items():
            t = t.replace(palabra, digito)

        # Eliminar espacios entre dígitos y guiones
        t = re.sub(r'(\d)\s+(-)\s+(\d)', r'\1\2\3', t)
        t = re.sub(r'(\d)\s+(\d)', r'\1\2', t)

        return t


# ─── Cédula Handler ───────────────────────────────────────────────────────────

class CedulaVoiceHandler(BaseVoiceHandler):
    """Handler para captura de número de cédula colombiana (6–10 dígitos)."""

    PATRON = re.compile(r'\b(\d{6,10})\b')

    def get_prompt(self) -> str:
        return "Por favor, diga su número de cédula de ciudadanía."

    def validate(self, text: str) -> bool:
        return bool(self.PATRON.search(re.sub(r'\s', '', text)))

    def extract(self, text: str) -> Optional[str]:
        m = self.PATRON.search(re.sub(r'\s', '', text))
        return m.group(1) if m else None

    def error_message(self) -> str:
        return "No pude reconocer su número de cédula. Por favor diga solo los números."


# ─── Registro de Nacimiento Handler ──────────────────────────────────────────

class NacimientoVoiceHandler(BaseVoiceHandler):
    """Handler para número de registro de nacimiento colombiano."""

    PATRON = re.compile(r'\b(\d{7,11})\b')

    def get_prompt(self) -> str:
        return "Por favor, diga el número de registro de nacimiento."

    def validate(self, text: str) -> bool:
        return bool(self.PATRON.search(text))

    def extract(self, text: str) -> Optional[str]:
        m = self.PATRON.search(text)
        return m.group(1) if m else None

    def error_message(self) -> str:
        return "No pude reconocer el número de registro. Por favor intente de nuevo."


# ─── Registro de Defunción Handler ───────────────────────────────────────────

class DefuncionVoiceHandler(BaseVoiceHandler):
    """Handler para número de registro de defunción colombiano."""

    PATRON = re.compile(r'\b(\d{7,11})\b')

    def get_prompt(self) -> str:
        return "Por favor, diga el número de registro de defunción."

    def validate(self, text: str) -> bool:
        return bool(self.PATRON.search(text))

    def extract(self, text: str) -> Optional[str]:
        m = self.PATRON.search(text)
        return m.group(1) if m else None

    def error_message(self) -> str:
        return "No pude reconocer el número de registro. Por favor intente de nuevo."


# ─── Registro de handlers ─────────────────────────────────────────────────────

HANDLERS: dict[str, BaseVoiceHandler] = {
    'matrimonio': MatrimonioVoiceHandler(),
    'cedula': CedulaVoiceHandler(),
    'nacimiento': NacimientoVoiceHandler(),
    'defuncion': DefuncionVoiceHandler(),
}


def get_handler(intent: str) -> Optional[BaseVoiceHandler]:
    """
    Retorna el handler de voz para un intent dado.

    Args:
        intent: Nombre del intent (ej: 'matrimonio', 'cedula')

    Returns:
        Handler correspondiente o None si no existe
    """
    return HANDLERS.get(intent.lower())
