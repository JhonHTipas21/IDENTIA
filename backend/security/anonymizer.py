"""
IDENTIA - PII Anonymization Module
===================================
Protects citizen data by anonymizing Personal Identifiable Information
before sending to external LLM services.

SECURITY RESTRICTION: Under no circumstances should PII leave the local
environment without being anonymized through this module.
"""

import re
import hashlib
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


class PIIType(Enum):
    """Types of Personal Identifiable Information"""
    CEDULA = "cedula"
    NAME = "name"
    EMAIL = "email"
    PHONE = "phone"
    ADDRESS = "address"
    DATE_OF_BIRTH = "date_of_birth"
    CREDIT_CARD = "credit_card"
    SSN = "ssn"


@dataclass
class DetectedPII:
    """Represents a detected PII entity"""
    pii_type: PIIType
    original_value: str
    start_pos: int
    end_pos: int
    confidence: float


@dataclass
class AnonymizationResult:
    """Result of anonymization process"""
    anonymized_text: str
    detected_entities: List[DetectedPII]
    mapping: Dict[str, str] = field(default_factory=dict)  # token -> original
    reverse_mapping: Dict[str, str] = field(default_factory=dict)  # original -> token


class PIIAnonymizer:
    """
    Handles detection and anonymization of Personal Identifiable Information.
    
    Features:
    - Pattern-based PII detection for common formats
    - Reversible anonymization for internal processing
    - Hash-based tokens for consistent replacement
    - Configurable entity types
    """
    
    # Common PII patterns (Spanish/Latin American formats)
    PATTERNS = {
        PIIType.CEDULA: [
            r'\b\d{3}-?\d{7}-?\d{1}\b',  # Dominican cedula
            r'\b\d{1,2}\.\d{3}\.\d{3}\b',  # Colombian cedula
            r'\b\d{8,11}\b',  # Generic ID number
        ],
        PIIType.EMAIL: [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        ],
        PIIType.PHONE: [
            r'\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
            r'\b\(\d{3}\)\s?\d{3}[-.\s]?\d{4}\b',
        ],
        PIIType.CREDIT_CARD: [
            r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
        ],
        PIIType.DATE_OF_BIRTH: [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',
        ],
    }
    
    # Common Spanish names for detection
    COMMON_NAMES = {
        "juan", "maría", "carlos", "ana", "josé", "pedro", "luis", 
        "carmen", "antonio", "rosa", "miguel", "sofia", "diego",
        "fernandez", "rodriguez", "martinez", "garcia", "lopez"
    }
    
    def __init__(self, salt: Optional[str] = None):
        """
        Initialize the anonymizer.
        
        Args:
            salt: Optional salt for hashing. If not provided, a random one is generated.
        """
        self.salt = salt or str(uuid.uuid4())
        self._session_mappings: Dict[str, AnonymizationResult] = {}
    
    def _generate_token(self, pii_type: PIIType, value: str) -> str:
        """Generate a consistent token for a PII value."""
        hash_input = f"{self.salt}:{pii_type.value}:{value}"
        hash_value = hashlib.sha256(hash_input.encode()).hexdigest()[:8]
        return f"[{pii_type.value.upper()}_{hash_value}]"
    
    def detect_pii(self, text: str) -> List[DetectedPII]:
        """
        Detect all PII entities in the given text.
        
        Args:
            text: Text to analyze for PII
            
        Returns:
            List of detected PII entities
        """
        detected: List[DetectedPII] = []
        
        # Pattern-based detection
        for pii_type, patterns in self.PATTERNS.items():
            for pattern in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    detected.append(DetectedPII(
                        pii_type=pii_type,
                        original_value=match.group(),
                        start_pos=match.start(),
                        end_pos=match.end(),
                        confidence=0.9
                    ))
        
        # Name detection (word-based)
        words = text.lower().split()
        for i, word in enumerate(words):
            clean_word = re.sub(r'[^\w]', '', word)
            if clean_word in self.COMMON_NAMES:
                # Find the actual position in original text
                pos = text.lower().find(clean_word)
                if pos != -1:
                    detected.append(DetectedPII(
                        pii_type=PIIType.NAME,
                        original_value=text[pos:pos+len(clean_word)],
                        start_pos=pos,
                        end_pos=pos + len(clean_word),
                        confidence=0.7
                    ))
        
        # Remove overlapping detections (keep highest confidence)
        detected = self._remove_overlaps(detected)
        
        return detected
    
    def _remove_overlaps(self, entities: List[DetectedPII]) -> List[DetectedPII]:
        """Remove overlapping detections, keeping the highest confidence one."""
        if not entities:
            return []
        
        # Sort by start position
        sorted_entities = sorted(entities, key=lambda x: (x.start_pos, -x.confidence))
        result = [sorted_entities[0]]
        
        for entity in sorted_entities[1:]:
            last = result[-1]
            if entity.start_pos >= last.end_pos:
                result.append(entity)
            elif entity.confidence > last.confidence:
                result[-1] = entity
        
        return result
    
    def anonymize(self, text: str, session_id: Optional[str] = None) -> AnonymizationResult:
        """
        Anonymize all PII in the given text.
        
        Args:
            text: Text to anonymize
            session_id: Optional session ID for tracking mappings
            
        Returns:
            AnonymizationResult with anonymized text and mappings
        """
        detected = self.detect_pii(text)
        
        if not detected:
            return AnonymizationResult(
                anonymized_text=text,
                detected_entities=[],
                mapping={},
                reverse_mapping={}
            )
        
        # Sort by position (reverse order for replacement)
        detected.sort(key=lambda x: x.start_pos, reverse=True)
        
        mapping: Dict[str, str] = {}
        reverse_mapping: Dict[str, str] = {}
        anonymized = text
        
        for entity in detected:
            token = self._generate_token(entity.pii_type, entity.original_value)
            anonymized = (
                anonymized[:entity.start_pos] + 
                token + 
                anonymized[entity.end_pos:]
            )
            mapping[token] = entity.original_value
            reverse_mapping[entity.original_value] = token
        
        result = AnonymizationResult(
            anonymized_text=anonymized,
            detected_entities=list(reversed(detected)),
            mapping=mapping,
            reverse_mapping=reverse_mapping
        )
        
        # Store session mapping if session_id provided
        if session_id:
            self._session_mappings[session_id] = result
        
        return result
    
    def deanonymize(self, text: str, mapping: Dict[str, str]) -> str:
        """
        Restore original PII values from anonymized text.
        
        Args:
            text: Anonymized text
            mapping: Token to original value mapping
            
        Returns:
            Text with original PII values restored
        """
        result = text
        for token, original in mapping.items():
            result = result.replace(token, original)
        return result
    
    def get_session_mapping(self, session_id: str) -> Optional[AnonymizationResult]:
        """Get the anonymization result for a session."""
        return self._session_mappings.get(session_id)
    
    def clear_session(self, session_id: str) -> bool:
        """Clear session mapping from memory."""
        if session_id in self._session_mappings:
            del self._session_mappings[session_id]
            return True
        return False


# Middleware helper for FastAPI
class AnonymizationMiddleware:
    """
    FastAPI middleware to automatically anonymize outgoing data.
    
    Usage:
        app.add_middleware(AnonymizationMiddleware)
    """
    
    def __init__(self, app, anonymizer: Optional[PIIAnonymizer] = None):
        self.app = app
        self.anonymizer = anonymizer or PIIAnonymizer()
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # For now, pass through - implement request/response interception
        await self.app(scope, receive, send)


# Example usage
if __name__ == "__main__":
    anonymizer = PIIAnonymizer()
    
    test_text = """
    Hola, mi nombre es Juan García y mi cédula es 001-1234567-8.
    Pueden contactarme al 809-555-1234 o al email juan.garcia@email.com.
    Mi fecha de nacimiento es 15/03/1985.
    """
    
    result = anonymizer.anonymize(test_text)
    
    print("Original:")
    print(test_text)
    print("\nAnonymized:")
    print(result.anonymized_text)
    print("\nDetected entities:")
    for entity in result.detected_entities:
        print(f"  - {entity.pii_type.value}: {entity.original_value}")
    print("\nMapping:")
    for token, original in result.mapping.items():
        print(f"  {token} -> {original}")
