/**
 * StatusPanel Component
 * Traffic-light style status display for procedure progress
 * Simplified with large icons and clear text
 */

export default function StatusPanel({ procedure, steps, currentStep }) {
    // Status colors and icons
    const statusConfig = {
        pending: {
            color: 'bg-gray-200 text-gray-500',
            icon: '⚪',
            label: 'Pendiente'
        },
        current: {
            color: 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400',
            icon: '🟡',
            label: 'En proceso'
        },
        complete: {
            color: 'bg-green-100 text-green-700',
            icon: '🟢',
            label: 'Completado'
        },
        error: {
            color: 'bg-red-100 text-red-700',
            icon: '🔴',
            label: 'Error'
        },
    };

    return (
        <div className="card-elevated sticky top-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">📋</span>
                </div>
                <div>
                    <h2 className="text-accessible-lg font-bold text-gray-800">
                        Estado del Trámite
                    </h2>
                    {procedure && (
                        <p className="text-gray-600">{procedure.name}</p>
                    )}
                </div>
            </div>

            {/* Progress indicator */}
            {procedure && (
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progreso</span>
                        <span>{Math.round((currentStep / steps.length) * 100)}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                            style={{ width: `${(currentStep / steps.length) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Steps list */}
            <div className="space-y-3">
                {steps.map((step, index) => {
                    const config = statusConfig[step.status];
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={step.id} className="relative">
                            {/* Connector line */}
                            {!isLast && (
                                <div
                                    className={`absolute left-5 top-12 w-0.5 h-8 ${step.status === 'complete' ? 'bg-green-400' : 'bg-gray-200'
                                        }`}
                                />
                            )}

                            {/* Step item */}
                            <div
                                className={`flex items-center gap-4 p-3 rounded-xl transition-all ${config.color}`}
                                role="listitem"
                                aria-current={step.status === 'current' ? 'step' : undefined}
                            >
                                {/* Step number/icon */}
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${step.status === 'complete' ? 'bg-green-500 text-white' :
                                            step.status === 'current' ? 'bg-yellow-500 text-white animate-pulse' :
                                                step.status === 'error' ? 'bg-red-500 text-white' :
                                                    'bg-gray-300 text-gray-600'
                                        }`}
                                >
                                    {step.status === 'complete' ? '✓' :
                                        step.status === 'error' ? '!' :
                                            index + 1}
                                </div>

                                {/* Step content */}
                                <div className="flex-1">
                                    <p className="text-accessible-base font-medium">
                                        {step.name}
                                    </p>
                                    <p className="text-sm opacity-80">
                                        {config.label}
                                    </p>
                                </div>

                                {/* Status emoji */}
                                <span className="text-xl" aria-hidden="true">
                                    {config.icon}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Help section */}
            <div className="mt-6 pt-4 border-t-2 border-gray-100">
                <button
                    className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl 
                     text-gray-700 text-accessible-base font-medium
                     flex items-center justify-center gap-2 transition-colors"
                    aria-label="Obtener ayuda"
                >
                    <span>❓</span>
                    ¿Necesita ayuda?
                </button>
            </div>

            {/* Contact info */}
            {procedure && (
                <div className="mt-4 p-4 bg-primary-50 rounded-xl">
                    <p className="text-sm text-primary-700 font-medium mb-2">
                        📞 Línea de ayuda:
                    </p>
                    <p className="text-accessible-lg font-bold text-primary-500">
                        809-555-IDENTIA
                    </p>
                </div>
            )}
        </div>
    );
}
