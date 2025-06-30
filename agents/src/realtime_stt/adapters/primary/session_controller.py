"""Session management controller for Go CLI bridge."""

import uuid
from datetime import datetime
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ...application.use_cases.speech_use_cases import SpeechUseCases
from ...domain.services.ai_reasoning_service import AIReasoningService
from ...infrastructure.observability.logger import observability


class SessionConfigRequest(BaseModel):
    """Request model for session configuration."""
    model: str = "tiny"
    device: str = "cpu"
    language: str = "auto"
    openai_key: Optional[str] = None
    input_device: Optional[int] = None
    output_device: Optional[int] = None


class SessionResponse(BaseModel):
    """Response model for session information."""
    id: str
    config: SessionConfigRequest
    status: str
    created_at: str  # Changed to string for ISO format with timezone
    metadata: Dict


class SessionController:
    """Handles session management for Go CLI bridge."""

    def __init__(self, speech_use_cases: SpeechUseCases, ai_service: AIReasoningService):
        self.speech_use_cases = speech_use_cases
        self.ai_service = ai_service
        self.logger = observability.get_logger("session_controller")

        # In-memory session storage (in production, use Redis or database)
        self.active_sessions: Dict[str, Dict] = {}

    def create_router(self) -> APIRouter:
        """Create and configure the FastAPI router."""
        router = APIRouter(prefix="/sessions", tags=["sessions"])

        @router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
        async def create_session(config: SessionConfigRequest):
            """Create a new speech processing session."""
            try:
                session_id = str(uuid.uuid4())

                observability.log_event(
                    "session_create_requested",
                    session_id=session_id,
                    config=config.dict()
                )

                # Create session data
                now = datetime.now()
                session_data = {
                    "id": session_id,
                    "config": config.dict(),
                    "status": "active",
                    "created_at": now.isoformat() + "Z",  # Add Z for UTC timezone
                    "metadata": {
                        "transcriptions": 0,
                        "ai_responses": 0,
                        "last_activity": now.isoformat() + "Z"
                    }
                }

                # Store session
                self.active_sessions[session_id] = session_data

                self.logger.info(f"Session created: {session_id}")

                return SessionResponse(**session_data)

            except Exception as e:
                observability.log_error(e, {"action": "create_session"})
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create session"
                )

        @router.get("/{session_id}", response_model=SessionResponse)
        async def get_session(session_id: str):
            """Get session information."""
            if session_id not in self.active_sessions:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )

            session_data = self.active_sessions[session_id]
            return SessionResponse(**session_data)

        @router.delete("/{session_id}")
        async def stop_session(session_id: str):
            """Stop and remove a session."""
            if session_id not in self.active_sessions:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )

            # Clean up session resources
            session_data = self.active_sessions[session_id]
            session_data["status"] = "stopped"

            # Remove from active sessions
            del self.active_sessions[session_id]

            observability.log_event("session_stopped", session_id=session_id)
            self.logger.info(f"Session stopped: {session_id}")

            return {"message": "Session stopped successfully"}

        @router.get("")
        async def list_sessions():
            """List all active sessions."""
            return {
                "sessions": list(self.active_sessions.values()),
                "total": len(self.active_sessions)
            }

        return router
