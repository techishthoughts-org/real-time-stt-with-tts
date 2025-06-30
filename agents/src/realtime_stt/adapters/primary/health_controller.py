"""Health check controller for Go CLI bridge."""

import sys
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    version: str
    services: Dict[str, Any]
    system: Dict[str, Any]


class HealthController:
    """Handles health checks for the system."""

    def __init__(self):
        self.version = "2.0.0"

    def create_router(self) -> APIRouter:
        """Create and configure the FastAPI router."""
        router = APIRouter(tags=["health"])

        @router.get("/health", response_model=HealthResponse)
        async def health_check():
            """Get system health status."""
            return HealthResponse(
                status="healthy",
                timestamp=datetime.now().isoformat() + "Z",
                version=self.version,
                services=self._check_services(),
                system=self._check_system()
            )

        @router.get("/health/detailed")
        async def detailed_health_check():
            """Get detailed system health status."""
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat() + "Z",
                "version": self.version,
                "services": self._check_services(),
                "system": self._check_system(),
                "dependencies": self._check_dependencies(),
                "audio": self._check_audio_devices()
            }

        @router.get("/")
        async def root():
            """Root endpoint."""
            return {
                "message": "🎤 RealtimeSTT Python Backend",
                "version": self.version,
                "docs": "/docs",
                "health": "/health",
                "detailed_health": "/health/detailed"
            }

        return router

    def _check_services(self) -> Dict[str, str]:
        """Check the status of core services."""
        services = {}

        # Check speech processing
        try:
            from src.realtime_stt.domain.services.speech_service import (  # noqa: F401
                SpeechService,
            )
            services["speech_processing"] = "available"
        except ImportError as e:
            services["speech_processing"] = f"error: {str(e)}"

        # Check AI reasoning
        try:
            from src.realtime_stt.domain.services.ai_reasoning_service import (  # noqa: F401
                AIReasoningService,
            )
            services["ai_reasoning"] = "available"
        except ImportError as e:
            services["ai_reasoning"] = f"error: {str(e)}"

        # Check audio capture
        try:
            from src.realtime_stt.infrastructure.audio.realtime_capture import (  # noqa: F401
                RealtimeAudioCapture,
            )
            services["audio_capture"] = "available"
        except ImportError as e:
            services["audio_capture"] = f"error: {str(e)}"

        # Check TTS
        try:
            from src.realtime_stt.infrastructure.tts.text_to_speech_service import (  # noqa: F401
                TextToSpeechService,
            )
            services["text_to_speech"] = "available"
        except ImportError as e:
            services["text_to_speech"] = f"error: {str(e)}"

        return services

    def _check_system(self) -> Dict[str, Any]:
        """Check system information."""
        return {
            "python_version": sys.version,
            "platform": sys.platform,
            "memory_info": self._get_memory_info()
        }

    def _check_dependencies(self) -> Dict[str, str]:
        """Check critical dependencies."""
        deps = {}

        # Check FastAPI
        try:
            import fastapi
            deps["fastapi"] = fastapi.__version__
        except ImportError:
            deps["fastapi"] = "missing"

        # Check sounddevice
        try:
            import sounddevice
            deps["sounddevice"] = sounddevice.__version__
        except ImportError:
            deps["sounddevice"] = "missing"

        # Check numpy
        try:
            import numpy
            deps["numpy"] = numpy.__version__
        except ImportError:
            deps["numpy"] = "missing"

        # Check websockets
        try:
            import websockets
            deps["websockets"] = websockets.__version__
        except ImportError:
            deps["websockets"] = "missing"

        return deps

    def _check_audio_devices(self) -> Dict[str, Any]:
        """Check audio device availability."""
        try:
            import sounddevice as sd
            devices = sd.query_devices()
            input_devices = [d for d in devices if d['max_input_channels'] > 0]
            output_devices = [d for d in devices if d['max_output_channels'] > 0]

            return {
                "total_devices": len(devices),
                "input_devices": len(input_devices),
                "output_devices": len(output_devices),
                "default_input": sd.default.device[0] if sd.default.device[0] is not None else "none",
                "default_output": sd.default.device[1] if sd.default.device[1] is not None else "none",
                "status": "available"
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }

    def _get_memory_info(self) -> Dict[str, Any]:
        """Get basic memory information."""
        try:
            import psutil
            memory = psutil.virtual_memory()
            return {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used
            }
        except ImportError:
            return {"status": "psutil not available"}
        except Exception as e:
            return {"error": str(e)}

    def get_health_status(self) -> dict:
        """Get comprehensive health status of the system."""
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat() + "Z",
            "version": self.version,
            "services": self._check_services(),
            "system": self._check_system()
        }
