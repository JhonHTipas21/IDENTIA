"""
IDENTIA - Tracking Service (PIN & Estado de Trámites)
======================================================
Genera PINs únicos de 6 dígitos por trámite y permite
consultar el estado en cualquier momento.

En producción, reemplazar el dict en memoria por una BD real (PostgreSQL/Redis).
"""

import random
import string
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum


class EstadoTramite(Enum):
    INICIADO        = "iniciado"
    IDENTIDAD_OK    = "identidad_verificada"
    DOCS_OK         = "documentos_revisados"
    EN_REVISION     = "en_revision_legal"
    CITA_AGENDADA   = "cita_agendada"
    LISTO           = "listo_para_recoger"
    ENTREGADO       = "entregado"
    RECHAZADO       = "rechazado"


# Mensajes amigables por estado
MENSAJES_ESTADO: Dict[str, str] = {
    EstadoTramite.INICIADO.value:       "Tu trámite fue recibido y está en espera de verificación de identidad.",
    EstadoTramite.IDENTIDAD_OK.value:   "Tu identidad fue verificada exitosamente. Estamos revisando tus documentos.",
    EstadoTramite.DOCS_OK.value:        "Tus documentos fueron revisados. Tu caso está en revisión legal.",
    EstadoTramite.EN_REVISION.value:    "Tu trámite está en revisión legal. Tiempo estimado: 3-5 días hábiles.",
    EstadoTramite.CITA_AGENDADA.value:  "¡Tu cita está agendada! Recuerda llevar los documentos originales.",
    EstadoTramite.LISTO.value:          "🎉 ¡Tu documento está LISTO para recoger! Visita la oficina con tu cédula.",
    EstadoTramite.ENTREGADO.value:      "Tu documento fue entregado exitosamente. ¡Gracias por usar IDENTIA!",
    EstadoTramite.RECHAZADO.value:      "Tu trámite fue rechazado. Por favor visita la oficina para más información.",
}

# Almacenamiento en memoria (reemplazar con BD en producción)
_tramites_db: Dict[str, Dict[str, Any]] = {}


def generar_pin() -> str:
    """
    Genera un PIN único de 6 caracteres alfanumérico (mayúsculas + dígitos).
    Ejemplo: A3K7P2
    """
    caracteres = string.ascii_uppercase + string.digits
    # Excluir caracteres confusos: O, 0, I, 1
    caracteres = ''.join(c for c in caracteres if c not in 'O0I1')

    while True:
        pin = ''.join(random.choices(caracteres, k=6))
        if pin not in _tramites_db:
            return pin


