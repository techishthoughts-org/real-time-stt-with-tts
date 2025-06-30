"""In-memory implementation of audio repository."""

from typing import Dict, List, Optional

from ...domain.entities.audio import (AudioChunk, SpeechSession,
                                      TranscriptionResult)
from ...domain.repositories.audio_repository import AudioRepository


class InMemoryAudioRepository(AudioRepository):
    """In-memory implementation of audio repository."""

    def __init__(self):
        self._sessions: Dict[str, SpeechSession] = {}
        self._transcriptions: Dict[str, List[TranscriptionResult]] = {}
        self._audio_chunks: Dict[str, AudioChunk] = {}

    async def save_session(self, session: SpeechSession) -> None:
        """Save a speech session."""
        self._sessions[session.session_id] = session

    async def get_session(self, session_id: str) -> Optional[SpeechSession]:
        """Retrieve a speech session by ID."""
        return self._sessions.get(session_id)

    async def save_transcription(
        self, transcription: TranscriptionResult
    ) -> None:
        """Save a transcription result."""
        # Find the session for this transcription
        for session in self._sessions.values():
            if any(
                t.audio_chunk_id == transcription.audio_chunk_id
                for t in session.transcriptions
            ):
                continue

        # Store transcription globally as well
        if transcription.audio_chunk_id not in self._transcriptions:
            self._transcriptions[transcription.audio_chunk_id] = []
        self._transcriptions[transcription.audio_chunk_id].append(transcription)

    async def get_transcriptions_for_session(
        self, session_id: str
    ) -> List[TranscriptionResult]:
        """Get all transcriptions for a session."""
        session = self._sessions.get(session_id)
        return session.transcriptions if session else []

    async def save_audio_chunk(self, chunk: AudioChunk) -> None:
        """Save an audio chunk."""
        chunk_id = f"{chunk.timestamp.isoformat()}_{id(chunk)}"
        self._audio_chunks[chunk_id] = chunk
