"""Speech processing repository interface."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator

from ..entities.audio import (AudioChunk, TranscriptionResult,
                              VoiceActivityDetection)


class SpeechRepository(ABC):
    """Repository interface for speech processing operations."""

    @abstractmethod
    async def transcribe_chunk(self, chunk: AudioChunk) -> TranscriptionResult:
        """Transcribe an audio chunk to text."""
        pass

    @abstractmethod
    async def detect_voice_activity(
        self, chunk: AudioChunk
    ) -> VoiceActivityDetection:
        """Detect voice activity in an audio chunk."""
        pass

    @abstractmethod
    async def stream_transcriptions(
        self, audio_stream: AsyncGenerator[AudioChunk, None]
    ) -> AsyncGenerator[TranscriptionResult, None]:
        """Stream transcriptions from an audio stream."""
        pass
