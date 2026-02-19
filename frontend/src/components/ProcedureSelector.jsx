/**
 * ProcedureSelector Component — Registraduría Nacional de Colombia
 * Selector rápido de los 8 servicios principales con accesibilidad para adultos mayores.
 */

const procedures = [
    // Identificación
    {
        id: 'cedula_primera_vez',
        name: 'Cédula — Primera Vez',
        icon: '🪪',
        description: 'Expida su cédula por primera vez',
        color: 'from-blue-600 to-blue-700',
        time: '15 días hábiles',
        tarifa: 'GRATUITA',
        categoria: 'identificacion',
    },
    {
        id: 'cedula_duplicado',
        name: 'Cédula — Duplicado',
        icon: '🔄',
        description: 'Por pérdida, hurto o deterioro',
        color: 'from-blue-500 to-blue-600',
        time: '15 días hábiles',
        tarifa: '$51.900 COP',
        categoria: 'identificacion',
        requiereBiometria: true,
    },
    {
        id: 'cedula_renovacion',
        name: 'Cédula — Renovación',
        icon: '🔃',
        description: 'Actualice su documento de identidad',
        color: 'from-sky-600 to-sky-700',
        time: '15 días hábiles',
        tarifa: 'GRATUITA',
        categoria: 'identificacion',
    },
    {
        id: 'tarjeta_identidad',
        name: 'Tarjeta de Identidad',
        icon: '👶',
        description: 'Para menores de 7 a 17 años',
        color: 'from-cyan-600 to-cyan-700',
        time: '15 días hábiles',
        tarifa: 'GRATUITA',
        categoria: 'identificacion',
    },
    // Registro Civil
    {
        id: 'copia_nacimiento',
        name: 'Registro de Nacimiento',
        icon: '📄',
        description: 'Inscripción o copia auténtica',
        color: 'from-emerald-600 to-emerald-700',
        time: 'Inmediato / 1-3 días',
        tarifa: 'Desde GRATUITA',
        categoria: 'registro_civil',
    },
    {
        id: 'copia_matrimonio',
        name: 'Registro de Matrimonio',
        icon: '💍',
        description: 'Copia auténtica del registro',
        color: 'from-teal-600 to-teal-700',
        time: '1-3 días',
        tarifa: '$6.900 COP',
        categoria: 'registro_civil',
    },
    {
        id: 'apostilla',
        name: 'Apostilla',
        icon: '🌍',
        description: 'Legalización para el exterior',
        color: 'from-violet-600 to-violet-700',
        time: '3-5 días hábiles',
        tarifa: '$51.900 COP',
        categoria: 'registro_civil',
    },
    // Consultas y Citas
    {
        id: 'estado_documento',
        name: 'Estado de mi Trámite',
        icon: '🔍',
        description: 'Consulte el progreso de su documento',
        color: 'from-amber-600 to-amber-700',
        time: 'Inmediato',
        tarifa: 'GRATUITA',
        categoria: 'consultas',
    },
    {
        id: 'agendar_cita',
        name: 'Agendar Cita',
        icon: '📅',
        description: 'Reserve su turno en la oficina',
        color: 'from-rose-600 to-rose-700',
        time: 'Inmediato',
        tarifa: 'GRATUITA',
        categoria: 'citas_tarifas',
    },
    {
        id: 'consultar_tarifas',
        name: 'Tarifas y Exoneraciones',
        icon: '💰',
        description: 'Costos y quiénes están exonerados',
        color: 'from-orange-600 to-orange-700',
        time: 'Inmediato',
        tarifa: 'GRATUITA',
        categoria: 'citas_tarifas',
    },
];

const CATEGORIAS = [
    { id: 'identificacion', label: '🪪 Identificación' },
    { id: 'registro_civil', label: '📋 Registro Civil' },
    { id: 'consultas', label: '🔍 Consultas' },
    { id: 'citas_tarifas', label: '📅 Citas y Tarifas' },
];

export default function ProcedureSelector({ onSelect }) {
    return (
        <div className="card-elevated">
            <div className="text-center mb-6">
                <h2 className="text-accessible-2xl font-bold text-gray-800 mb-1">
                    ¿Qué trámite necesita?
                </h2>
                <p className="text-accessible-base text-gray-600">
                    Seleccione una opción o dígalo con su voz
                </p>
            </div>

            {/* Servicios agrupados por categoría */}
            {CATEGORIAS.map(cat => {
                const items = procedures.filter(p => p.categoria === cat.id);
                return (
                    <div key={cat.id} className="mb-5">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                            {cat.label}
                        </h3>
                        <div className="grid gap-3">
                            {items.map(procedure => (
                                <button
                                    key={procedure.id}
                                    onClick={() => onSelect(procedure)}
                                    className={`
                                        w-full p-5 rounded-2xl
                                        bg-gradient-to-r ${procedure.color}
                                        text-white text-left
                                        shadow-md hover:shadow-xl
                                        transform hover:scale-[1.02] active:scale-[0.98]
                                        transition-all duration-200
                                        focus:ring-4 focus:ring-offset-2 focus:ring-primary-300
                                    `}
                                    aria-label={`${procedure.name}: ${procedure.description}. Tarifa: ${procedure.tarifa}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Icono */}
                                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                                            {procedure.icon}
                                        </div>

                                        {/* Contenido */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-accessible-lg font-bold">
                                                    {procedure.name}
                                                </h4>
                                                {procedure.requiereBiometria && (
                                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                                        🔐 Biométrico
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-white/85 text-accessible-base">
                                                {procedure.description}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${procedure.tarifa === 'GRATUITA' || procedure.tarifa.startsWith('Desde GRATUITA')
                                                        ? 'bg-green-400/30 text-white'
                                                        : 'bg-white/20 text-white'
                                                    }`}>
                                                    {procedure.tarifa}
                                                </span>
                                                <span className="text-white/70 text-xs">
                                                    ⏱️ {procedure.time}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-3xl flex-shrink-0">→</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Ayuda adicional */}
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <p className="text-gray-600 text-accessible-base">
                    ¿Necesita más opciones?{' '}
                    <button
                        className="text-primary-500 font-medium hover:underline"
                        onClick={() => onSelect({ id: 'ver_todos', name: 'Ver todos los servicios' })}
                    >
                        Ver menú completo
                    </button>
                </p>
            </div>
        </div>
    );
}
