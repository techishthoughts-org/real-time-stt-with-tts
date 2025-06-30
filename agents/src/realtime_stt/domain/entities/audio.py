"""Audio domain entities."""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class AudioFormat(str, Enum):
    """Supported audio formats."""
    WAV = "wav"
    MP3 = "mp3"
    FLAC = "flac"
    OGG = "ogg"


class VoiceActivityStatus(str, Enum):
    """Voice activity detection status."""
    SPEECH = "speech"
    SILENCE = "silence"
    UNKNOWN = "unknown"


class AudioChunk(BaseModel):
    """Represents a chunk of audio data."""

    data: bytes = Field(..., description="Raw audio data")
    sample_rate: int = Field(
        default=16000, description="Audio sample rate in Hz"
    )
    channels: int = Field(default=1, description="Number of audio channels")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="When the chunk was captured"
    )
    duration_ms: int = Field(
        ..., description="Duration of the chunk in milliseconds"
    )

    class Config:
        arbitrary_types_allowed = True


class VoiceActivityDetection(BaseModel):
    """Voice activity detection result."""

    status: VoiceActivityStatus
    confidence: float = Field(
        ge=0.0, le=1.0, description="Confidence score for VAD"
    )
    chunk_id: str = Field(
        ..., description="Associated audio chunk identifier"
    )
    timestamp: datetime = Field(default_factory=datetime.now)


class TranscriptionResult(BaseModel):
    """Result of speech-to-text transcription."""

    text: str = Field(..., description="Transcribed text")
    confidence: float = Field(
        ge=0.0, le=1.0, description="Transcription confidence"
    )
    language: Optional[str] = Field(None, description="Detected language code")
    audio_chunk_id: str = Field(
        ..., description="Source audio chunk identifier"
    )
    processing_time_ms: int = Field(
        ..., description="Time taken to process in milliseconds"
    )
    timestamp: datetime = Field(default_factory=datetime.now)


class SpeechSession(BaseModel):
    """A complete speech session."""

    session_id: str = Field(..., description="Unique session identifier")
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    transcriptions: List[TranscriptionResult] = Field(default_factory=list)
    total_audio_duration_ms: int = Field(default=0)
    status: str = Field(default="active")

    def add_transcription(self, transcription: TranscriptionResult) -> None:
        """Add a transcription result to the session."""
        self.transcriptions.append(transcription)

    def finish_session(self) -> None:
        """Mark the session as finished."""
        self.end_time = datetime.now()
        self.status = "completed"

    def get_full_text(self) -> str:
        """Get the complete transcribed text from all results."""
        return " ".join([t.text for t in self.transcriptions])
