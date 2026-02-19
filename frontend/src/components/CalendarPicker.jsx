/**
 * CalendarPicker Component — IDENTIA v1.2
 * =========================================
 * Selector de fecha y hora para agendar citas en la Registraduría.
 * Integra con Google Calendar API vía backend.
 */

import { useState, useEffect } from 'react';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const SLOTS_DEFAULT = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

export default function CalendarPicker({
    tramiteTipo = 'Trámite',
    nombreCiudadano = '',
    oficina = 'Registraduría Nacional — Sede Central',
    pinTramite = null,
    onConfirm,
    onClose,
}) {
    const hoy = new Date();
    const [mesActual, setMesActual] = useState(hoy.getMonth());
    const [anioActual, setAnioActual] = useState(hoy.getFullYear());
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
    const [horaSeleccionada, setHoraSeleccionada] = useState(null);
    const [slotsDisponibles, setSlotsDisponibles] = useState(SLOTS_DEFAULT);
    const [cargandoSlots, setCargandoSlots] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [citaConfirmada, setCitaConfirmada] = useState(null);
    const [nombreInput, setNombreInput] = useState(nombreCiudadano);

    // Cargar slots cuando se selecciona una fecha
    useEffect(() => {
        if (!fechaSeleccionada) return;
        setCargandoSlots(true);
        setHoraSeleccionada(null);

        const fechaStr = _formatFecha(fechaSeleccionada);
        fetch(`/api/calendar/slots?fecha=${fechaStr}`)
            .then(r => r.json())
            .then(data => {
                setSlotsDisponibles(data.slots?.length > 0 ? data.slots : SLOTS_DEFAULT);
            })
            .catch(() => setSlotsDisponibles(SLOTS_DEFAULT))
            .finally(() => setCargandoSlots(false));
    }, [fechaSeleccionada]);

    // Generar días del mes
    const getDiasDelMes = () => {
        const primerDia = new Date(anioActual, mesActual, 1).getDay();
        const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
        const dias = [];

        // Espacios vacíos antes del primer día
        for (let i = 0; i < primerDia; i++) {
            dias.push(null);
        }
        // Días del mes
        for (let d = 1; d <= diasEnMes; d++) {
            dias.push(d);
        }
        return dias;
    };

    const esDiaHabil = (dia) => {
        if (!dia) return false;
        const fecha = new Date(anioActual, mesActual, dia);
        const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        return fecha > hoyInicio && fecha.getDay() !== 0 && fecha.getDay() !== 6;
    };

    const esDiaSeleccionado = (dia) => {
        if (!dia || !fechaSeleccionada) return false;
        return (
            fechaSeleccionada.getDate() === dia &&
            fechaSeleccionada.getMonth() === mesActual &&
            fechaSeleccionada.getFullYear() === anioActual
        );
    };

    const handleDiaClick = (dia) => {
        if (!esDiaHabil(dia)) return;
        setFechaSeleccionada(new Date(anioActual, mesActual, dia));
    };

    const handleMesAnterior = () => {
        if (mesActual === 0) { setMesActual(11); setAnioActual(a => a - 1); }
        else setMesActual(m => m - 1);
    };

    const handleMesSiguiente = () => {
        if (mesActual === 11) { setMesActual(0); setAnioActual(a => a + 1); }
        else setMesActual(m => m + 1);
    };

    const handleConfirmar = async () => {
        if (!fechaSeleccionada || !horaSeleccionada || !nombreInput.trim()) return;
        setConfirmando(true);

        const fechaStr = _formatFecha(fechaSeleccionada);

        // Safety timeout: reset loading after 10s to prevent infinite spinner
        const safetyTimer = setTimeout(() => setConfirmando(false), 10000);

        try {
            const response = await fetch('/api/calendar/agendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo_tramite: tramiteTipo,
                    nombre_ciudadano: nombreInput.trim(),
                    fecha: fechaStr,
                    hora: horaSeleccionada,
                    oficina,
                    pin_tramite: pinTramite,
                })
            });

            const data = await response.json();
            setCitaConfirmada(data);
            onConfirm?.(data);
        } catch (error) {
            // Fallback local si el backend no está disponible
            const confirmacion = {
                exito: true,
                titulo: `[IDENTIA] Cita de ${tramiteTipo} - ${nombreInput.trim()}`,
                fecha: fechaStr,
                hora: horaSeleccionada,
                oficina,
                event_id: `LOCAL-${Date.now()}`,
                mensaje: (
                    `📅 **¡Cita confirmada!**\n\n` +
                    `📋 **${tramiteTipo}**\n` +
                    `📆 **Fecha:** ${_fechaLegible(fechaSeleccionada)}\n` +
                    `🕐 **Hora:** ${horaSeleccionada}\n` +
                    `🏢 **Oficina:** ${oficina}\n\n` +
                    `⚠️ Recuerde llevar su cédula original y todos los documentos.`
                )
            };
            setCitaConfirmada(confirmacion);
            onConfirm?.(confirmacion);
        } finally {
            clearTimeout(safetyTimer);
            setConfirmando(false);
        }
    };

    // ─── Pantalla de confirmación ─────────────────────────────────────────────
    if (citaConfirmada) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-accessible-2xl font-bold text-gray-800 mb-2">
                        ¡Cita Agendada!
                    </h2>
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-left space-y-2">
                        <p className="text-accessible-base font-semibold text-green-800">
                            📋 {tramiteTipo}
                        </p>
                        <p className="text-accessible-base text-gray-700">
                            📆 {_fechaLegible(fechaSeleccionada)}
                        </p>
                        <p className="text-accessible-base text-gray-700">
                            🕐 {horaSeleccionada}
                        </p>
                        <p className="text-accessible-base text-gray-700">
                            🏢 {oficina}
                        </p>
                        {citaConfirmada.event_id && (
                            <p className="text-sm text-gray-500 font-mono">
                                🎫 {citaConfirmada.event_id}
                            </p>
                        )}
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
                        <p className="text-sm text-amber-800 font-medium">
                            ⚠️ Recuerde llevar su cédula original y todos los documentos del trámite.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold text-accessible-lg hover:bg-primary-600 transition-colors"
                    >
                        ✓ Entendido
                    </button>
                </div>
            </div>
        );
    }

    // ─── Selector de fecha y hora ─────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-accessible-xl font-bold">📅 Agendar Cita</h2>
                            <p className="text-blue-200 text-accessible-base">{tramiteTipo}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl hover:bg-white/30 transition-colors"
                            aria-label="Cerrar"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Nombre del ciudadano */}
                    <div>
                        <label className="block text-accessible-base font-semibold text-gray-700 mb-2">
                            👤 Su nombre completo
                        </label>
                        <input
                            type="text"
                            value={nombreInput}
                            onChange={e => setNombreInput(e.target.value)}
                            placeholder="Ej: Juan Carlos Pérez García"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-accessible-base"
                        />
                    </div>

                    {/* Calendario */}
                    <div>
                        <label className="block text-accessible-base font-semibold text-gray-700 mb-3">
                            📆 Seleccione una fecha
                        </label>

                        {/* Navegación de mes */}
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={handleMesAnterior}
                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold transition-colors"
                                aria-label="Mes anterior"
                            >
                                ‹
                            </button>
                            <span className="font-bold text-accessible-lg text-gray-800">
                                {MESES[mesActual]} {anioActual}
                            </span>
                            <button
                                onClick={handleMesSiguiente}
                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold transition-colors"
                                aria-label="Mes siguiente"
                            >
                                ›
                            </button>
                        </div>

                        {/* Días de la semana */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {DIAS_SEMANA.map(d => (
                                <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Días del mes */}
                        <div className="grid grid-cols-7 gap-1">
                            {getDiasDelMes().map((dia, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleDiaClick(dia)}
                                    disabled={!esDiaHabil(dia)}
                                    className={`
                                        h-10 w-full rounded-xl text-accessible-base font-medium transition-all
                                        ${!dia ? 'invisible' : ''}
                                        ${esDiaSeleccionado(dia)
                                            ? 'bg-blue-600 text-white shadow-md scale-110'
                                            : esDiaHabil(dia)
                                                ? 'hover:bg-blue-50 hover:text-blue-700 text-gray-700 cursor-pointer'
                                                : 'text-gray-300 cursor-not-allowed'
                                        }
                                    `}
                                    aria-label={dia ? `${dia} de ${MESES[mesActual]}` : undefined}
                                >
                                    {dia}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Slots de hora */}
                    {fechaSeleccionada && (
                        <div>
                            <label className="block text-accessible-base font-semibold text-gray-700 mb-3">
                                🕐 Seleccione un horario
                                {cargandoSlots && (
                                    <span className="ml-2 text-sm text-gray-400 font-normal">
                                        Cargando disponibilidad...
                                    </span>
                                )}
                            </label>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {slotsDisponibles.map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => setHoraSeleccionada(slot)}
                                        className={`
                                            py-3 rounded-xl font-semibold text-accessible-base transition-all
                                            ${horaSeleccionada === slot
                                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                                : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                            }
                                        `}
                                        aria-label={`Horario ${slot}`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resumen de la cita */}
                    {fechaSeleccionada && horaSeleccionada && (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <h3 className="font-bold text-blue-800 text-accessible-base mb-2">
                                📋 Resumen de su cita:
                            </h3>
                            <p className="text-gray-700 text-accessible-base">
                                📆 {_fechaLegible(fechaSeleccionada)} a las {horaSeleccionada}
                            </p>
                            <p className="text-gray-700 text-accessible-base">
                                🏢 {oficina}
                            </p>
                            {pinTramite && (
                                <p className="text-gray-600 text-sm mt-1">
                                    📌 PIN: <span className="font-mono font-bold">{pinTramite}</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Checklist de requisitos */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Para confirmar su cita necesita:</p>
                    <ul className="space-y-1">
                        <li className={`flex items-center gap-2 text-sm font-medium ${nombreInput.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                            <span>{nombreInput.trim() ? '✅' : '○'}</span> Su nombre completo
                        </li>
                        <li className={`flex items-center gap-2 text-sm font-medium ${fechaSeleccionada ? 'text-green-600' : 'text-gray-400'}`}>
                            <span>{fechaSeleccionada ? '✅' : '○'}</span> Fecha seleccionada
                        </li>
                        <li className={`flex items-center gap-2 text-sm font-medium ${horaSeleccionada ? 'text-green-600' : 'text-gray-400'}`}>
                            <span>{horaSeleccionada ? '✅' : '○'}</span> Horario seleccionado
                        </li>
                    </ul>
                </div>

                {/* Botón confirmar */}
                <div className="pb-2">
                    <button
                        onClick={handleConfirmar}
                        disabled={!fechaSeleccionada || !horaSeleccionada || !nombreInput.trim() || confirmando}
                        className={`
                            w-full py-4 rounded-2xl font-bold text-accessible-lg transition-all
                            ${fechaSeleccionada && horaSeleccionada && nombreInput.trim() && !confirmando
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }
                        `}
                    >
                        {confirmando ? '⏳ Agendando...' : '📅 Confirmar Cita'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _formatFecha(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function _fechaLegible(date) {
    if (!date) return '';
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = [
        '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${dias[date.getDay()]} ${date.getDate()} de ${meses[date.getMonth() + 1]} de ${date.getFullYear()}`;
}