def crear_tramite(
    tipo: str,
    datos_ciudadano: Dict[str, Any],
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Crea un nuevo trámite y retorna el PIN generado.

    Args:
        tipo: Tipo de trámite (ej: 'cedula_duplicado', 'registro_civil_matrimonio')
        datos_ciudadano: Datos básicos del ciudadano
        session_id: ID de sesión del frontend

    Returns:
        dict con pin, radicado, estado y timestamp
    """
    pin = generar_pin()
    radicado = f"IDENTIA-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

    tramite = {
        "pin": pin,
        "radicado": radicado,
        "tipo": tipo,
        "tipo_legible": _tipo_legible(tipo),
        "ciudadano": {
            "nombre": datos_ciudadano.get("nombre", "Ciudadano"),
            "cedula_anonimizada": _anonimizar_cedula(datos_ciudadano.get("cedula", "")),
        },
        "estado": EstadoTramite.INICIADO.value,
        "historial": [
            {
                "estado": EstadoTramite.INICIADO.value,
                "timestamp": datetime.now().isoformat(),
                "nota": "Trámite iniciado desde IDENTIA"
            }
        ],
        "cita": None,
        "session_id": session_id,
        "creado_en": datetime.now().isoformat(),
        "actualizado_en": datetime.now().isoformat(),
    }

    _tramites_db[pin] = tramite
    return {
        "pin": pin,
        "radicado": radicado,
        "estado": tramite["estado"],
        "tipo": tramite["tipo_legible"],
        "mensaje": f"✅ Trámite iniciado. Su PIN de seguimiento es: **{pin}**\n\nGuárdelo para consultar el estado de su trámite en cualquier momento.",
        "creado_en": tramite["creado_en"],
    }


def consultar_estado_pin(pin: str) -> Dict[str, Any]:
    """
    Consulta el estado de un trámite por su PIN.

    Returns:
        dict con estado, historial y mensaje amigable
    """
    pin = pin.upper().strip()
    tramite = _tramites_db.get(pin)

    if not tramite:
        return {
            "encontrado": False,
            "mensaje": (
                f"No encontré ningún trámite con el PIN **{pin}**. "
                f"Por favor verifique que el PIN sea correcto (6 caracteres, ej: A3K7P2). "
                f"Si necesita ayuda, llame al 01 8000 111 555."
            )
        }

    estado = tramite["estado"]
    mensaje_estado = MENSAJES_ESTADO.get(estado, "Estado en proceso.")

    # Calcular progreso
    estados_orden = [e.value for e in EstadoTramite]
    idx_actual = estados_orden.index(estado) if estado in estados_orden else 0
    porcentaje = round((idx_actual / (len(estados_orden) - 2)) * 100)  # -2 para excluir RECHAZADO

    return {
        "encontrado": True,
        "pin": pin,
        "radicado": tramite["radicado"],
        "tipo": tramite["tipo_legible"],
        "estado": estado,
        "porcentaje": min(porcentaje, 100),
        "mensaje": (
            f"📋 **Estado de su trámite de {tramite['tipo_legible']}**\n\n"
            f"📌 PIN: `{pin}` | Radicado: `{tramite['radicado']}`\n\n"
            f"🔄 **Estado actual:** {mensaje_estado}\n\n"
            f"📊 **Progreso:** {min(porcentaje, 100)}%"
        ),
        "cita": tramite.get("cita"),
        "historial": tramite["historial"][-3:],  # Últimos 3 eventos
        "actualizado_en": tramite["actualizado_en"],
    }


def actualizar_estado(
    pin: str,
    nuevo_estado: str,
    nota: Optional[str] = None,
    datos_cita: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Actualiza el estado de un trámite.

    Returns:
        True si se actualizó, False si el PIN no existe
    """
    pin = pin.upper().strip()
    tramite = _tramites_db.get(pin)
    if not tramite:
        return False

    tramite["estado"] = nuevo_estado
    tramite["actualizado_en"] = datetime.now().isoformat()
    tramite["historial"].append({
        "estado": nuevo_estado,
        "timestamp": datetime.now().isoformat(),
        "nota": nota or f"Estado actualizado a: {nuevo_estado}"
    })

    if datos_cita:
        tramite["cita"] = datos_cita

    return True


def listar_tramites_activos() -> list:
    """Retorna lista de trámites activos (para administración)"""
    return [
        {
            "pin": t["pin"],
            "tipo": t["tipo_legible"],
            "estado": t["estado"],
            "ciudadano": t["ciudadano"]["nombre"],
            "creado_en": t["creado_en"],
        }
        for t in _tramites_db.values()
        if t["estado"] not in [EstadoTramite.ENTREGADO.value, EstadoTramite.RECHAZADO.value]
    ]


# ─── Helpers privados ────────────────────────────────────────────────────────

def _tipo_legible(tipo: str) -> str:
    """Convierte el ID del tipo a texto legible"""
    mapa = {
        "cedula_primera_vez":       "Cédula de Ciudadanía — Primera Vez",
        "cedula_duplicado":         "Cédula de Ciudadanía — Duplicado",
        "cedula_rectificacion":     "Cédula de Ciudadanía — Rectificación",
        "cedula_renovacion":        "Cédula de Ciudadanía — Renovación",
        "tarjeta_identidad":        "Tarjeta de Identidad",
        "inscripcion_nacimiento":   "Registro Civil — Inscripción de Nacimiento",
        "copia_nacimiento":         "Registro Civil — Copia de Nacimiento",
        "copia_matrimonio":         "Registro Civil — Copia de Matrimonio",
        "copia_defuncion":          "Registro Civil — Copia de Defunción",
        "apostilla":                "Apostilla de Documentos",
        "agendar_cita":             "Agendamiento de Cita",
        "estado_documento":         "Consulta de Estado",
    }
    return mapa.get(tipo, tipo.replace("_", " ").title())


def _anonimizar_cedula(cedula: str) -> str:
    """Anonimiza la cédula para almacenamiento seguro"""
    if not cedula or len(cedula) < 4:
        return "***"
    return f"***{cedula[-4:]}"
