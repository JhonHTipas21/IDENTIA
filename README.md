# 🪪 IDENTIA

**Ecosistema de Identidad y Asistencia Ciudadana con IA**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18.x-61dafb)
![Python](https://img.shields.io/badge/Python-3.10+-3776ab)

IDENTIA es una plataforma de gobierno digital que utiliza **Inteligencia Artificial Generativa**, **Reconocimiento de Voz** y **Autenticación Biométrica** para simplificar trámites ciudadanos, especialmente diseñada para usuarios de la tercera edad.

---

## ✨ Características Principales

| Característica | Descripción |
|----------------|-------------|
| 🤖 **IA Conversacional** | Asistente virtual con respuestas humanas usando detección de intenciones |
| 🎤 **Reconocimiento de Voz** | Entrada por voz en español con Web Speech API |
| 🔐 **Autenticación Biométrica** | Verificación facial y por voz sin contraseñas |
| 📷 **Escaneo de Documentos** | OCR con campos editables para corregir errores |
| ♿ **Accesibilidad** | Diseño optimizado para adultos mayores |

---

## 🛠️ Tecnologías

### Frontend
- **React 18** + Vite
- **Tailwind CSS** para estilos
- **Web Speech API** para voz

### Backend (Planificado)
- **FastAPI** + Python
- **LangGraph** para flujos de IA
- **Tesseract OCR** para documentos

---

## 🚀 Instalación

### Requisitos
- Node.js 18+
- npm o yarn

### Pasos

```bash
# Clonar el repositorio
git clone https://github.com/JhonHTipas21/IDENTIA.git
cd IDENTIA

# Instalar dependencias del frontend
cd frontend
npm install

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 📁 Estructura del Proyecto

```
IDENTIA/
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes UI
│   │   ├── services/       # API, Voz, etc.
│   │   └── App.jsx         # Componente principal
│   └── package.json
├── backend/                # API FastAPI (planificado)
├── ai_modules/             # Módulos de IA
└── docs/                   # Documentación
```

---

## 📱 Capturas de Pantalla

### Interfaz Principal
- Asistente conversacional con avatar animado
- Panel de estado del trámite
- Botones accesibles de gran tamaño

### Verificación Biométrica
- Modal de reconocimiento facial
- Instrucciones claras paso a paso
- Indicador de confianza

### Revisión de Documentos
- Campos editables para corregir OCR
- Indicador de confianza del escaneo
- Opción de re-escanear

---

## 🎯 Trámites Soportados

- 🪪 Renovación de Cédula
- 📄 Acta de Nacimiento
- 🚗 Licencia de Conducir
- 📋 Otros documentos oficiales

---

## 👨‍💻 Autor

**Jhon Harvey Tipas Solis**

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
