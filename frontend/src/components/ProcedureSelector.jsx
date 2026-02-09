/**
 * ProcedureSelector Component
 * Large, accessible buttons for selecting a government procedure
 */

const procedures = [
    {
        id: 'cedula_renovation',
        name: 'Renovación de Cédula',
        icon: '🪪',
        description: 'Renueve su documento de identidad',
        color: 'from-blue-500 to-blue-600',
        time: '5-10 días',
    },
    {
        id: 'acta_nacimiento',
        name: 'Acta de Nacimiento',
        icon: '📄',
        description: 'Solicite una copia de su acta',
        color: 'from-emerald-500 to-emerald-600',
        time: '3-5 días',
    },
    {
        id: 'licencia_conducir',
        name: 'Licencia de Conducir',
        icon: '🚗',
        description: 'Obtenga o renueve su licencia',
        color: 'from-amber-500 to-amber-600',
        time: '1-3 días',
    },
];

export default function ProcedureSelector({ onSelect }) {
    return (
        <div className="card-elevated">
            <h2 className="text-accessible-2xl font-bold text-gray-800 mb-2 text-center">
                ¿Qué trámite necesita?
            </h2>
            <p className="text-accessible-base text-gray-600 text-center mb-6">
                Seleccione una opción o dígalo con su voz
            </p>

            <div className="grid gap-4">
                {procedures.map(procedure => (
                    <button
                        key={procedure.id}
                        onClick={() => onSelect(procedure)}
                        className={`
              w-full p-6 rounded-2xl
              bg-gradient-to-r ${procedure.color}
              text-white text-left
              shadow-lg hover:shadow-xl
              transform hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-200
              focus:ring-4 focus:ring-offset-2 focus:ring-primary-300
            `}
                        aria-label={`Iniciar trámite de ${procedure.name}`}
                    >
                        <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">
                                {procedure.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <h3 className="text-accessible-xl font-bold">
                                    {procedure.name}
                                </h3>
                                <p className="text-white/90 text-accessible-base">
                                    {procedure.description}
                                </p>
                                <p className="text-white/70 text-sm mt-1">
                                    ⏱️ Tiempo estimado: {procedure.time}
                                </p>
                            </div>

                            {/* Arrow */}
                            <div className="text-3xl">
                                →
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Additional help */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-gray-600 text-accessible-base">
                    ¿No encuentra su trámite?{' '}
                    <button className="text-primary-500 font-medium hover:underline">
                        Ver todos los servicios
                    </button>
                </p>
            </div>
        </div>
    );
}
