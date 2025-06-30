"""Speech processing use cases."""

import uuid
from datetime import datetime
from typing import Optional

from ...domain.entities.audio import AudioChunk
from ...domain.services.speech_service import SpeechProcessingService
from ..dtos.speech_dtos import (AudioChunkRequest, CreateSessionRequest,
                                CreateSessionResponse, FinishSessionRequest,
                                SessionResponse, TranscriptionResponse)


class SpeechUseCases:
    """Use cases for speech processing operations."""

    def __init__(self, speech_service: SpeechProcessingService):
        self._speech_service = speech_service

    async def create_session(
        self, request: CreateSessionRequest
    ) -> CreateSessionResponse:
        """Create a new speech session."""
        session = await self._speech_service.create_speech_session()
        return CreateSessionResponse(
            session_id=session.session_id,
            created_at=session.start_time,
        )

    async def process_audio_chunk(
        self, request: AudioChunkRequest
    ) -> Optional[TranscriptionResponse]:
        """Process an audio chunk and return transcription if available."""
        # Create audio chunk from request
        chunk = AudioChunk(
            data=request.audio_data,
            sample_rate=request.sample_rate,
            channels=request.channels,
            duration_ms=len(request.audio_data) * 1000 // (
                request.sample_rate * request.channels * 2
            ),  # Assuming 16-bit audio
        )

        # Process the chunk
        transcription = await self._speech_service.process_audio_chunk(
            chunk, request.session_id
        )

        if transcription:
            return TranscriptionResponse(
                text=transcription.text,
                confidence=transcription.confidence,
                language=transcription.language,
                processing_time_ms=transcription.processing_time_ms,
                timestamp=transcription.timestamp,
            )

        return None

    async def finish_session(
        self, request: FinishSessionRequest
    ) -> SessionResponse:
        """Finish a session and return the complete session data."""
        session = await self._speech_service.finish_session(request.session_id)

        if not session:
            raise ValueError(f"Session {request.session_id} not found")

        # Convert transcriptions to response format
        transcription_responses = [
            TranscriptionResponse(
                text=t.text,
                confidence=t.confidence,
                language=t.language,
                processing_time_ms=t.processing_time_ms,
                timestamp=t.timestamp,
            )
            for t in session.transcriptions
        ]

        return SessionResponse(
            session_id=session.session_id,
            status=session.status,
            start_time=session.start_time,
            end_time=session.end_time,
            transcriptions=transcription_responses,
            full_transcript=session.get_full_text(),
        )

    async def get_session_transcript(self, session_id: str) -> Optional[str]:
        """Get the current transcript for a session."""
        return await self._speech_service.get_session_transcript(session_id)
