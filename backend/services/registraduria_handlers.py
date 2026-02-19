"""
IDENTIA - Registraduría Nacional de Colombia — Service Handlers
================================================================
Módulo con la lógica de negocio de todos los servicios de la
Registraduría Nacional del Estado Civil de Colombia.

Servicios implementados:
  1. Identificación (Cédula de Ciudadanía y Tarjeta de Identidad)
  2. Registro Civil (Nacimiento, Matrimonio, Defunción, Apostilla)
  3. Consultas y Seguimiento
  4. Gestión de Citas y Tarifas
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime, date
import uuid


# ============================================================================
# Enums y Tipos
# ============================================================================

class TramiteCedula(Enum):
    PRIMERA_VEZ       = "primera_vez"
    DUPLICADO         = "duplicado"
    RECTIFICACION     = "rectificacion"
    RENOVACION        = "renovacion"
    TARJETA_IDENTIDAD = "tarjeta_identidad"


class TipoRegistroCivil(Enum):
    NACIMIENTO = "nacimiento"
    MATRIMONIO = "matrimonio"
    DEFUNCION  = "defuncion"
    APOSTILLA  = "apostilla"


class EstadoTramite(Enum):
    RECIBIDO    = "recibido"
    EN_PROCESO  = "en_proceso"
    APROBADO    = "aprobado"
    LISTO       = "listo"
    ENTREGADO   = "entregado"
    RECHAZADO   = "rechazado"


@dataclass
class ResultadoTramite:
    """Resultado estándar de cualquier trámite"""
    exito: bool
    mensaje: str
    datos: Dict[str, Any] = field(default_factory=dict)
    requiere_biometria: bool = False
    requiere_documentos: List[str] = field(default_factory=list)
    numero_radicado: Optional[str] = None
    siguiente_paso: Optional[str] = None


# ============================================================================
# Base de datos de tarifas (Resolución 2024 - Registraduría Colombia)
# ============================================================================

TARIFAS_REGISTRADURIA = {
    "cedula_primera_vez": {
        "nombre": "Cédula de Ciudadanía — Primera Vez",
        "costo": 0,
        "moneda": "COP",
        "descripcion": "Gratuita para mayores de 18 años",
        "exonerados": ["Todos los ciudadanos colombianos"],
        "base_legal": "Ley 962 de 2005, Art. 26"
    },
    "cedula_duplicado": {
        "nombre": "Cédula de Ciudadanía — Duplicado",
        "costo": 51900,
        "moneda": "COP",
        "descripcion": "Por pérdida, hurto o deterioro",
        "exonerados": [
            "Víctimas del conflicto armado (Ley 1448/2011)",
            "Adultos mayores en situación de vulnerabilidad",
            "Personas en condición de discapacidad sin ingresos",
            "Desplazados internos registrados en UARIV"
        ],
        "base_legal": "Resolución 6271 de 2024"
    },
    "cedula_rectificacion": {
        "nombre": "Cédula de Ciudadanía — Rectificación",
        "costo": 0,
        "moneda": "COP",
        "descripcion": "Gratuita cuando el error es de la Registraduría",
        "exonerados": ["Todos cuando el error es institucional"],
        "base_legal": "Decreto 1260 de 1970"
    },
    "cedula_renovacion": {
        "nombre": "Cédula de Ciudadanía — Renovación",
        "costo": 0,
        "moneda": "COP",
        "descripcion": "Gratuita por cambio de datos o actualización",
        "exonerados": ["Todos los ciudadanos colombianos"],
        "base_legal": "Ley 962 de 2005"
    },
    "tarjeta_identidad": {
        "nombre": "Tarjeta de Identidad",
        "costo": 0,
        "moneda": "COP",
        "descripcion": "Gratuita para menores de 7 a 17 años",
        "exonerados": ["Todos los menores colombianos"],
        "base_legal": "Ley 1098 de 2006 (Código de Infancia)"
    },
    "registro_nacimiento": {
        "nombre": "Registro Civil de Nacimiento",
        "costo": 0,
        "moneda": "COP",
        "descripcion": "Inscripción gratuita dentro de los primeros 30 días",
        "exonerados": ["Todos los recién nacidos"],
        "base_legal": "Decreto 1260 de 1970, Art. 49"
    },
    "copia_registro_nacimiento": {
        "nombre": "Copia Registro Civil de Nacimiento",
        "costo": 6900,
        "moneda": "COP",
        "descripcion": "Copia auténtica del registro de nacimiento",
        "exonerados": [
            "Menores en proceso de adopción",
            "Víctimas del conflicto armado"
        ],
        "base_legal": "Resolución 6271 de 2024"
    },
    "copia_registro_matrimonio": {
        "nombre": "Copia Registro Civil de Matrimonio",
        "costo": 6900,
        "moneda": "COP",
        "descripcion": "Copia auténtica del registro de matrimonio",
        "exonerados": ["Víctimas del conflicto armado"],
        "base_legal": "Resolución 6271 de 2024"
    },
    "copia_registro_defuncion": {
        "nombre": "Copia Registro Civil de Defunción",
        "costo": 6900,
        "moneda": "COP",
        "descripcion": "Copia auténtica del registro de defunción",
        "exonerados": ["Familiares de víctimas del conflicto"],
        "base_legal": "Resolución 6271 de 2024"
    },
    "apostilla": {
        "nombre": "Apostilla de Documentos",
        "costo": 51900,
        "moneda": "COP",
        "descripcion": "Legalización para uso en el exterior (Convenio de La Haya)",
        "exonerados": ["Becarios del Estado colombiano"],
        "base_legal": "Ley 455 de 1998, Convenio de La Haya"
    }
}


# ============================================================================
# Requisitos por trámite
# ============================================================================

REQUISITOS = {
    TramiteCedula.PRIMERA_VEZ: {
        "documentos": [
            "Registro Civil de Nacimiento (original)",
            "Foto 3x4 fondo blanco (reciente)",
            "Huella dactilar (se toma en oficina)"
        ],
        "condiciones": ["Ser mayor de 18 años", "Ser ciudadano colombiano"],
        "tiempo_estimado": "15 días hábiles",
        "donde": "Registraduría Municipal del domicilio"
    },
    TramiteCedula.DUPLICADO: {
        "documentos": [
            "Denuncia por pérdida o hurto (si aplica)",
            "Foto 3x4 fondo blanco (reciente)",
            "Verificación biométrica facial obligatoria"
        ],
        "condiciones": ["Ser el titular de la cédula"],
        "tiempo_estimado": "15 días hábiles",
        "donde": "Cualquier Registraduría o Notaría habilitada",
        "requiere_biometria": True
    },
    TramiteCedula.RECTIFICACION: {
        "documentos": [
            "Cédula actual con el error",
            "Registro Civil de Nacimiento que acredite el dato correcto",
            "Foto 3x4 fondo blanco (si hay cambio de imagen)"
        ],
        "condiciones": ["Demostrar el error con documento soporte"],
        "tiempo_estimado": "30 días hábiles",
        "donde": "Registraduría Municipal del domicilio"
    },
    TramiteCedula.RENOVACION: {
        "documentos": [
            "Cédula actual (aunque esté deteriorada o vencida)",
            "Foto 3x4 fondo blanco (reciente)"
        ],
        "condiciones": ["Ser el titular"],
        "tiempo_estimado": "15 días hábiles",
        "donde": "Cualquier Registraduría o Notaría habilitada"
    },
    TramiteCedula.TARJETA_IDENTIDAD: {
        "documentos": [
            "Registro Civil de Nacimiento del menor",
            "Cédula del padre, madre o acudiente",
            "Foto 3x4 fondo blanco del menor"
        ],
        "condiciones": ["Menor entre 7 y 17 años", "Ser colombiano"],
        "tiempo_estimado": "15 días hábiles",
        "donde": "Registraduría Municipal del domicilio"
    }
}


# ============================================================================
# Oficinas de la Registraduría (muestra representativa)
# ============================================================================

OFICINAS_REGISTRADURIA = [
    {
        "id": "reg_bogota_centro",
        "nombre": "Registraduría Nacional — Sede Central",
        "ciudad": "Bogotá D.C.",
        "direccion": "Calle 26 No. 51-50, CAN",
        "telefono": "601 2288000",
        "horario": "Lunes a Viernes 8:00 AM - 4:00 PM",
        "servicios": ["cedula", "registro_civil", "apostilla", "citas"],
        "slots_disponibles": ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
    },
    {
        "id": "reg_medellin",
        "nombre": "Registraduría Auxiliar — Medellín",
        "ciudad": "Medellín, Antioquia",
        "direccion": "Carrera 52 No. 42-73, Centro",
        "telefono": "604 5110000",
        "horario": "Lunes a Viernes 8:00 AM - 4:00 PM",
        "servicios": ["cedula", "registro_civil", "citas"],
        "slots_disponibles": ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00"]
    },
    {
        "id": "reg_cali",
        "nombre": "Registraduría Auxiliar — Cali",
        "ciudad": "Cali, Valle del Cauca",
        "direccion": "Carrera 4 No. 12-41, Centro",
        "telefono": "602 8820000",
        "horario": "Lunes a Viernes 8:00 AM - 4:00 PM",
        "servicios": ["cedula", "registro_civil", "citas"],
        "slots_disponibles": ["08:00", "09:30", "11:00", "14:00", "15:30"]
    },
    {
        "id": "reg_barranquilla",
        "nombre": "Registraduría Auxiliar — Barranquilla",
        "ciudad": "Barranquilla, Atlántico",
        "direccion": "Calle 40 No. 44-90, Centro",
        "telefono": "605 3300000",
        "horario": "Lunes a Viernes 8:00 AM - 4:00 PM",
        "servicios": ["cedula", "registro_civil", "citas"],
        "slots_disponibles": ["08:00", "09:00", "10:00", "11:00", "14:00"]
    }
]


# ============================================================================
# Handler: Identificación (Cédula y Tarjeta de Identidad)
# ============================================================================

class IdentificacionHandler:
    """
    Maneja todos los trámites de identificación:
    - Cédula de Ciudadanía (primera vez, duplicado, rectificación, renovación)
    - Tarjeta de Identidad para menores
    """

    def tramite_cedula_primera_vez(self, datos_ciudadano: Dict[str, Any]) -> ResultadoTramite:
        """Expedición de cédula por primera vez (mayores de 18 años)"""
        edad = datos_ciudadano.get("edad", 0)

        if edad < 18:
            return ResultadoTramite(
                exito=False,
                mensaje=(
                    f"Para la Cédula de Ciudadanía se requiere ser mayor de 18 años. "
                    f"Usted tiene {edad} años. Si tiene entre 7 y 17 años, puede tramitar "
                    f"la **Tarjeta de Identidad** que también es gratuita. ¿Le ayudo con eso?"
                ),
                siguiente_paso="ofrecer_tarjeta_identidad"
            )

        radicado = self._generar_radicado("CC1")
        requisitos = REQUISITOS[TramiteCedula.PRIMERA_VEZ]
        tarifa = TARIFAS_REGISTRADURIA["cedula_primera_vez"]

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"✅ **Cédula de Ciudadanía — Primera Vez**\n\n"
                f"¡Buenas noticias! Este trámite es **completamente gratuito**.\n\n"
                f"📋 **Documentos que necesita:**\n"
                + "\n".join(f"   • {doc}" for doc in requisitos["documentos"]) +
                f"\n\n⏱️ **Tiempo estimado:** {requisitos['tiempo_estimado']}\n"
                f"🏢 **Dónde ir:** {requisitos['donde']}\n\n"
                f"📌 **Número de radicado:** `{radicado}`\n\n"
                f"¿Desea que le agende una cita en la oficina más cercana?"
            ),
            datos={
                "tramite": "cedula_primera_vez",
                "radicado": radicado,
                "requisitos": requisitos,
                "tarifa": tarifa
            },
            requiere_documentos=requisitos["documentos"],
            numero_radicado=radicado,
            siguiente_paso="agendar_cita"
        )

    def tramite_cedula_duplicado(self, datos_ciudadano: Dict[str, Any]) -> ResultadoTramite:
        """
        Duplicado de cédula por pérdida, hurto o deterioro.
        ACTIVA FLUJO BIOMÉTRICO FACIAL obligatoriamente.
        """
        radicado = self._generar_radicado("DUP")
        requisitos = REQUISITOS[TramiteCedula.DUPLICADO]
        tarifa = TARIFAS_REGISTRADURIA["cedula_duplicado"]

        # Verificar si aplica exoneración
        es_victima = datos_ciudadano.get("es_victima_conflicto", False)
        es_vulnerable = datos_ciudadano.get("es_adulto_mayor_vulnerable", False)
        costo_final = 0 if (es_victima or es_vulnerable) else tarifa["costo"]

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"🔐 **Cédula de Ciudadanía — Duplicado**\n\n"
                f"Para el duplicado, **es obligatorio verificar su identidad** con reconocimiento facial. "
                f"Esto protege su seguridad y evita fraudes.\n\n"
                f"📋 **Documentos necesarios:**\n"
                + "\n".join(f"   • {doc}" for doc in requisitos["documentos"]) +
                f"\n\n💰 **Costo:** {'**GRATUITO** (exonerado)' if costo_final == 0 else f'${costo_final:,} COP'}\n"
                f"⏱️ **Tiempo estimado:** {requisitos['tiempo_estimado']}\n\n"
                f"📌 **Radicado:** `{radicado}`\n\n"
                f"👁️ Vamos a iniciar la **verificación biométrica facial** ahora. "
                f"Por favor mire a la cámara cuando esté listo."
            ),
            datos={
                "tramite": "cedula_duplicado",
                "radicado": radicado,
                "costo_final": costo_final,
                "exonerado": costo_final == 0,
                "tarifa": tarifa
            },
            requiere_biometria=True,
            requiere_documentos=requisitos["documentos"],
            numero_radicado=radicado,
            siguiente_paso="verificacion_biometrica_facial"
        )

    def tramite_cedula_rectificacion(self, datos_ciudadano: Dict[str, Any]) -> ResultadoTramite:
        """Rectificación de datos erróneos en la cédula"""
        radicado = self._generar_radicado("REC")
        requisitos = REQUISITOS[TramiteCedula.RECTIFICACION]

        campo_a_rectificar = datos_ciudadano.get("campo_rectificar", "datos")

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"✏️ **Cédula de Ciudadanía — Rectificación**\n\n"
                f"Entiendo que necesita corregir: **{campo_a_rectificar}**.\n\n"
                f"Si el error fue cometido por la Registraduría, el trámite es **completamente gratuito**.\n\n"
                f"📋 **Documentos necesarios:**\n"
                + "\n".join(f"   • {doc}" for doc in requisitos["documentos"]) +
                f"\n\n⏱️ **Tiempo estimado:** {requisitos['tiempo_estimado']}\n"
                f"🏢 **Dónde ir:** {requisitos['donde']}\n\n"
                f"📌 **Radicado:** `{radicado}`"
            ),
            datos={
                "tramite": "cedula_rectificacion",
                "radicado": radicado,
                "campo_rectificar": campo_a_rectificar
            },
            requiere_documentos=requisitos["documentos"],
            numero_radicado=radicado,
            siguiente_paso="agendar_cita"
        )

    def tramite_cedula_renovacion(self, datos_ciudadano: Dict[str, Any]) -> ResultadoTramite:
        """Renovación de cédula (cambio de datos, actualización de foto, etc.)"""
        radicado = self._generar_radicado("REN")
        requisitos = REQUISITOS[TramiteCedula.RENOVACION]

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"🔄 **Cédula de Ciudadanía — Renovación**\n\n"
                f"¡Excelente! La renovación de cédula es **completamente gratuita**.\n\n"
                f"📋 **Solo necesita:**\n"
                + "\n".join(f"   • {doc}" for doc in requisitos["documentos"]) +
                f"\n\n⏱️ **Tiempo estimado:** {requisitos['tiempo_estimado']}\n"
                f"🏢 **Puede ir a:** {requisitos['donde']}\n\n"
                f"📌 **Radicado:** `{radicado}`\n\n"
                f"¿Le agendo una cita en la oficina más cercana a su domicilio?"
            ),
            datos={
                "tramite": "cedula_renovacion",
                "radicado": radicado,
                "requisitos": requisitos
            },
            requiere_documentos=requisitos["documentos"],
            numero_radicado=radicado,
            siguiente_paso="agendar_cita"
        )

    def tramite_tarjeta_identidad(self, datos_ciudadano: Dict[str, Any]) -> ResultadoTramite:
        """Tarjeta de Identidad para menores de 7 a 17 años"""
        edad = datos_ciudadano.get("edad", 0)
        nombre_menor = datos_ciudadano.get("nombre_menor", "el menor")

        if edad < 7:
            return ResultadoTramite(
                exito=False,
                mensaje=(
                    f"La Tarjeta de Identidad se expide para menores entre **7 y 17 años**. "
                    f"Para menores de 7 años, el documento de identidad es el "
                    f"**Registro Civil de Nacimiento**. ¿Le ayudo con ese trámite?"
                ),
                siguiente_paso="registro_civil_nacimiento"
            )

        if edad >= 18:
            return ResultadoTramite(
                exito=False,
                mensaje=(
                    f"Para mayores de 18 años el documento es la **Cédula de Ciudadanía**, "
                    f"no la Tarjeta de Identidad. ¿Le ayudo con el trámite de cédula?"
                ),
                siguiente_paso="cedula_primera_vez"
            )

        radicado = self._generar_radicado("TI")
        requisitos = REQUISITOS[TramiteCedula.TARJETA_IDENTIDAD]

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"👶 **Tarjeta de Identidad para {nombre_menor}**\n\n"
                f"¡Perfecto! Este trámite es **completamente gratuito**.\n\n"
                f"📋 **Documentos necesarios:**\n"
                + "\n".join(f"   • {doc}" for doc in requisitos["documentos"]) +
                f"\n\n⏱️ **Tiempo estimado:** {requisitos['tiempo_estimado']}\n"
                f"🏢 **Dónde ir:** {requisitos['donde']}\n\n"
                f"📌 **Radicado:** `{radicado}`\n\n"
                f"Recuerde que el acudiente debe ir **personalmente** con el menor."
            ),
            datos={
                "tramite": "tarjeta_identidad",
                "radicado": radicado,
                "edad_menor": edad
            },
            requiere_documentos=requisitos["documentos"],
            numero_radicado=radicado,
            siguiente_paso="agendar_cita"
        )

    def _generar_radicado(self, prefijo: str) -> str:
        """Genera número de radicado único"""
        timestamp = datetime.now().strftime("%Y%m%d")
        unique = str(uuid.uuid4())[:6].upper()
        return f"REG-{prefijo}-{timestamp}-{unique}"


# ============================================================================
# Handler: Registro Civil
# ============================================================================

class RegistroCivilHandler:
    """
    Maneja trámites de Registro Civil:
    - Inscripción de nacimiento
    - Copias digitales (nacimiento, matrimonio, defunción)
    - Apostilla de documentos
    """

    def inscripcion_nacimiento(self, datos: Dict[str, Any]) -> ResultadoTramite:
        """Inscripción de nacimiento (gratuita dentro de los 30 días)"""
        fecha_nacimiento_str = datos.get("fecha_nacimiento", "")
        dias_desde_nacimiento = datos.get("dias_desde_nacimiento", 0)
        radicado = self._generar_radicado("NAC")

        advertencia_extemporaneo = ""
        if dias_desde_nacimiento > 30:
            advertencia_extemporaneo = (
                f"\n\n⚠️ **Nota:** Han pasado más de 30 días desde el nacimiento. "
                f"El registro extemporáneo puede requerir trámite adicional ante el juez."
            )

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"👶 **Inscripción de Registro Civil de Nacimiento**\n\n"
                f"Este trámite es **completamente gratuito**.\n\n"
                f"📋 **Documentos necesarios:**\n"
                f"   • Certificado de nacido vivo (del hospital o partera)\n"
                f"   • Cédulas de los padres\n"
                f"   • Si los padres están casados: Registro Civil de Matrimonio\n\n"
                f"🏢 **Dónde:** Registraduría Municipal, Notaría o Consulado (si está en el exterior)\n"
                f"⏱️ **Tiempo:** Inmediato (se expide el mismo día)\n\n"
                f"📌 **Radicado:** `{radicado}`"
                + advertencia_extemporaneo
            ),
            datos={"tramite": "inscripcion_nacimiento", "radicado": radicado},
            numero_radicado=radicado,
            siguiente_paso="agendar_cita"
        )

    def copia_registro(self, tipo: TipoRegistroCivil, datos: Dict[str, Any]) -> ResultadoTramite:
        """Solicitar copia auténtica de registro civil (nacimiento, matrimonio, defunción)"""
        nombres_tipo = {
            TipoRegistroCivil.NACIMIENTO: "Nacimiento",
            TipoRegistroCivil.MATRIMONIO: "Matrimonio",
            TipoRegistroCivil.DEFUNCION:  "Defunción"
        }
        claves_tarifa = {
            TipoRegistroCivil.NACIMIENTO: "copia_registro_nacimiento",
            TipoRegistroCivil.MATRIMONIO: "copia_registro_matrimonio",
            TipoRegistroCivil.DEFUNCION:  "copia_registro_defuncion"
        }

        nombre_tipo = nombres_tipo.get(tipo, "Registro Civil")
        tarifa = TARIFAS_REGISTRADURIA[claves_tarifa[tipo]]
        radicado = self._generar_radicado(tipo.value[:3].upper())

        # Verificar exoneración
        es_victima = datos.get("es_victima_conflicto", False)
        costo_final = 0 if es_victima else tarifa["costo"]

        exonerados_texto = "\n".join(f"   • {e}" for e in tarifa["exonerados"])

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"📋 **Copia de Registro Civil de {nombre_tipo}**\n\n"
                f"💰 **Costo:** {'**GRATUITO** (exonerado)' if costo_final == 0 else f'${costo_final:,} COP'}\n\n"
                f"👥 **Exonerados del pago:**\n{exonerados_texto}\n\n"
                f"📋 **Documentos necesarios:**\n"
                f"   • Cédula del solicitante\n"
                f"   • Datos del titular (nombre completo y fecha aproximada)\n\n"
                f"🌐 **También puede solicitarla en línea:** registraduria.gov.co\n"
                f"🏢 **O en persona:** Cualquier Registraduría o Notaría habilitada\n\n"
                f"📌 **Radicado:** `{radicado}`\n"
                f"⏱️ **Entrega:** Inmediata en línea / 1-3 días en oficina"
            ),
            datos={
                "tramite": f"copia_registro_{tipo.value}",
                "radicado": radicado,
                "costo_final": costo_final,
                "tarifa": tarifa
            },
            numero_radicado=radicado,
            siguiente_paso="confirmar_pago" if costo_final > 0 else "completado"
        )

    def tramite_apostilla(self, datos: Dict[str, Any]) -> ResultadoTramite:
        """Apostilla de documentos para uso en el exterior"""
        tipo_documento = datos.get("tipo_documento", "documento")
        pais_destino = datos.get("pais_destino", "el exterior")
        radicado = self._generar_radicado("APO")
        tarifa = TARIFAS_REGISTRADURIA["apostilla"]

        es_becario = datos.get("es_becario_estado", False)
        costo_final = 0 if es_becario else tarifa["costo"]

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"🌍 **Apostilla de {tipo_documento} para {pais_destino}**\n\n"
                f"La apostilla es la legalización internacional según el **Convenio de La Haya**. "
                f"Colombia es país signatario desde 2012.\n\n"
                f"💰 **Costo:** {'**GRATUITO** (becario del Estado)' if costo_final == 0 else f'${costo_final:,} COP'}\n\n"
                f"📋 **Documentos necesarios:**\n"
                f"   • Documento original a apostillar\n"
                f"   • Cédula del solicitante\n"
                f"   • Comprobante de pago (si aplica)\n\n"
                f"🏢 **Solo en:** Registraduría Nacional — Sede Central (Bogotá)\n"
                f"   O en línea: apostilla.registraduria.gov.co\n\n"
                f"⏱️ **Tiempo:** 3-5 días hábiles\n"
                f"📌 **Radicado:** `{radicado}`"
            ),
            datos={
                "tramite": "apostilla",
                "radicado": radicado,
                "costo_final": costo_final,
                "pais_destino": pais_destino
            },
            numero_radicado=radicado,
            siguiente_paso="confirmar_pago" if costo_final > 0 else "agendar_cita"
        )

    def _generar_radicado(self, prefijo: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d")
        unique = str(uuid.uuid4())[:6].upper()
        return f"REG-RC-{prefijo}-{timestamp}-{unique}"


# ============================================================================
# Handler: Consultas y Seguimiento
# ============================================================================

class ConsultasHandler:
    """
    Maneja consultas de estado y ubicación de oficinas.
    Proporciona datos para la barra de progreso visual.
    """

    PASOS_TRAMITE = [
        {"id": 1, "nombre": "Solicitud Recibida",    "icono": "📥"},
        {"id": 2, "nombre": "Verificación Biométrica","icono": "🔐"},
        {"id": 3, "nombre": "Revisión Documental",   "icono": "📋"},
        {"id": 4, "nombre": "Aprobación",            "icono": "✅"},
        {"id": 5, "nombre": "Producción",            "icono": "🏭"},
        {"id": 6, "nombre": "Listo para Recoger",    "icono": "🎉"},
    ]

    def consulta_estado_documento(self, numero_cedula: str, radicado: Optional[str] = None) -> ResultadoTramite:
        """Consulta el estado actual de un trámite en curso"""
        # Simulación de consulta a base de datos
        import random
        paso_actual = random.randint(1, 6)
        estado = EstadoTramite.EN_PROCESO if paso_actual < 6 else EstadoTramite.LISTO

        pasos_con_estado = []
        for paso in self.PASOS_TRAMITE:
            if paso["id"] < paso_actual:
                estado_paso = "completado"
            elif paso["id"] == paso_actual:
                estado_paso = "en_proceso"
            else:
                estado_paso = "pendiente"
            pasos_con_estado.append({**paso, "estado": estado_paso})

        porcentaje = round((paso_actual / len(self.PASOS_TRAMITE)) * 100)

        mensaje_estado = (
            f"🎉 **¡Su documento está LISTO para recoger!**\n\n"
            f"Puede recogerlo en la oficina donde lo solicitó.\n"
            f"Recuerde llevar su cédula actual."
        ) if estado == EstadoTramite.LISTO else (
            f"⏳ **Su trámite está en proceso** ({porcentaje}% completado)\n\n"
            f"Paso actual: **{self.PASOS_TRAMITE[paso_actual-1]['icono']} "
            f"{self.PASOS_TRAMITE[paso_actual-1]['nombre']}**\n\n"
            f"Tiempo estimado restante: {(6 - paso_actual) * 3} días hábiles aproximadamente."
        )

        return ResultadoTramite(
            exito=True,
            mensaje=mensaje_estado,
            datos={
                "cedula_consultada": f"***{numero_cedula[-4:]}",  # Anonimizado
                "estado": estado.value,
                "paso_actual": paso_actual,
                "porcentaje": porcentaje,
                "pasos": pasos_con_estado,
                "total_pasos": len(self.PASOS_TRAMITE)
            }
        )

    def consulta_oficinas(self, ciudad: Optional[str] = None) -> ResultadoTramite:
        """Consulta oficinas de la Registraduría por ciudad"""
        if ciudad:
            oficinas = [o for o in OFICINAS_REGISTRADURIA
                       if ciudad.lower() in o["ciudad"].lower()]
        else:
            oficinas = OFICINAS_REGISTRADURIA

        if not oficinas:
            return ResultadoTramite(
                exito=False,
                mensaje=(
                    f"No encontré oficinas en **{ciudad}**. "
                    f"Puede consultar todas las sedes en: registraduria.gov.co/sedes"
                ),
                datos={"ciudades_disponibles": [o["ciudad"] for o in OFICINAS_REGISTRADURIA]}
            )

        lista_oficinas = "\n\n".join([
            f"🏢 **{o['nombre']}**\n"
            f"   📍 {o['direccion']}\n"
            f"   📞 {o['telefono']}\n"
            f"   🕐 {o['horario']}"
            for o in oficinas[:3]
        ])

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"📍 **Oficinas de la Registraduría"
                f"{' en ' + ciudad if ciudad else ''}:**\n\n"
                + lista_oficinas +
                f"\n\n¿Desea agendar una cita en alguna de estas oficinas?"
            ),
            datos={"oficinas": oficinas},
            siguiente_paso="agendar_cita"
        )

    def get_progress_bar_data(self, radicado: str) -> Dict[str, Any]:
        """Retorna datos estructurados para la barra de progreso visual del frontend"""
        resultado = self.consulta_estado_documento("", radicado)
        return {
            "pasos": resultado.datos.get("pasos", []),
            "paso_actual": resultado.datos.get("paso_actual", 1),
            "porcentaje": resultado.datos.get("porcentaje", 0),
            "estado": resultado.datos.get("estado", "en_proceso")
        }


# ============================================================================
# Handler: Citas y Tarifas
# ============================================================================

class CitasYTarifasHandler:
    """
    Maneja el agendamiento de citas y la consulta de tarifas.
    Incluye lógica de exoneraciones según la ley colombiana.
    """

    def agendar_cita(
        self,
        servicio: str,
        ciudad: str,
        fecha_preferida: Optional[str] = None,
        hora_preferida: Optional[str] = None
    ) -> ResultadoTramite:
        """Agenda una cita en la oficina más cercana"""
        # Buscar oficina disponible
        oficinas_disponibles = [
            o for o in OFICINAS_REGISTRADURIA
            if ciudad.lower() in o["ciudad"].lower()
            and any(s in o["servicios"] for s in ["cedula", "registro_civil", "citas"])
        ]

        if not oficinas_disponibles:
            oficinas_disponibles = OFICINAS_REGISTRADURIA  # Fallback a todas

        oficina = oficinas_disponibles[0]
        hora = hora_preferida if hora_preferida in oficina["slots_disponibles"] \
               else oficina["slots_disponibles"][0]

        # Calcular próxima fecha hábil
        from datetime import timedelta
        hoy = date.today()
        dias_adelante = 3
        fecha_cita = hoy + timedelta(days=dias_adelante)
        # Saltar fines de semana
        while fecha_cita.weekday() >= 5:
            fecha_cita += timedelta(days=1)

        codigo_confirmacion = f"CITA-{str(uuid.uuid4())[:8].upper()}"

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"📅 **¡Cita agendada exitosamente!**\n\n"
                f"🏢 **Oficina:** {oficina['nombre']}\n"
                f"📍 **Dirección:** {oficina['direccion']}\n"
                f"📆 **Fecha:** {fecha_cita.strftime('%A %d de %B de %Y')}\n"
                f"🕐 **Hora:** {hora}\n"
                f"🎫 **Código de confirmación:** `{codigo_confirmacion}`\n\n"
                f"📋 **Recuerde llevar:**\n"
                f"   • Cédula de identidad original\n"
                f"   • Todos los documentos del trámite\n"
                f"   • Este código de confirmación\n\n"
                f"⚠️ **Llegue 15 minutos antes** de su cita.\n\n"
                f"¿Desea que le envíe un recordatorio?"
            ),
            datos={
                "oficina": oficina,
                "fecha": fecha_cita.isoformat(),
                "hora": hora,
                "codigo": codigo_confirmacion,
                "servicio": servicio
            },
            numero_radicado=codigo_confirmacion
        )

    def consultar_tarifas(self, tipo_tramite: Optional[str] = None) -> ResultadoTramite:
        """Consulta tarifas vigentes y exoneraciones"""
        if tipo_tramite and tipo_tramite in TARIFAS_REGISTRADURIA:
            tarifa = TARIFAS_REGISTRADURIA[tipo_tramite]
            exonerados = "\n".join(f"   • {e}" for e in tarifa["exonerados"])
            costo_texto = "**GRATUITO**" if tarifa["costo"] == 0 else f"**${tarifa['costo']:,} COP**"

            return ResultadoTramite(
                exito=True,
                mensaje=(
                    f"💰 **Tarifa: {tarifa['nombre']}**\n\n"
                    f"Costo: {costo_texto}\n"
                    f"📝 {tarifa['descripcion']}\n\n"
                    f"👥 **Exonerados del pago:**\n{exonerados}\n\n"
                    f"📚 **Base legal:** {tarifa['base_legal']}"
                ),
                datos={"tarifa": tarifa}
            )

        # Mostrar todas las tarifas
        gratuitos = [t for t in TARIFAS_REGISTRADURIA.values() if t["costo"] == 0]
        con_costo = [t for t in TARIFAS_REGISTRADURIA.values() if t["costo"] > 0]

        lista_gratuitos = "\n".join(f"   ✅ {t['nombre']}" for t in gratuitos)
        lista_con_costo = "\n".join(
            f"   💳 {t['nombre']}: ${t['costo']:,} COP" for t in con_costo
        )

        return ResultadoTramite(
            exito=True,
            mensaje=(
                f"💰 **Tarifas Vigentes — Registraduría Nacional 2024**\n\n"
                f"🆓 **Trámites GRATUITOS:**\n{lista_gratuitos}\n\n"
                f"💳 **Trámites con costo:**\n{lista_con_costo}\n\n"
                f"⚠️ **Recuerde:** Adultos mayores vulnerables, víctimas del conflicto "
                f"y personas en situación de discapacidad pueden estar exonerados. "
                f"¿Desea verificar si usted aplica para exoneración?"
            ),
            datos={"tarifas": TARIFAS_REGISTRADURIA},
            siguiente_paso="verificar_exoneracion"
        )

    def verificar_exoneracion(self, datos_ciudadano: Dict[str, Any]) -> ResultadoTramite:
        """Verifica si el ciudadano aplica para exoneración de tarifas"""
        es_victima = datos_ciudadano.get("es_victima_conflicto", False)
        es_adulto_mayor_vulnerable = datos_ciudadano.get("es_adulto_mayor_vulnerable", False)
        tiene_discapacidad = datos_ciudadano.get("tiene_discapacidad", False)
        es_desplazado = datos_ciudadano.get("es_desplazado", False)
        es_becario = datos_ciudadano.get("es_becario_estado", False)

        aplica_exoneracion = any([
            es_victima, es_adulto_mayor_vulnerable,
            tiene_discapacidad, es_desplazado, es_becario
        ])

        if aplica_exoneracion:
            razones = []
            if es_victima:         razones.append("Víctima del conflicto armado (Ley 1448/2011)")
            if es_adulto_mayor_vulnerable: razones.append("Adulto mayor en situación de vulnerabilidad")
            if tiene_discapacidad: razones.append("Persona en condición de discapacidad")
            if es_desplazado:      razones.append("Desplazado interno registrado en UARIV")
            if es_becario:         razones.append("Becario del Estado colombiano")

            return ResultadoTramite(
                exito=True,
                mensaje=(
                    f"✅ **¡Usted aplica para EXONERACIÓN de tarifas!**\n\n"
                    f"Razón(es):\n" + "\n".join(f"   • {r}" for r in razones) +
                    f"\n\n📋 **Para acreditar la exoneración necesita:**\n"
                    f"   • Certificado de la entidad correspondiente (UARIV, ICBF, etc.)\n"
                    f"   • Cédula de identidad\n\n"
                    f"Sus trámites serán **completamente gratuitos**. ¿Continuamos?"
                ),
                datos={"exonerado": True, "razones": razones}
            )
        else:
            return ResultadoTramite(
                exito=True,
                mensaje=(
                    f"ℹ️ Con la información proporcionada, **no aplica para exoneración** "
                    f"en este momento.\n\n"
                    f"Si cree que debería aplicar, puede consultar en la oficina de la "
                    f"Registraduría con los documentos que acrediten su condición.\n\n"
                    f"¿Desea continuar con el trámite con el costo regular?"
                ),
                datos={"exonerado": False}
            )
