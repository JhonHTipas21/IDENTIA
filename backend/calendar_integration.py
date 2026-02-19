"""
backend/calendar_integration.py — IDENTIA v1.5
================================================
Wrapper/alias de calendar_service.py que expone:
  - Todas las funciones del servicio de calendario
  - Un endpoint de estado para que el frontend sepa si Google Calendar
    está activo (modo real) o en simulación.

Importar desde aquí en lugar de calendar_service directamente
para mantener compatibilidad con el plan de rutas de main.py.
"""

from backend.services.calendar_service import (
    CalendarService,
    get_calendar_service,
    agendar_cita,
    obtener_slots_disponibles,
)

__all__ = [
    "CalendarService",
    "get_calendar_service",
    "agendar_cita",
    "obtener_slots_disponibles",
    "get_calendar_status",
]


def get_calendar_status() -> dict:
    """
    Retorna el estado actual de la integración con Google Calendar.

    Returns:
        {
            "google_calendar_active": bool,
            "mode": "real" | "simulation",
            "message": str
        }
    """
    try:
        service = get_calendar_service()
        # CalendarService expone `simulation_mode` cuando no hay credenciales
        is_simulation = getattr(service, 'simulation_mode', True)
        return {
            "google_calendar_active": not is_simulation,
            "mode": "simulation" if is_simulation else "real",
            "message": (
                "Modo simulación activo. Configure credentials.json para activar Google Calendar."
                if is_simulation
                else "Google Calendar conectado y activo."
            )
        }
    except Exception as e:
        return {
            "google_calendar_active": False,
            "mode": "simulation",
            "message": f"Error al verificar estado: {str(e)}"
        }
