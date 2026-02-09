# IDENTIA - Diagrama de Flujo Lógico

Este documento describe cómo viaja un dato desde que el ciudadano habla hasta que se guarda en la base de datos gubernamental.

---

## Flujo Principal de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE DATOS IDENTIA                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   👤 CIUDADANO                                                              │
│      │                                                                      │
│      │ 1. Habla: "Quiero renovar mi cédula"                                │
│      ▼                                                                      │
│   ┌──────────────────┐                                                      │
│   │  🎤 MICRÓFONO    │ Captura audio                                        │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │  🔊 STT Module   │ Speech-to-Text                                       │
│   │  (voice_module)  │ "Quiero renovar mi cédula" → texto                  │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │  🔒 ANONIMIZADOR │ Detecta y enmascara PII                              │
│   │  (anonymizer.py) │ "cedula 001-1234567-8" → "[CEDULA_abc123]"          │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            │  ⚠️ SOLO DATOS ANONIMIZADOS SALEN DEL ENTORNO LOCAL           │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │  🧠 LLM Client   │ Procesa con IA (131K tokens)                        │
│   │  (Gemini/GPT)    │ Analiza intención, genera respuesta                 │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │  🔄 ORQUESTADOR  │ LangGraph Workflow                                   │
│   │  (workflow.py)   │ Coordina agentes especializados                     │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│      ┌─────┴─────┬─────────────┐                                           │
│      ▼           ▼             ▼                                           │
│   ┌──────┐   ┌──────┐     ┌──────┐                                         │
│   │VALID.│   │LEGAL │     │GESTOR│  ← Agentes especializados               │
│   │Agent │   │Agent │     │Agent │                                         │
│   └──┬───┘   └──┬───┘     └──┬───┘                                         │
│      │          │            │                                              │
│      └──────────┴────────────┘                                              │
│                 │                                                           │
│                 ▼                                                           │
│   ┌──────────────────┐                                                      │
│   │  🔓 RE-IDENTIFICAR│ Restaura PII para almacenamiento                   │
│   │  (deanonymize)   │ "[CEDULA_abc123]" → "001-1234567-8"                 │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │  🗄️ BASE DE DATOS │ Almacenamiento seguro                              │
│   │  (Gov Database)  │ Datos completos + cifrados                          │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────┐                                                      │
│   │  🔊 TTS Module   │ Text-to-Speech                                       │
│   │  (voice_module)  │ Respuesta → audio                                   │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   👤 CIUDADANO escucha: "¡Perfecto! Para renovar su cédula..."             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detalle de Cada Paso

### 1. Entrada del Ciudadano
| Componente | Archivo | Función |
|------------|---------|---------|
| Web UI | `frontend/src/App.jsx` | Interfaz accesible |
| Micrófono | `MicrophoneButton.jsx` | Captura de audio |
| Cámara | `CameraViewer.jsx` | Escaneo de documentos |

### 2. Procesamiento de Voz
| Componente | Archivo | Función |
|------------|---------|---------|
| STT | `ai_modules/voice_module.py` | `listen()` - convierte audio a texto |
| TTS | `ai_modules/voice_module.py` | `speak()` - convierte texto a audio |

### 3. Seguridad PII
| Componente | Archivo | Función |
|------------|---------|---------|
| Detector | `backend/security/anonymizer.py` | `detect_pii()` - encuentra datos sensibles |
| Anonimizador | `backend/security/anonymizer.py` | `anonymize()` - enmascara PII |
| Re-identificador | `backend/security/anonymizer.py` | `deanonymize()` - restaura para DB |

### 4. Procesamiento IA
| Componente | Archivo | Función |
|------------|---------|---------|
| LLM Client | `ai_modules/llm_client.py` | Análisis con 131K contexto |
| OCR | `ai_modules/multimodal_processor.py` | Extracción de documentos |
| Caras | `ai_modules/multimodal_processor.py` | Verificación biométrica |

### 5. Orquestación
| Componente | Archivo | Función |
|------------|---------|---------|
| Workflow | `backend/orchestration/workflow.py` | Estado del trámite |
| ValidatorAgent | `backend/orchestration/agents.py` | Valida documentos |
| LegalAgent | `backend/orchestration/agents.py` | Analiza requisitos legales |
| GestorAgent | `backend/orchestration/agents.py` | Agenda citas |

---

## Restricción de Seguridad

> 🔒 **IMPORTANTE**: Bajo ninguna circunstancia los datos personales identificables (PII) pueden salir del entorno local sin ser anonimizados por el módulo de seguridad.

```python
# Ejemplo de flujo de anonimización
texto_ciudadano = "Mi cédula es 001-1234567-8"

# Antes de enviar a LLM
resultado = anonymizer.anonymize(texto_ciudadano)
# → "Mi cédula es [CEDULA_a1b2c3]"

# Después de recibir respuesta
respuesta_segura = anonymizer.deanonymize(respuesta_llm, resultado.mapping)
# → Restaura para guardar en DB gubernamental
```
