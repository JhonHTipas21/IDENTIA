"""
IDENTIA - Google Calendar Integration Service
==============================================
Agenda citas automáticamente en Google Calendar con el formato:
  [IDENTIA] Cita de {Tipo_Tramite} - {Nombre_Ciudadano}

Configuración:
  1. Descargue credentials.json desde Google Cloud Console
  2. Colóquelo en backend/config/credentials.json
  3. En el primer uso, se abrirá el flujo OAuth2 para autorizar

Si no hay credenciales, el servicio opera en modo SIMULADO (para desarrollo).
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import uuid


# ─── Configuración ────────────────────────────────────────────────────────────

CREDENTIALS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "config", "credentials.json"
)
TOKEN_PATH = os.path.join(
    os.path.dirname(__file__), "..", "config", "token.json"
)

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

# Zona horaria de Colombia
TIMEZONE = "America/Bogota"

# Horarios disponibles (8AM - 4PM, slots de 1 hora)
SLOTS_DISPONIBLES = [
    "08:00", "09:00", "10:00", "11:00",
    "14:00", "15:00", "16:00"
]


# ─── Función principal ────────────────────────────────────────────────────────

def agendar_cita_calendar(
    tipo_tramite: str,
    nombre_ciudadano: str,
    fecha: str,          # formato: YYYY-MM-DD
    hora: str,           # formato: HH:MM
    oficina: Optional[str] = "Registraduría Nacional — Sede Central",
    email_ciudadano: Optional[str] = None,
    pin_tramite: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Agenda una cita en Google Calendar.

    Args:
        tipo_tramite: Tipo de trámite (ej: 'Cédula — Duplicado')
        nombre_ciudadano: Nombre completo del ciudadano
        fecha: Fecha en formato YYYY-MM-DD
        hora: Hora en formato HH:MM
        oficina: Nombre de la oficina
        email_ciudadano: Email para invitación (opcional)
        pin_tramite: PIN del trámite para incluir en descripción

    Returns:
        dict con confirmación, event_link, y detalles de la cita
    """
    # Intentar con Google Calendar real
    if _tiene_credenciales():
        try:
            return _agendar_google_calendar(
                tipo_tramite, nombre_ciudadano, fecha, hora,
                oficina, email_ciudadano, pin_tramite
            )
        except Exception as e:
            print(f"[CalendarService] Error Google Calendar: {e}. Usando modo simulado.")

    # Fallback: modo simulado
    return _agendar_simulado(
        tipo_tramite, nombre_ciudadano, fecha, hora,
        oficina, email_ciudadano, pin_tramite
    )


def obtener_slots_disponibles(fecha: str, ciudad: str = "Bogotá") -> Dict[str, Any]:
    """
    Retorna los slots de tiempo disponibles para una fecha dada.
    En producción, consultaría la disponibilidad real del calendario.
    """
    # Verificar que la fecha sea un día hábil
    fecha_dt = datetime.strptime(fecha, "%Y-%m-%d")
    if fecha_dt.weekday() >= 5:  # Sábado o domingo
        return {
            "disponible": False,
            "mensaje": "No hay atención los fines de semana. Por favor seleccione un día hábil (lunes a viernes).",
            "slots": []
        }

    # Simular algunos slots ocupados
    import random
    random.seed(fecha)  # Seed con la fecha para consistencia
    slots_ocupados = random.sample(SLOTS_DISPONIBLES, k=min(2, len(SLOTS_DISPONIBLES)))
    slots_libres = [s for s in SLOTS_DISPONIBLES if s not in slots_ocupados]

    return {
        "disponible": True,
        "fecha": fecha,
        "ciudad": ciudad,
        "slots": slots_libres,
        "mensaje": f"Hay {len(slots_libres)} horarios disponibles para el {_fecha_legible(fecha)}."
    }


def cancelar_cita(event_id: str) -> Dict[str, Any]:
    """Cancela una cita existente en Google Calendar"""
    if _tiene_credenciales():
        try:
            service = _get_calendar_service()
            service.events().delete(calendarId='primary', eventId=event_id).execute()
            return {"exito": True, "mensaje": "Cita cancelada exitosamente."}
        except Exception as e:
            print(f"[CalendarService] Error cancelando: {e}")

    return {
        "exito": True,
        "mensaje": "Cita cancelada (modo simulado).",
        "event_id": event_id
    }


# ─── Google Calendar Real ─────────────────────────────────────────────────────

def _tiene_credenciales() -> bool:
    """Verifica si existen credenciales de Google Calendar"""
    return os.path.exists(CREDENTIALS_PATH)


