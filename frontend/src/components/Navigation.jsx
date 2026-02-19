/**
 * Navigation.jsx — IDENTIA v1.5
 * ================================
 * Barra de navegación persistente con botones "Volver" e "Inicio".
 * Diseñada para adultos mayores: iconos grandes + etiquetas claras.
 */

export default function Navigation({ onBack, onHome, canGoBack }) {
    return (
        <nav
            className="flex items-center gap-3 py-3 px-2 mb-2"
            aria-label="Navegación del asistente"
        >
            {/* ── Volver ── */}
            <button
                onClick={onBack}
                disabled={!canGoBack}
                aria-label="Volver al paso anterior"
                className={`
                    flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-accessible-base
                    transition-all duration-200 select-none
                    ${canGoBack
                        ? 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary-400 hover:text-primary-700 hover:shadow-md active:scale-95'
                        : 'bg-gray-100 border-2 border-gray-200 text-gray-300 cursor-not-allowed'
                    }
                `}
            >
                <span className="text-2xl leading-none" aria-hidden="true">←</span>
                <span>Volver</span>
            </button>

            {/* ── Inicio ── */}
            <button
                onClick={onHome}
                aria-label="Ir al menú principal"
                className="
                    flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-accessible-base
                    bg-white border-2 border-gray-300 text-gray-700
                    hover:border-primary-400 hover:text-primary-700 hover:shadow-md
                    active:scale-95 transition-all duration-200 select-none
                "
            >
                <span className="text-2xl leading-none" aria-hidden="true">🏠</span>
                <span>Inicio</span>
            </button>

            {/* ── Separador visual ── */}
            <div className="flex-1 h-px bg-gray-200 mx-1" aria-hidden="true" />
        </nav>
    );
}
