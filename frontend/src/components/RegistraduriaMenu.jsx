/**
 * RegistraduriaMenu Component
 * ============================
 * Dashboard de servicios de la Registraduría Nacional de Colombia
 * con diseño institucional, alto contraste y accesibilidad para adultos mayores.
 */

import { useState } from 'react';

const SERVICIOS = [
    {
        id: 'identificacion',
        nombre: 'Identificación',
        icono: '🪪',
        color: 'from-blue-700 to-blue-800',
        colorBorde: 'border-blue-600',
        colorBg: 'bg-blue-50',
        descripcion: 'Cédula de Ciudadanía y Tarjeta de Identidad',
        subservicios: [
            {
                id: 'cedula_primera_vez',
                nombre: 'Cédula — Primera Vez',
                icono: '✨',
                descripcion: 'Para mayores de 18 años',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: '15 días hábiles',
            },
            {
                id: 'cedula_duplicado',
                nombre: 'Cédula — Duplicado',
                icono: '🔄',
                descripcion: 'Por pérdida, hurto o deterioro',
                tarifa: '$51.900 COP',
                tarifaColor: 'text-amber-700 bg-amber-100',
                tiempo: '15 días hábiles',
                requiereBiometria: true,
            },
            {
                id: 'cedula_rectificacion',
                nombre: 'Cédula — Rectificación',
                icono: '✏️',
                descripcion: 'Corrección de datos erróneos',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: '30 días hábiles',
            },
            {
                id: 'cedula_renovacion',
                nombre: 'Cédula — Renovación',
                icono: '🔃',
                descripcion: 'Actualización o cambio de datos',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: '15 días hábiles',
            },
            {
                id: 'tarjeta_identidad',
                nombre: 'Tarjeta de Identidad',
                icono: '👶',
                descripcion: 'Para menores de 7 a 17 años',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: '15 días hábiles',
            },
        ],
    },
    {
        id: 'registro_civil',
        nombre: 'Registro Civil',
        icono: '📋',
        color: 'from-emerald-700 to-emerald-800',
        colorBorde: 'border-emerald-600',
        colorBg: 'bg-emerald-50',
        descripcion: 'Nacimiento, Matrimonio, Defunción y Apostilla',
        subservicios: [
            {
                id: 'inscripcion_nacimiento',
                nombre: 'Inscripción de Nacimiento',
                icono: '🍼',
                descripcion: 'Registro de recién nacidos',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: 'Inmediato',
            },
            {
                id: 'copia_nacimiento',
                nombre: 'Copia — Nacimiento',
                icono: '📄',
                descripcion: 'Copia auténtica del registro',
                tarifa: '$6.900 COP',
                tarifaColor: 'text-amber-700 bg-amber-100',
                tiempo: '1-3 días',
            },
            {
                id: 'copia_matrimonio',
                nombre: 'Copia — Matrimonio',
                icono: '💍',
                descripcion: 'Copia auténtica del registro',
                tarifa: '$6.900 COP',
                tarifaColor: 'text-amber-700 bg-amber-100',
                tiempo: '1-3 días',
            },
            {
                id: 'copia_defuncion',
                nombre: 'Copia — Defunción',
                icono: '📜',
                descripcion: 'Copia auténtica del registro',
                tarifa: '$6.900 COP',
                tarifaColor: 'text-amber-700 bg-amber-100',
                tiempo: '1-3 días',
            },
            {
                id: 'apostilla',
                nombre: 'Apostilla',
                icono: '🌍',
                descripcion: 'Legalización para el exterior',
                tarifa: '$51.900 COP',
                tarifaColor: 'text-amber-700 bg-amber-100',
                tiempo: '3-5 días hábiles',
            },
        ],
    },
    {
        id: 'consultas',
        nombre: 'Consultas',
        icono: '🔍',
        color: 'from-violet-700 to-violet-800',
        colorBorde: 'border-violet-600',
        colorBg: 'bg-violet-50',
        descripcion: 'Estado de documentos y ubicación de oficinas',
        subservicios: [
            {
                id: 'estado_documento',
                nombre: 'Estado de mi Documento',
                icono: '📊',
                descripcion: 'Consulte el progreso de su trámite',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: 'Inmediato',
            },
            {
                id: 'ubicacion_oficinas',
                nombre: 'Ubicación de Oficinas',
                icono: '📍',
                descripcion: 'Encuentre la sede más cercana',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: 'Inmediato',
            },
        ],
    },
    {
        id: 'citas_tarifas',
        nombre: 'Citas y Tarifas',
        icono: '📅',
        color: 'from-rose-700 to-rose-800',
        colorBorde: 'border-rose-600',
        colorBg: 'bg-rose-50',
        descripcion: 'Agendamiento y consulta de costos',
        subservicios: [
            {
                id: 'agendar_cita',
                nombre: 'Agendar Cita',
                icono: '🗓️',
                descripcion: 'Reserve su turno en la oficina',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: 'Inmediato',
            },
            {
                id: 'consultar_tarifas',
                nombre: 'Consultar Tarifas',
                icono: '💰',
                descripcion: 'Tarifas vigentes 2024',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: 'Inmediato',
            },
            {
                id: 'verificar_exoneracion',
                nombre: 'Verificar Exoneración',
                icono: '🆓',
                descripcion: 'Víctimas, adultos mayores, discapacitados',
                tarifa: 'GRATUITA',
                tarifaColor: 'text-green-700 bg-green-100',
                tiempo: 'Inmediato',
            },
        ],
    },
];