def _get_calendar_service():
    """Obtiene el servicio autenticado de Google Calendar"""
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build

        creds = None

        # Cargar token existente
        if os.path.exists(TOKEN_PATH):
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

        # Renovar o crear token
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
                creds = flow.run_local_server(port=0)

            # Guardar token
            os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
            with open(TOKEN_PATH, 'w') as token:
                token.write(creds.to_json())

        return build('calendar', 'v3', credentials=creds)

    except ImportError:
        raise RuntimeError(
            "Instale las dependencias: pip install google-auth google-auth-oauthlib google-api-python-client"
        )


def _agendar_google_calendar(
    tipo_tramite, nombre_ciudadano, fecha, hora,
    oficina, email_ciudadano, pin_tramite
) -> Dict[str, Any]:
    """Agenda la cita en Google Calendar real"""
    service = _get_calendar_service()

    # Construir datetime de inicio y fin (1 hora de duración)
    inicio_str = f"{fecha}T{hora}:00"
    inicio_dt = datetime.strptime(inicio_str, "%Y-%m-%dT%H:%M:%S")
    fin_dt = inicio_dt + timedelta(hours=1)

    titulo = f"[IDENTIA] Cita de {tipo_tramite} - {nombre_ciudadano}"

    descripcion = (
        f"Cita agendada a través de IDENTIA — Registraduría Nacional de Colombia\n\n"
        f"📋 Trámite: {tipo_tramite}\n"
        f"👤 Ciudadano: {nombre_ciudadano}\n"
        f"🏢 Oficina: {oficina}\n"
    )
    if pin_tramite:
        descripcion += f"📌 PIN de seguimiento: {pin_tramite}\n"
    descripcion += "\n⚠️ Recuerde llevar su cédula original y todos los documentos del trámite."

    evento = {
        "summary": titulo,
        "location": oficina,
        "description": descripcion,
        "start": {
            "dateTime": inicio_dt.isoformat(),
            "timeZone": TIMEZONE,
        },
        "end": {
            "dateTime": fin_dt.isoformat(),
            "timeZone": TIMEZONE,
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 24 * 60},  # 1 día antes
                {"method": "popup", "minutes": 60},        # 1 hora antes
            ],
        },
    }

    # Agregar invitado si hay email
    if email_ciudadano:
        evento["attendees"] = [{"email": email_ciudadano}]

    result = service.events().insert(calendarId='primary', body=evento).execute()

    return {
        "exito": True,
        "event_id": result.get("id"),
        "event_link": result.get("htmlLink"),
        "titulo": titulo,
        "fecha": fecha,
        "hora": hora,
        "oficina": oficina,
        "duracion": "1 hora",
        "modo": "google_calendar",
        "mensaje": (
            f"📅 **¡Cita agendada en Google Calendar!**\n\n"
            f"📋 **{titulo}**\n"
            f"📆 **Fecha:** {_fecha_legible(fecha)}\n"
            f"🕐 **Hora:** {hora}\n"
            f"🏢 **Oficina:** {oficina}\n\n"
            f"✉️ Recibirá un recordatorio por email 24 horas antes.\n"
            f"🔗 [Ver en Google Calendar]({result.get('htmlLink')})"
        )
    }


# ─── Modo Simulado ────────────────────────────────────────────────────────────

def _agendar_simulado(
    tipo_tramite, nombre_ciudadano, fecha, hora,
    oficina, email_ciudadano, pin_tramite
) -> Dict[str, Any]:
    """Simula el agendamiento cuando no hay credenciales de Google"""
    event_id = f"IDENTIA-{str(uuid.uuid4())[:8].upper()}"
    titulo = f"[IDENTIA] Cita de {tipo_tramite} - {nombre_ciudadano}"

    return {
        "exito": True,
        "event_id": event_id,
        "event_link": None,
        "titulo": titulo,
        "fecha": fecha,
        "hora": hora,
        "oficina": oficina,
        "duracion": "1 hora",
        "modo": "simulado",
        "mensaje": (
            f"📅 **¡Cita confirmada!**\n\n"
            f"📋 **{titulo}**\n"
            f"📆 **Fecha:** {_fecha_legible(fecha)}\n"
            f"🕐 **Hora:** {hora}\n"
            f"🏢 **Oficina:** {oficina}\n\n"
            f"🎫 **Código de confirmación:** `{event_id}`\n\n"
            f"⚠️ **Recuerde llevar:**\n"
            f"   • Cédula de identidad original\n"
            f"   • Todos los documentos del trámite\n"
            f"   • Este código de confirmación\n\n"
            f"📞 Para cancelar o reprogramar: 01 8000 111 555"
        )
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _fecha_legible(fecha: str) -> str:
    """Convierte YYYY-MM-DD a 'lunes 18 de febrero de 2026'"""
    try:
        dt = datetime.strptime(fecha, "%Y-%m-%d")
        dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
        meses = [
            "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ]
        return f"{dias[dt.weekday()]} {dt.day} de {meses[dt.month]} de {dt.year}"
    except Exception:
        return fecha
