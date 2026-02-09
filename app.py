#!/usr/bin/env python3
"""
IDENTIA - Main Application Entry Point
=======================================
Ecosistema de Identidad y Asistencia Ciudadana

This is the main entry point that unifies:
- Backend API server (FastAPI)
- Frontend build serving
- Configuration management

Usage:
    python app.py                    # Run in development mode
    python app.py --prod             # Run in production mode
    python app.py --help             # Show help

Security Restriction:
    Under no circumstances should PII data leave the local environment
    without being anonymized through the security module.
"""

import os
import sys
import argparse
import asyncio
import subprocess
from pathlib import Path

# Add project paths
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# Configuration
class Config:
    """Application configuration"""
    
    # Development settings
    DEV_BACKEND_HOST = "0.0.0.0"
    DEV_BACKEND_PORT = 8000
    DEV_FRONTEND_PORT = 3000
    
    # Production settings
    PROD_BACKEND_HOST = "0.0.0.0"
    PROD_BACKEND_PORT = 80
    
    # Paths
    BACKEND_DIR = PROJECT_ROOT / "backend"
    FRONTEND_DIR = PROJECT_ROOT / "frontend"
    FRONTEND_DIST = FRONTEND_DIR / "dist"
    
    # Security
    ANONYMIZATION_ENABLED = True
    PII_LOGGING_ENABLED = False  # Never log PII
    
    # LLM Configuration
    LLM_PROVIDER = os.getenv("IDENTIA_LLM_PROVIDER", "gemini")
    LLM_API_KEY = os.getenv("IDENTIA_LLM_API_KEY", "")
    LLM_CONTEXT_WINDOW = 131072  # 131K tokens
    
    @classmethod
    def validate(cls):
        """Validate configuration"""
        errors = []
        
        if not cls.BACKEND_DIR.exists():
            errors.append(f"Backend directory not found: {cls.BACKEND_DIR}")
        
        if not cls.FRONTEND_DIR.exists():
            errors.append(f"Frontend directory not found: {cls.FRONTEND_DIR}")
        
        if errors:
            print("Configuration errors:")
            for error in errors:
                print(f"  ❌ {error}")
            sys.exit(1)
        
        return True


def print_banner():
    """Print application banner"""
    banner = """
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ██╗██████╗ ███████╗███╗   ██╗████████╗██╗ █████╗               ║
║   ██║██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██║██╔══██╗              ║
║   ██║██║  ██║█████╗  ██╔██╗ ██║   ██║   ██║███████║              ║
║   ██║██║  ██║██╔══╝  ██║╚██╗██║   ██║   ██║██╔══██║              ║
║   ██║██████╔╝███████╗██║ ╚████║   ██║   ██║██║  ██║              ║
║   ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═╝              ║
║                                                                  ║
║   Ecosistema de Identidad y Asistencia Ciudadana                 ║
║   🔒 Datos Protegidos | 🌐 Accesible 24/7 | 🤖 IA Multimodal     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    """
    print(banner)


def run_backend(production: bool = False):
    """Run the FastAPI backend server"""
    import uvicorn
    
    host = Config.PROD_BACKEND_HOST if production else Config.DEV_BACKEND_HOST
    port = Config.PROD_BACKEND_PORT if production else Config.DEV_BACKEND_PORT
    
    print(f"🚀 Starting backend server on http://{host}:{port}")
    print(f"📚 API docs available at http://{host}:{port}/docs")
    
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=not production,
        log_level="info" if production else "debug"
    )


def run_frontend_dev():
    """Run the frontend development server"""
    print(f"🎨 Starting frontend dev server on http://localhost:{Config.DEV_FRONTEND_PORT}")
    
    os.chdir(Config.FRONTEND_DIR)
    
    # Check if node_modules exists
    if not (Config.FRONTEND_DIR / "node_modules").exists():
        print("📦 Installing frontend dependencies...")
        subprocess.run(["npm", "install"], check=True)
    
    subprocess.run(["npm", "run", "dev"])


def build_frontend():
    """Build the frontend for production"""
    print("🔨 Building frontend for production...")
    
    os.chdir(Config.FRONTEND_DIR)
    
    # Install dependencies if needed
    if not (Config.FRONTEND_DIR / "node_modules").exists():
        subprocess.run(["npm", "install"], check=True)
    
    subprocess.run(["npm", "run", "build"], check=True)
    
    print(f"✅ Frontend built successfully at {Config.FRONTEND_DIST}")


def run_development():
    """Run both backend and frontend in development mode"""
    import concurrent.futures
    
    print_banner()
    print("🔧 Running in DEVELOPMENT mode\n")
    Config.validate()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        # Run backend
        backend_future = executor.submit(run_backend, False)
        
        # Give backend time to start
        import time
        time.sleep(2)
        
        # Run frontend in a subprocess so it can be interactive
        print("\n" + "="*60)
        run_frontend_dev()


def run_production():
    """Run in production mode with built frontend"""
    print_banner()
    print("🚀 Running in PRODUCTION mode\n")
    Config.validate()
    
    # Build frontend if needed
    if not Config.FRONTEND_DIST.exists():
        build_frontend()
    
    # Run backend (which will serve static files)
    run_backend(production=True)


def show_status():
    """Show system status"""
    print_banner()
    print("\n📊 System Status\n")
    
    checks = [
        ("Backend directory", Config.BACKEND_DIR.exists()),
        ("Frontend directory", Config.FRONTEND_DIR.exists()),
        ("Frontend build", Config.FRONTEND_DIST.exists()),
        ("LLM API Key configured", bool(Config.LLM_API_KEY)),
        ("Anonymization enabled", Config.ANONYMIZATION_ENABLED),
    ]
    
    for name, passed in checks:
        status = "✅" if passed else "❌"
        print(f"  {status} {name}")
    
    print("\n📁 Project Structure:")
    print(f"  Root: {PROJECT_ROOT}")
    print(f"  Backend: {Config.BACKEND_DIR}")
    print(f"  Frontend: {Config.FRONTEND_DIR}")
    print(f"  AI Modules: {PROJECT_ROOT / 'ai_modules'}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="IDENTIA - Ecosistema de Identidad y Asistencia Ciudadana"
    )
    
    parser.add_argument(
        "--prod", 
        action="store_true",
        help="Run in production mode"
    )
    
    parser.add_argument(
        "--backend-only",
        action="store_true", 
        help="Run only the backend server"
    )
    
    parser.add_argument(
        "--frontend-only",
        action="store_true",
        help="Run only the frontend dev server"
    )
    
    parser.add_argument(
        "--build",
        action="store_true",
        help="Build the frontend for production"
    )
    
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show system status"
    )
    
    args = parser.parse_args()
    
    try:
        if args.status:
            show_status()
        elif args.build:
            build_frontend()
        elif args.backend_only:
            print_banner()
            Config.validate()
            run_backend(production=args.prod)
        elif args.frontend_only:
            print_banner()
            run_frontend_dev()
        elif args.prod:
            run_production()
        else:
            run_development()
    except KeyboardInterrupt:
        print("\n\n👋 ¡Hasta luego! IDENTIA se ha detenido.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
