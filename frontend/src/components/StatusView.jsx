/**
 * StatusView.jsx — IDENTIA v1.5
 * ================================
 * Vista dedicada para consultar el estado de un trámite por PIN.
 * - Input OTP de 6 dígitos/caracteres
 * - Animación de consulta
 * - Línea de tiempo vertical con resultado
 * - TTS para mensajes de error (accesibilidad total)
 */

import { useState, useRef, useEffect } from 'react';

const PIN_LENGTH = 6;

// ─── TTS helper ───────────────────────────────────────────────────────────────
function hablar(texto) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(texto);
    utt.lang = 'es-CO';
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
}

// ─── Estado → color + ícono ───────────────────────────────────────────────────
function estadoMeta(estado = '') {
    const lower = estado.toLowerCase();
    if (lower.includes('complet') || lower.includes('listo') || lower.includes('entregado')) {
        return { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300', icon: '✅' };
    }
    if (lower.includes('rechaz') || lower.includes('error') || lower.includes('invalid')) {
        return { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', icon: '❌' };
    }
    if (lower.includes('pendiente') || lower.includes('espera')) {
        return { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300', icon: '⏳' };
    }
    return { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300', icon: '🔄' };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function StatusView({ onClose }) {
    const [digits, setDigits] = useState(Array(PIN_LENGTH).fill(''));
    const [consultando, setConsultando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState('');
    const inputRefs = useRef([]);

    // Auto-focus primer campo al montar
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const pinCompleto = digits.join('').length === PIN_LENGTH;

    // ── Manejo de input OTP ──────────────────────────────────────────────────
    const handleDigit = (idx, value) => {
        const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
        const next = [...digits];
        next[idx] = char;
        setDigits(next);
        setError('');

        if (char && idx < PIN_LENGTH - 1) {
            inputRefs.current[idx + 1]?.focus();
        }
    };

    const handleKeyDown = (idx, e) => {
        if (e.key === 'Backspace') {
            if (digits[idx]) {
                const next = [...digits];
                next[idx] = '';
                setDigits(next);
            } else if (idx > 0) {
                inputRefs.current[idx - 1]?.focus();
            }
        } else if (e.key === 'Enter' && pinCompleto) {
            handleConsultar();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, PIN_LENGTH);
        const next = Array(PIN_LENGTH).fill('');
        pasted.split('').forEach((c, i) => { next[i] = c; });
        setDigits(next);
        const focusIdx = Math.min(pasted.length, PIN_LENGTH - 1);
        inputRefs.current[focusIdx]?.focus();
    };

    // ── Consultar estado ─────────────────────────────────────────────────────
    const handleConsultar = async () => {
        if (!pinCompleto) return;
        const pin = digits.join('');
        setConsultando(true);
        setError('');
        setResultado(null);

        try {
            const res = await fetch(`/api/tramites/estado/${pin}`);
            const data = await res.json();

            if (!res.ok || data.error) {
                const msg = data.error || 'PIN no encontrado. Verifique e intente de nuevo.';
                setError(msg);
                hablar(msg);
            } else {
                setResultado(data);
                hablar(`Estado de su trámite: ${data.estado_actual || data.estado}`);
            }
        } catch {
            const msg = 'No se pudo conectar con el servidor. Intente más tarde.';
            setError(msg);
            hablar(msg);
        } finally {
            setConsultando(false);
        }
    };

    const handleReset = () => {
        setDigits(Array(PIN_LENGTH).fill(''));
        setResultado(null);
        setError('');
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">

                {/* ── Header ── */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-accessible-xl font-bold">📋 Estado del Trámite</h2>
                            <p className="text-primary-200 text-accessible-base mt-1">
                                Ingrese su PIN de 6 caracteres
                            </p>
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

                <div className="p-6 space-y-6">

                    {/* ── OTP Input ── */}
                    <div>
                        <label className="block text-center text-accessible-base font-semibold text-gray-700 mb-4">
                            PIN de seguimiento
                        </label>
                        <div className="flex justify-center gap-2" onPaste={handlePaste}>
                            {digits.map((d, idx) => (
                                <input
                                    key={idx}
                                    ref={el => inputRefs.current[idx] = el}
                                    type="text"
                                    inputMode="text"
                                    maxLength={1}
                                    value={d}
                                    onChange={e => handleDigit(idx, e.target.value)}
                                    onKeyDown={e => handleKeyDown(idx, e)}
                                    aria-label={`Dígito ${idx + 1} del PIN`}
                                    className={`
                                        w-12 h-14 text-center text-accessible-xl font-bold font-mono
                                        rounded-xl border-2 focus:outline-none transition-all
                                        ${d
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-gray-300 bg-gray-50 text-gray-400'
                                        }
                                        focus:border-primary-500 focus:ring-2 focus:ring-primary-200
                                    `}
                                />
                            ))}
                        </div>
                        {error && (
                            <p className="mt-3 text-center text-red-600 font-medium text-accessible-base animate-pulse" role="alert">
                                ⚠️ {error}
                            </p>
                        )}
                    </div>

                    {/* ── Botón consultar ── */}
                    {!resultado && (
                        <button
                            onClick={handleConsultar}
                            disabled={!pinCompleto || consultando}
                            className={`
                                w-full py-4 rounded-2xl font-bold text-accessible-lg transition-all
                                ${pinCompleto && !consultando
                                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }
                            `}
                        >
                            {consultando ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="inline-flex gap-1">
                                        <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </span>
                                    Consultando base de datos...
                                </span>
                            ) : '🔍 Consultar Estado'}
                        </button>
                    )}

                    {/* ── Línea de tiempo resultado ── */}
                    {resultado && <TimelineResultado data={resultado} onReset={handleReset} onClose={onClose} />}
                </div>
            </div>
        </div>
    );
}

// ─── Línea de tiempo vertical ─────────────────────────────────────────────────
function TimelineResultado({ data, onReset, onClose }) {
    const meta = estadoMeta(data.estado_actual || data.estado || '');

    const eventos = [
        {
            icon: '🚀',
            label: 'Inicio del trámite',
            value: data.fecha_inicio || data.created_at || 'Registrado',
            color: 'text-blue-600',
            bg: 'bg-blue-100',
        },
        {
            icon: meta.icon,
            label: 'Estado actual',
            value: data.estado_actual || data.estado || 'En proceso',
            color: meta.color,
            bg: meta.bg,
            highlight: true,
        },
        {
            icon: '📅',
            label: 'Fecha estimada de finalización',
            value: data.fecha_estimada || data.fecha_fin_estimada || 'Por confirmar',
            color: 'text-gray-600',
            bg: 'bg-gray-100',
        },
    ];

    return (
        <div className="space-y-4 animate-[fadeIn_0.4s_ease-out]">
            {/* PIN badge */}
            <div className="text-center">
                <span className="inline-block bg-amber-100 border border-amber-300 text-amber-800 font-mono font-bold px-4 py-1 rounded-full text-accessible-base">
                    📌 PIN: {data.pin}
                </span>
            </div>

            {/* Timeline */}
            <div className="relative pl-8">
                {/* Línea vertical */}
                <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gray-200" aria-hidden="true" />

                <div className="space-y-5">
                    {eventos.map((ev, i) => (
                        <div key={i} className="relative flex items-start gap-4">
                            {/* Nodo */}
                            <div className={`
                                absolute -left-5 w-7 h-7 rounded-full flex items-center justify-center text-sm
                                border-2 border-white shadow-sm z-10
                                ${ev.bg}
                            `}>
                                {ev.icon}
                            </div>

                            {/* Contenido */}
                            <div className={`
                                flex-1 rounded-2xl p-3 border
                                ${ev.highlight ? `${ev.bg} ${meta.border}` : 'bg-gray-50 border-gray-200'}
                            `}>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                                    {ev.label}
                                </p>
                                <p className={`font-bold text-accessible-base ${ev.color}`}>
                                    {ev.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mensaje adicional */}
            {data.mensaje && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-accessible-base text-blue-800">
                    {data.mensaje}
                </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onReset}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 font-semibold text-accessible-base hover:border-primary-400 hover:text-primary-700 transition-colors"
                >
                    🔄 Consultar otro PIN
                </button>
                <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-primary-500 text-white font-semibold text-accessible-base hover:bg-primary-600 transition-colors"
                >
                    ✓ Cerrar
                </button>
            </div>
        </div>
    );
}
