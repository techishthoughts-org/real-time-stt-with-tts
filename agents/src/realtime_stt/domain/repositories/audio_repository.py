"""Audio repository interface."""

from abc import ABC, abstractmethod
from typing import List, Optional

from ..entities.audio import AudioChunk, SpeechSession, TranscriptionResult


class AudioRepository(ABC):
    """Repository interface for audio data persistence."""

    @abstractmethod
    async def save_session(self, session: SpeechSession) -> None:
        """Save a speech session."""
        pass

    @abstractmethod
    async def get_session(self, session_id: str) -> Optional[SpeechSession]:
        """Retrieve a speech session by ID."""
        pass

    @abstractmethod
    async def save_transcription(
        self, transcription: TranscriptionResult
    ) -> None:
        """Save a transcription result."""
        pass

    @abstractmethod
    async def get_transcriptions_for_session(
        self, session_id: str
    ) -> List[TranscriptionResult]:
        """Get all transcriptions for a session."""
        pass

    @abstractmethod
    async def save_audio_chunk(self, chunk: AudioChunk) -> None:
        """Save an audio chunk."""
        pass
