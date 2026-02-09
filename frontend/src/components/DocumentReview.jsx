/**
 * DocumentReview Component
 * Shows extracted document data and allows user to edit/correct errors
 * Part of the OCR verification flow
 */

import { useState, useEffect } from 'react';

export default function DocumentReview({
    documentType = 'cedula',
    extractedData = {},
    documentImage,
    onConfirm,
    onRetry,
    onClose
}) {
    // Editable fields state - initialize from extracted data
    const [formData, setFormData] = useState({});
    const [editingField, setEditingField] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Field configurations by document type
    const fieldConfigs = {
        cedula: [
            { key: 'nombre', label: 'Nombre Completo', icon: '👤', required: true },
            { key: 'cedula', label: 'Número de Cédula', icon: '🪪', required: true, format: 'cedula' },
            { key: 'fecha_nacimiento', label: 'Fecha de Nacimiento', icon: '📅', required: true, format: 'date' },
            { key: 'lugar_nacimiento', label: 'Lugar de Nacimiento', icon: '📍', required: false },
            { key: 'sexo', label: 'Sexo', icon: '⚧', required: true },
            { key: 'estado_civil', label: 'Estado Civil', icon: '💍', required: false },
            { key: 'fecha_expiracion', label: 'Fecha de Expiración', icon: '⏰', required: true, format: 'date' },
        ],
        passport: [
            { key: 'nombre', label: 'Nombre Completo', icon: '👤', required: true },
            { key: 'pasaporte', label: 'Número de Pasaporte', icon: '🛂', required: true },
            { key: 'nacionalidad', label: 'Nacionalidad', icon: '🌍', required: true },
            { key: 'fecha_nacimiento', label: 'Fecha de Nacimiento', icon: '📅', required: true, format: 'date' },
            { key: 'fecha_emision', label: 'Fecha de Emisión', icon: '📆', required: true, format: 'date' },
            { key: 'fecha_expiracion', label: 'Fecha de Expiración', icon: '⏰', required: true, format: 'date' },
        ],
        license: [
            { key: 'nombre', label: 'Nombre Completo', icon: '👤', required: true },
            { key: 'licencia', label: 'Número de Licencia', icon: '🚗', required: true },
            { key: 'categoria', label: 'Categoría', icon: '📋', required: true },
            { key: 'fecha_nacimiento', label: 'Fecha de Nacimiento', icon: '📅', required: true, format: 'date' },
            { key: 'fecha_expiracion', label: 'Fecha de Expiración', icon: '⏰', required: true, format: 'date' },
            { key: 'restricciones', label: 'Restricciones', icon: '⚠️', required: false },
        ],
        acta: [
            { key: 'nombre', label: 'Nombre Completo', icon: '👤', required: true },
            { key: 'fecha_nacimiento', label: 'Fecha de Nacimiento', icon: '📅', required: true, format: 'date' },
            { key: 'lugar_nacimiento', label: 'Lugar de Nacimiento', icon: '📍', required: true },
            { key: 'nombre_padre', label: 'Nombre del Padre', icon: '👨', required: false },
            { key: 'nombre_madre', label: 'Nombre de la Madre', icon: '👩', required: false },
            { key: 'numero_acta', label: 'Número de Acta', icon: '📄', required: true },
            { key: 'registro_civil', label: 'Registro Civil', icon: '🏛️', required: true },
        ]
    };

    const fields = fieldConfigs[documentType] || fieldConfigs.cedula;

    // Initialize form data from extracted data
    useEffect(() => {
        const initialData = {};
        fields.forEach(field => {
            initialData[field.key] = extractedData[field.key] || '';
        });
        setFormData(initialData);
    }, [extractedData]);

    // Handle field change
    const handleFieldChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
        setHasChanges(true);
    };

    // Format display value
    const formatDisplayValue = (value, format) => {
        if (!value) return '—';

        if (format === 'cedula') {
            // Format as XXX-XXXXXXX-X
            const cleaned = value.replace(/\D/g, '');
            if (cleaned.length >= 11) {
                return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 10)}-${cleaned.slice(10, 11)}`;
            }
        }

        return value;
    };

    // Validate required fields
    const validateForm = () => {
        const errors = [];
        fields.forEach(field => {
            if (field.required && !formData[field.key]?.trim()) {
                errors.push(field.label);
            }
        });
        return errors;
    };

    // Handle confirm
    const handleConfirm = async () => {
        const errors = validateForm();

        if (errors.length > 0) {
            alert(`Por favor complete los campos requeridos:\n${errors.join('\n')}`);
            return;
        }

        setIsConfirming(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        onConfirm?.(formData, hasChanges);
    };

    // Calculate confidence score (simulated)
    const getConfidenceScore = () => {
        let filledFields = 0;
        let totalRequired = 0;

        fields.forEach(field => {
            if (field.required) {
                totalRequired++;
                if (extractedData[field.key]) filledFields++;
            }
        });

        return Math.round((filledFields / Math.max(totalRequired, 1)) * 100);
    };

    const confidence = getConfidenceScore();

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl my-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 rounded-t-3xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-accessible-xl font-bold flex items-center gap-2">
                                📋 Revisar Datos Extraídos
                            </h2>
                            <p className="mt-1 opacity-90">
                                Verifique y corrija la información si es necesario
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Confidence indicator */}
                    <div className="mt-4 bg-white/10 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Confianza del escaneo</span>
                            <span className={`text-sm font-bold ${confidence >= 80 ? 'text-green-300' :
                                    confidence >= 50 ? 'text-yellow-300' : 'text-red-300'
                                }`}>
                                {confidence}%
                            </span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${confidence >= 80 ? 'bg-green-400' :
                                        confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                                    }`}
                                style={{ width: `${confidence}%` }}
                            />
                        </div>
                        {confidence < 80 && (
                            <p className="text-xs mt-2 opacity-80">
                                ⚠️ Algunos datos pueden necesitar corrección
                            </p>
                        )}
                    </div>
                </div>

                {/* Document preview (if available) */}
                {documentImage && (
                    <div className="p-4 border-b bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Documento escaneado:</p>
                        <div className="relative h-32 bg-gray-200 rounded-xl overflow-hidden">
                            <img
                                src={documentImage}
                                alt="Documento escaneado"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                )}

                {/* Editable fields */}
                <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-xl">
                        <span className="text-xl">✏️</span>
                        <p className="text-sm text-blue-800">
                            <strong>Toque cualquier campo</strong> para editar si hay errores
                        </p>
                    </div>

                    {fields.map((field) => (
                        <div
                            key={field.key}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${editingField === field.key
                                    ? 'border-primary-500 bg-primary-50 shadow-lg'
                                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                                }`}
                            onClick={() => setEditingField(field.key)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                    <span>{field.icon}</span>
                                    {field.label}
                                    {field.required && <span className="text-red-500">*</span>}
                                </label>
                                {editingField !== field.key && formData[field.key] && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        ✏️ Toque para editar
                                    </span>
                                )}
                            </div>

                            {editingField === field.key ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData[field.key] || ''}
                                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                        placeholder={`Ingrese ${field.label.toLowerCase()}`}
                                        className="flex-1 px-4 py-3 rounded-lg border-2 border-primary-300 focus:border-primary-500 focus:outline-none text-accessible-base"
                                        autoFocus
                                        onBlur={() => setEditingField(null)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') setEditingField(null);
                                        }}
                                    />
                                </div>
                            ) : (
                                <p className={`text-accessible-lg font-semibold ${formData[field.key] ? 'text-gray-800' : 'text-red-400'
                                    }`}>
                                    {formData[field.key]
                                        ? formatDisplayValue(formData[field.key], field.format)
                                        : '(Campo vacío - toque para agregar)'}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Action buttons */}
                <div className="p-6 bg-gray-50 rounded-b-3xl border-t">
                    {hasChanges && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-2">
                            <span className="text-xl">✏️</span>
                            <p className="text-sm text-yellow-800">
                                Ha realizado cambios en los datos extraídos
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={onRetry}
                            className="flex-1 py-4 px-6 bg-gray-200 text-gray-700 rounded-xl font-medium text-accessible-base hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                            📷 Volver a Escanear
                        </button>

                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold text-accessible-base shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isConfirming ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Confirmando...
                                </>
                            ) : (
                                <>
                                    ✅ Confirmar Datos
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-center text-xs text-gray-500 mt-4">
                        🔒 Sus datos están protegidos y cifrados
                    </p>
                </div>
            </div>
        </div>
    );
}
