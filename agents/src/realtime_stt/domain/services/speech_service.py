"""Speech processing domain service."""

import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional

from ..entities.audio import (AudioChunk, SpeechSession, TranscriptionResult,
                              VoiceActivityDetection, VoiceActivityStatus)
from ..repositories.audio_repository import AudioRepository
from ..repositories.speech_repository import SpeechRepository


class SpeechProcessingService:
    """Domain service for speech processing orchestration."""

    def __init__(
        self,
        speech_repository: SpeechRepository,
        audio_repository: AudioRepository,
    ):
        self._speech_repository = speech_repository
        self._audio_repository = audio_repository

    async def create_speech_session(self) -> SpeechSession:
        """Create a new speech session."""
        session = SpeechSession(
            session_id=str(uuid.uuid4()),
            start_time=datetime.now(),
        )
        await self._audio_repository.save_session(session)
        return session

    async def process_audio_chunk(
        self, chunk: AudioChunk, session_id: str
    ) -> Optional[TranscriptionResult]:
        """Process an audio chunk with VAD and transcription."""
        # First, detect voice activity
        vad_result = await self._speech_repository.detect_voice_activity(chunk)

        # Only transcribe if speech is detected
        if vad_result.status == VoiceActivityStatus.SPEECH:
            transcription = await self._speech_repository.transcribe_chunk(chunk)

            # Save the transcription
            await self._audio_repository.save_transcription(transcription)

            # Update the session with the new transcription
            session = await self._audio_repository.get_session(session_id)
            if session:
                session.add_transcription(transcription)
                await self._audio_repository.save_session(session)

            return transcription

        return None

    async def stream_speech_processing(
        self, audio_stream: AsyncGenerator[AudioChunk, None], session_id: str
    ) -> AsyncGenerator[TranscriptionResult, None]:
        """Stream speech processing results."""
        async for chunk in audio_stream:
            result = await self.process_audio_chunk(chunk, session_id)
            if result:
                yield result

    async def finish_session(self, session_id: str) -> Optional[SpeechSession]:
        """Mark a session as finished and return the final session."""
        session = await self._audio_repository.get_session(session_id)
        if session:
            session.finish_session()
            await self._audio_repository.save_session(session)
        return session

    async def get_session_transcript(self, session_id: str) -> Optional[str]:
        """Get the full transcript for a session."""
        session = await self._audio_repository.get_session(session_id)
        return session.get_full_text() if session else None
