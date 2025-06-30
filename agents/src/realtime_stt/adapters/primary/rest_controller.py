"""REST API controller for speech-to-text operations."""

import base64
import io
import wave
from typing import Dict, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    WebSocket,
)
from fastapi.responses import StreamingResponse

from ...application.dtos.speech_dtos import (
    CreateSessionRequest,
    CreateSessionResponse,
    FinishSessionRequest,
    TranscriptionResponse,
)
from ...application.use_cases.speech_use_cases import SpeechUseCases
from ...domain.entities.audio import AudioChunk
from ...infrastructure.observability.logger import observability


class SpeechController:
    """REST API controller for speech processing with audio support."""

    def __init__(self, speech_use_case: SpeechUseCases):
        self.speech_use_case = speech_use_case
        self.logger = observability.get_logger("rest_controller")
        self.audio_chunks_store: Dict[str, List[AudioChunk]] = {}  # In-memory audio storage

    def create_router(self) -> APIRouter:
        """Create FastAPI router with audio-enhanced endpoints."""
        router = APIRouter(prefix="/api/v1", tags=["speech"])

        # Existing endpoints
        router.add_api_route("/sessions", self.create_session, methods=["POST"])
        router.add_api_route("/sessions/{session_id}/transcribe", self.transcribe_audio, methods=["POST"])
        router.add_api_route("/sessions/{session_id}/finish", self.finish_session, methods=["POST"])
        router.add_api_route("/sessions/{session_id}/transcript", self.get_transcript, methods=["GET"])

        # New audio-focused endpoints
        router.add_api_route("/sessions/{session_id}/audio-chunks", self.get_audio_chunks, methods=["GET"])
        router.add_api_route("/sessions/{session_id}/audio/{chunk_id}/download", self.download_audio_chunk, methods=["GET"])
        router.add_api_route("/sessions/{session_id}/audio/{chunk_id}/visualization", self.get_audio_visualization, methods=["GET"])
        router.add_api_route("/sessions/{session_id}/audio/export", self.export_session_audio, methods=["GET"])
        router.websocket("/sessions/{session_id}/audio-stream")(self.audio_stream_websocket)

        return router

    async def create_session(self, request: CreateSessionRequest) -> CreateSessionResponse:
        """Create a new speech processing session."""
        observability.log_event("session_create_requested")

        try:
            response = await self.speech_use_case.create_session(request)

            # Initialize audio storage for this session
            self.audio_chunks_store[response.session_id] = []

            observability.log_event("session_created", session_id=response.session_id)
            return response
        except Exception as e:
            observability.log_error(e)
            raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

    async def transcribe_audio(
        self,
        session_id: str,
        audio_file: UploadFile = File(...),
        return_audio: bool = Query(False, description="Whether to return audio data in response")
    ) -> Dict:
        """Transcribe uploaded audio file with optional audio data return."""
        observability.log_event("transcribe_requested", session_id=session_id, return_audio=return_audio)

        try:
            # Read audio file
            audio_data = await audio_file.read()

            # Process transcription
            result = await self.speech_use_case.process_audio_chunk(
                session_id=session_id,
                audio_data=audio_data,
                sample_rate=16000,  # Default, could be extracted from file
                channels=1
            )

            # Create audio chunk for storage
            audio_chunk = AudioChunk(
                data=audio_data,
                sample_rate=16000,
                channels=1,
                duration_ms=len(audio_data) // 32,  # Rough estimate
            )

            # Store audio chunk
            if session_id in self.audio_chunks_store:
                self.audio_chunks_store[session_id].append(audio_chunk)

            response = {
                "session_id": session_id,
                "transcription": result.dict(),
                "processing_time_ms": result.processing_time_ms
            }

            # Add audio data if requested
            if return_audio:
                response["audio"] = {
                    "chunk_id": audio_chunk.timestamp.isoformat(),
                    "duration_ms": audio_chunk.duration_ms,
                    "sample_rate": audio_chunk.sample_rate,
                    "channels": audio_chunk.channels,
                    "size_bytes": len(audio_chunk.data),
                    "data_base64": base64.b64encode(audio_chunk.data).decode(),
                    "visualization": await self._get_audio_visualization_data(audio_chunk)
                }

            observability.log_event("transcribe_completed", session_id=session_id)
            return response

        except Exception as e:
            observability.log_error(e, {"session_id": session_id})
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    async def finish_session(self, session_id: str, request: FinishSessionRequest) -> Dict:
        """Finish a speech processing session."""
        observability.log_event("session_finish_requested", session_id=session_id)

        try:
            await self.speech_use_case.finish_session(session_id)

            # Get audio summary
            audio_summary = self._get_session_audio_summary(session_id)

            observability.log_event("session_finished", session_id=session_id)
            return {
                "session_id": session_id,
                "status": "finished",
                "audio_summary": audio_summary
            }
        except Exception as e:
            observability.log_error(e, {"session_id": session_id})
            raise HTTPException(status_code=500, detail=f"Failed to finish session: {str(e)}")

    async def get_transcript(self, session_id: str) -> TranscriptionResponse:
        """Get complete transcript for a session."""
        observability.log_event("transcript_requested", session_id=session_id)

        try:
            transcript = await self.speech_use_case.get_session_transcript(session_id)
            observability.log_event("transcript_retrieved", session_id=session_id)
            return transcript
        except Exception as e:
            observability.log_error(e, {"session_id": session_id})
            raise HTTPException(status_code=404, detail=f"Session not found: {str(e)}")

    async def get_audio_chunks(self, session_id: str) -> Dict:
        """Get list of audio chunks for a session."""
        observability.log_event("audio_chunks_requested", session_id=session_id)

        if session_id not in self.audio_chunks_store:
            raise HTTPException(status_code=404, detail="Session not found")

        chunks = self.audio_chunks_store[session_id]

        chunk_info = []
        for i, chunk in enumerate(chunks):
            chunk_info.append({
                "chunk_id": chunk.timestamp.isoformat(),
                "index": i,
                "timestamp": chunk.timestamp.isoformat(),
                "duration_ms": chunk.duration_ms,
                "sample_rate": chunk.sample_rate,
                "channels": chunk.channels,
                "size_bytes": len(chunk.data),
                "download_url": f"/api/v1/sessions/{session_id}/audio/{chunk.timestamp.isoformat()}/download"
            })

        return {
            "session_id": session_id,
            "total_chunks": len(chunks),
            "total_duration_ms": sum(c.duration_ms for c in chunks),
            "chunks": chunk_info
        }

    async def download_audio_chunk(
        self,
        session_id: str,
        chunk_id: str,
        format: str = Query("wav", description="Audio format (wav, raw)")
    ) -> Response:
        """Download a specific audio chunk."""
        observability.log_event("audio_download_requested", session_id=session_id, chunk_id=chunk_id, format=format)

        if session_id not in self.audio_chunks_store:
            raise HTTPException(status_code=404, detail="Session not found")

        # Find the chunk
        chunk = None
        for c in self.audio_chunks_store[session_id]:
            if c.timestamp.isoformat() == chunk_id:
                chunk = c
                break

        if not chunk:
            raise HTTPException(status_code=404, detail="Audio chunk not found")

        if format.lower() == "wav":
            # Convert to WAV format
            wav_data = self._audio_to_wav_bytes(chunk.data, chunk.sample_rate, chunk.channels)
            media_type = "audio/wav"
            filename = f"audio_chunk_{chunk_id}.wav"
        else:
            # Return raw audio data
            wav_data = chunk.data
            media_type = "application/octet-stream"
            filename = f"audio_chunk_{chunk_id}.raw"

        return Response(
            content=wav_data,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    async def get_audio_visualization(self, session_id: str, chunk_id: str) -> Dict:
        """Get audio visualization data for a specific chunk."""
        observability.log_event("audio_viz_requested", session_id=session_id, chunk_id=chunk_id)

        if session_id not in self.audio_chunks_store:
            raise HTTPException(status_code=404, detail="Session not found")

        # Find the chunk
        chunk = None
        for c in self.audio_chunks_store[session_id]:
            if c.timestamp.isoformat() == chunk_id:
                chunk = c
                break

        if not chunk:
            raise HTTPException(status_code=404, detail="Audio chunk not found")

        visualization_data = await self._get_audio_visualization_data(chunk)

        return {
            "session_id": session_id,
            "chunk_id": chunk_id,
            "visualization": visualization_data
        }

    async def export_session_audio(
        self,
        session_id: str,
        format: str = Query("wav", description="Export format (wav, raw)")
    ) -> Response:
        """Export all audio from a session as a single file."""
        observability.log_event("audio_export_requested", session_id=session_id, format=format)

        if session_id not in self.audio_chunks_store:
            raise HTTPException(status_code=404, detail="Session not found")

        chunks = self.audio_chunks_store[session_id]
        if not chunks:
            raise HTTPException(status_code=404, detail="No audio chunks found")

        # Combine all chunks
        combined_audio = b"".join(chunk.data for chunk in chunks)

        if format.lower() == "wav":
            # Use first chunk's properties for combined file
            wav_data = self._audio_to_wav_bytes(
                combined_audio,
                chunks[0].sample_rate,
                chunks[0].channels
            )
            media_type = "audio/wav"
            filename = f"session_{session_id}_audio.wav"
        else:
            wav_data = combined_audio
            media_type = "application/octet-stream"
            filename = f"session_{session_id}_audio.raw"

        return Response(
            content=wav_data,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    async def audio_stream_websocket(self, websocket: WebSocket, session_id: str):
        """WebSocket endpoint for real-time audio streaming."""
        await websocket.accept()
        observability.log_event("audio_stream_connected", session_id=session_id)

        try:
            while True:
                # Wait for audio data from client
                data = await websocket.receive_bytes()

                # Process the audio chunk
                # In a real implementation, you'd process this with your speech service
                # For now, just echo back with metadata

                response = {
                    "type": "audio_received",
                    "session_id": session_id,
                    "size_bytes": len(data),
                    "timestamp": io.datetime.now().isoformat()
                }

                await websocket.send_json(response)

        except Exception as e:
            observability.log_error(e, {"session_id": session_id})
        finally:
            observability.log_event("audio_stream_disconnected", session_id=session_id)

    def _audio_to_wav_bytes(self, audio_data: bytes, sample_rate: int, channels: int) -> bytes:
        """Convert raw audio data to WAV format."""
        try:
            buffer = io.BytesIO()
            with wave.open(buffer, 'wb') as wav_file:
                wav_file.setnchannels(channels)
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data)

            return buffer.getvalue()
        except Exception as e:
            self.logger.error(f"Error converting audio to WAV: {e}")
            return b''

    async def _get_audio_visualization_data(self, audio_chunk: AudioChunk) -> Dict:
        """Generate visualization data for an audio chunk."""
        try:
            import numpy as np

            # Convert bytes to numpy array
            audio_samples = np.frombuffer(audio_chunk.data, dtype=np.int16)

            if len(audio_samples) == 0:
                return self._empty_visualization_data()

            # Calculate audio metrics
            amplitude = float(np.max(np.abs(audio_samples)) / 32767.0)
            peak = float(np.max(audio_samples) / 32767.0)
            rms = float(np.sqrt(np.mean(audio_samples.astype(np.float32) ** 2)) / 32767.0)

            # Simple frequency analysis
            if len(audio_samples) > 1024:
                fft = np.fft.fft(audio_samples[:1024])
                freqs = np.fft.fftfreq(1024, 1/audio_chunk.sample_rate)
                dominant_freq_idx = np.argmax(np.abs(fft[1:len(fft)//2])) + 1
                frequency_estimate = float(abs(freqs[dominant_freq_idx]))
            else:
                frequency_estimate = 0.0

            # Create simple waveform points for visualization
            if len(audio_samples) > 100:
                # Downsample to 100 points for visualization
                step = len(audio_samples) // 100
                waveform_points = [
                    float(audio_samples[i] / 32767.0)
                    for i in range(0, len(audio_samples), step)
                ][:100]
            else:
                waveform_points = [float(x / 32767.0) for x in audio_samples]

            return {
                "amplitude": amplitude,
                "peak": peak,
                "rms": rms,
                "frequency_estimate": frequency_estimate,
                "samples_count": len(audio_samples),
                "duration_ms": audio_chunk.duration_ms,
                "sample_rate": audio_chunk.sample_rate,
                "waveform_points": waveform_points,
                "audio_quality": "good" if rms > 0.1 else "low"
            }

        except Exception as e:
            self.logger.error(f"Error creating audio visualization: {e}")
            return self._empty_visualization_data()

    def _empty_visualization_data(self) -> Dict:
        """Return empty visualization data structure."""
        return {
            "amplitude": 0.0,
            "peak": 0.0,
            "rms": 0.0,
            "frequency_estimate": 0.0,
            "samples_count": 0,
            "waveform_points": [],
            "audio_quality": "none"
        }

    def _get_session_audio_summary(self, session_id: str) -> Dict:
        """Get summary of audio data for a session."""
        if session_id not in self.audio_chunks_store:
            return {"total_chunks": 0, "total_duration_ms": 0, "total_size_bytes": 0}

        chunks = self.audio_chunks_store[session_id]

        return {
            "total_chunks": len(chunks),
            "total_duration_ms": sum(c.duration_ms for c in chunks),
            "total_size_bytes": sum(len(c.data) for c in chunks),
            "average_chunk_duration_ms": sum(c.duration_ms for c in chunks) / len(chunks) if chunks else 0,
            "sample_rate": chunks[0].sample_rate if chunks else 0,
            "channels": chunks[0].channels if chunks else 0
        }
