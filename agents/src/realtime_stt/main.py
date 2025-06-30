"""Main application entry point."""

import asyncio
import atexit
import signal
import sys
from typing import Optional

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .adapters.primary.health_controller import HealthController
from .adapters.primary.rest_controller import SpeechController
from .adapters.primary.session_controller import SessionController
from .adapters.primary.websocket_controller import WebSocketController
from .application.use_cases.speech_use_cases import SpeechUseCases

# Enable core AI imports
from .domain.services.ai_reasoning_service import AIReasoningService
from .domain.services.speech_service import SpeechProcessingService
from .infrastructure.models.in_memory_audio_repository import InMemoryAudioRepository
from .infrastructure.observability.logger import observability
from .infrastructure.speech.realtime_stt_repository import RealtimeSTTSpeechRepository

# Global cleanup handlers
_cleanup_handlers = []


def register_cleanup_handler(handler):
    """Register a cleanup handler to be called on application shutdown."""
    global _cleanup_handlers
    _cleanup_handlers.append(handler)


def cleanup_application():
    """Clean up application resources to prevent semaphore leaks."""
    global _cleanup_handlers

    for handler in _cleanup_handlers:
        try:
            handler()
        except Exception as e:
            print(f"Error in cleanup handler: {e}")

    # Clean up event loop executor to prevent semaphore leaks
    try:
        loop = asyncio.get_event_loop()
        if hasattr(loop, '_default_executor') and loop._default_executor:
            executor = loop._default_executor
            executor.shutdown(wait=True)
            loop._default_executor = None
    except Exception as e:
        print(f"Error cleaning up executor: {e}")


def setup_signal_handlers():
    """Set up signal handlers for graceful shutdown."""
    def signal_handler(signum, frame):
        print(f"Received signal {signum}, cleaning up...")
        cleanup_application()
        sys.exit(0)

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)


def create_app(
    model: str = "tiny",
    device: str = "cpu",
    input_device_index: Optional[int] = None,
    output_device_index: Optional[int] = None,
) -> FastAPI:
    """Create and configure the FastAPI application."""

    observability.log_event("fastapi_app_creation_started")

    # Create FastAPI app
    app = FastAPI(
        title="RealtimeSTT Python Backend",
        version="2.0.0",
        description=(
            "🎤 Python backend for RealtimeSTT with Go CLI bridge support"
        ),
    )

    # Add CORS middleware for Go CLI
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, be more specific
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add health controller (works fine)
    health_controller = HealthController()
    app.include_router(health_controller.create_router())

    # Re-enable core services step by step
    # Infrastructure layer - repositories
    speech_repository = RealtimeSTTSpeechRepository(
        model=model,
        device=device,
        use_vad=True,
        input_device_index=input_device_index,
        output_device_index=output_device_index,
    )
    audio_repository = InMemoryAudioRepository()

    # Domain layer - services
    speech_service = SpeechProcessingService(
        speech_repository=speech_repository,
        audio_repository=audio_repository,
    )

    # Initialize AI service with RAG capabilities
    ai_service = AIReasoningService(
        model="gpt-3.5-turbo",
        local_model_type="auto",  # Will try Ollama first, fallback to HF
        local_model_name="llama3.2:3b"
    )

    # Application layer - use cases
    speech_use_cases = SpeechUseCases(speech_service)

    # Controllers for Go CLI bridge - now using real AI service
    session_controller = SessionController(speech_use_cases, ai_service)
    speech_controller = SpeechController(speech_use_cases)
    websocket_controller = WebSocketController(speech_use_cases, ai_service)

    # Add routers
    app.include_router(session_controller.create_router())
    app.include_router(speech_controller.create_router())
    app.include_router(websocket_controller.create_router())

    # Add basic endpoints for testing
    @app.get("/")
    async def root():
        return {"message": "RealtimeSTT Python Backend", "status": "speech_services_enabled"}

    @app.get("/devices")
    async def list_devices():
        # Use the speech repository to get actual device info
        devices = speech_repository.get_available_devices()
        return {"devices": devices, "message": "Available audio devices"}

    # Store websocket manager for access in other parts of the app
    app.state.websocket_manager = websocket_controller.get_manager()

    # Register cleanup handlers for the services
    register_cleanup_handler(lambda: speech_repository.cleanup())

    # Add application lifecycle handlers
    @app.on_event("shutdown")
    async def shutdown_event():
        """Handle application shutdown."""
        cleanup_application()

    observability.log_event("fastapi_app_created", model=model, device=device)
    return app


def main():
    """Run the application."""
    # Set up cleanup handlers
    setup_signal_handlers()
    atexit.register(cleanup_application)

    app = create_app()

    print("🚀 Starting RealtimeSTT Python Backend (Speech Services Enabled)...")
    print("📡 Go CLI can connect to: http://localhost:8000")
    print("📋 API Documentation: http://localhost:8000/docs")

    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
            reload=False,  # Set to True for development
        )
    finally:
        cleanup_application()


if __name__ == "__main__":
    main()