export default function RegistraduriaMenu({ onSelect }) {
    const [expandedCategory, setExpandedCategory] = useState(null);

    const handleCategoryClick = (categoriaId) => {
        setExpandedCategory(prev => prev === categoriaId ? null : categoriaId);
    };

    const handleSubservicioClick = (categoria, subservicio) => {
        onSelect?.({
            id: subservicio.id,
            name: subservicio.nombre,
            categoria: categoria.id,
            categoriaNombre: categoria.nombre,
            icon: subservicio.icono,
            description: subservicio.descripcion,
            tarifa: subservicio.tarifa,
            tiempo: subservicio.tiempo,
            requiereBiometria: subservicio.requiereBiometria || false,
            color: categoria.color,
        });
    };

    return (
        <div className="card-elevated">
            {/* Header institucional */}
            <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                    {/* Colores de Colombia */}
                    <div className="flex gap-1">
                        <div className="w-3 h-8 bg-yellow-400 rounded-sm" />
                        <div className="w-3 h-8 bg-blue-700 rounded-sm" />
                        <div className="w-3 h-8 bg-red-600 rounded-sm" />
                    </div>
                    <div>
                        <h2 className="text-accessible-2xl font-bold text-gray-800 leading-tight">
                            Registraduría Nacional
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">
                            del Estado Civil de Colombia
                        </p>
                    </div>
                </div>
                <p className="text-accessible-base text-gray-600">
                    Seleccione el servicio que necesita o dígalo con su voz
                </p>
            </div>

            {/* Grid de categorías */}
            <div className="space-y-3">
                {SERVICIOS.map(categoria => (
                    <div key={categoria.id} className={`rounded-2xl border-2 ${categoria.colorBorde} overflow-hidden transition-all duration-300`}>
                        {/* Botón de categoría */}
                        <button
                            onClick={() => handleCategoryClick(categoria.id)}
                            className={`w-full p-5 bg-gradient-to-r ${categoria.color} text-white text-left flex items-center gap-4 hover:opacity-95 active:opacity-90 transition-opacity`}
                            aria-expanded={expandedCategory === categoria.id}
                            aria-label={`${categoria.nombre}: ${categoria.descripcion}`}
                        >
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                                {categoria.icono}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-accessible-xl font-bold">{categoria.nombre}</h3>
                                <p className="text-white/85 text-accessible-base">{categoria.descripcion}</p>
                            </div>
                            <div className={`text-2xl transition-transform duration-300 ${expandedCategory === categoria.id ? 'rotate-90' : ''}`}>
                                ›
                            </div>
                        </button>

                        {/* Sub-servicios expandibles */}
                        {expandedCategory === categoria.id && (
                            <div className={`${categoria.colorBg} p-3 space-y-2`}>
                                {categoria.subservicios.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleSubservicioClick(categoria, sub)}
                                        className="w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-md active:scale-[0.99] transition-all duration-150 text-left flex items-center gap-3"
                                        aria-label={`${sub.nombre}: ${sub.descripcion}. Tarifa: ${sub.tarifa}`}
                                    >
                                        <span className="text-2xl flex-shrink-0">{sub.icono}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-gray-800 text-accessible-base">
                                                    {sub.nombre}
                                                </span>
                                                {sub.requiereBiometria && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                        🔐 Biométrico
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-500 text-sm">{sub.descripcion}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sub.tarifaColor}`}>
                                                    {sub.tarifa}
                                                </span>
                                                <span className="text-xs text-gray-400">⏱️ {sub.tiempo}</span>
                                            </div>
                                        </div>
                                        <span className="text-gray-400 text-xl flex-shrink-0">›</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Pie de página con línea de atención */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-gray-700 text-accessible-base font-medium">
                        📞 Línea de atención gratuita
                    </p>
                    <p className="text-blue-700 text-accessible-xl font-bold">
                        01 8000 111 555
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                        Lunes a Viernes 8:00 AM – 4:00 PM
                    </p>
                </div>
            </div>
        </div>
    );
}
