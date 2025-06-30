"""Speech processing DTOs."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    """Request to create a new speech session."""

    sample_rate: int = Field(default=16000, description="Audio sample rate")
    language: Optional[str] = Field(None, description="Expected language")


class CreateSessionResponse(BaseModel):
    """Response for session creation."""

    session_id: str = Field(..., description="Created session ID")
    created_at: datetime = Field(..., description="Session creation time")


class AudioChunkRequest(BaseModel):
    """Request to process an audio chunk."""

    session_id: str = Field(..., description="Session ID")
    audio_data: bytes = Field(..., description="Raw audio data")
    sample_rate: int = Field(default=16000, description="Audio sample rate")
    channels: int = Field(default=1, description="Number of audio channels")


class TranscriptionResponse(BaseModel):
    """Response containing transcription result."""

    text: str = Field(..., description="Transcribed text")
    confidence: float = Field(..., description="Transcription confidence")
    language: Optional[str] = Field(None, description="Detected language")
    processing_time_ms: int = Field(..., description="Processing time")
    timestamp: datetime = Field(..., description="Transcription timestamp")


class SessionResponse(BaseModel):
    """Response containing session information."""

    session_id: str = Field(..., description="Session ID")
    status: str = Field(..., description="Session status")
    start_time: datetime = Field(..., description="Session start time")
    end_time: Optional[datetime] = Field(None, description="Session end time")
    transcriptions: List[TranscriptionResponse] = Field(
        default_factory=list, description="Session transcriptions"
    )
    full_transcript: str = Field(..., description="Complete transcript")


class FinishSessionRequest(BaseModel):
    """Request to finish a session."""

    session_id: str = Field(..., description="Session ID to finish")
