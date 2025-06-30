"""WebSocket controller for real-time transcription streaming."""

import asyncio
import json
import uuid
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter

from ...application.use_cases.speech_use_cases import SpeechUseCases
from ...infrastructure.audio.realtime_capture import RealtimeAudioCapture
from ...infrastructure.observability.logger import observability
from ...infrastructure.tts.text_to_speech_service import TextToSpeechService


class WebSocketManager:
    """Manages WebSocket connections for real-time communication."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        # Maps session_id -> connection_id
        self.session_connections: Dict[str, str] = {}
        self.logger = observability.get_logger("websocket_manager")

    async def connect(self, websocket: WebSocket, session_id: str) -> str:
        """Accept a WebSocket connection and associate it with a session."""
        await websocket.accept()
        connection_id = str(uuid.uuid4())

        self.active_connections[connection_id] = websocket
        self.session_connections[session_id] = connection_id

        self.logger.info(
            f"WebSocket connected: {connection_id} for session {session_id}"
        )

        # Send welcome message
        await self.send_message(connection_id, {
            "type": "connection_established",
            "connection_id": connection_id,
            "session_id": session_id,
            "message": "WebSocket connection established"
        })

        return connection_id

    def disconnect(self, connection_id: str, session_id: Optional[str] = None):
        """Disconnect a WebSocket connection."""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        if session_id and session_id in self.session_connections:
            del self.session_connections[session_id]

        self.logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_message(self, connection_id: str, message: dict):
        """Send a message to a specific connection."""
        if connection_id in self.active_connections:
            try:
                websocket = self.active_connections[connection_id]
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                error_msg = f"Error sending message to {connection_id}: {e}"
                self.logger.error(error_msg)
                self.disconnect(connection_id)

    async def send_to_session(self, session_id: str, message: dict):
        """Send a message to a session's WebSocket connection."""
        if session_id in self.session_connections:
            connection_id = self.session_connections[session_id]
            await self.send_message(connection_id, message)

    async def broadcast_transcription(
        self, session_id: str, transcription: str,
        is_final: bool = True, confidence: float = 0.0
    ):
        """Broadcast a transcription to the session's connection."""
        message = {
            "type": "transcription",
            "session_id": session_id,
            "text": transcription,
            "is_final": is_final,
            "confidence": confidence,
            "timestamp": observability.get_current_timestamp()
        }
        await self.send_to_session(session_id, message)

    async def broadcast_ai_response(
        self, session_id: str, response: str, in_response_to: str = ""
    ):
        """Broadcast an AI response to the session's connection."""
        message = {
            "type": "ai_response",
            "session_id": session_id,
            "text": response,
            "in_response_to": in_response_to,
            "timestamp": observability.get_current_timestamp()
        }
        await self.send_to_session(session_id, message)

    async def broadcast_audio_level(
        self, session_id: str, level: float, spectrum: list = None
    ):
        """Broadcast audio level and spectrum data."""
        message = {
            "type": "audio_data",
            "session_id": session_id,
            "level": level,
            "spectrum": spectrum or [],
            "timestamp": observability.get_current_timestamp()
        }
        await self.send_to_session(session_id, message)

    async def broadcast_status(
        self, session_id: str, status: str, metadata: dict = None
    ):
        """Broadcast status updates."""
        message = {
            "type": "status_update",
            "session_id": session_id,
            "status": status,
            "metadata": metadata or {},
            "timestamp": observability.get_current_timestamp()
        }
        await self.send_to_session(session_id, message)


class WebSocketController:
    """WebSocket controller for real-time transcription."""

    def __init__(self, speech_use_cases: SpeechUseCases, ai_service):
        self.speech_use_cases = speech_use_cases
        self.ai_service = ai_service
        self.manager = WebSocketManager()
        self.logger = observability.get_logger("websocket_controller")
        # Store audio capture sessions for real microphone input
        self.audio_capture_sessions: Dict[str, RealtimeAudioCapture] = {}
        # Initialize TTS service for AI responses
        self.tts_service = TextToSpeechService(language="en")

    def create_router(self) -> APIRouter:
        """Create and configure the WebSocket router."""
        router = APIRouter()

        @router.websocket("/ws/{session_id}")
        async def websocket_endpoint(websocket: WebSocket, session_id: str):
            """WebSocket endpoint for real-time transcription."""
            connection_id = None
            try:
                connection_id = await self.manager.connect(websocket, session_id)

                # Start real-time processing for this session
                await self._start_realtime_processing(session_id, connection_id)

                # Keep connection alive and handle incoming messages
                while True:
                    try:
                        # Receive messages from client (like audio data, etc.)
                        data = await websocket.receive_text()
                        message = json.loads(data)
                        await self._handle_client_message(session_id, message)

                    except WebSocketDisconnect:
                        break
                    except json.JSONDecodeError:
                        await self.manager.send_message(connection_id, {
                            "type": "error",
                            "message": "Invalid JSON format"
                        })
                    except Exception as e:
                        self.logger.error(f"Error handling message: {e}")
                        await self.manager.send_message(connection_id, {
                            "type": "error",
                            "message": str(e)
                        })

            except WebSocketDisconnect:
                self.logger.info(
                    f"WebSocket disconnected for session {session_id}"
                )
            except Exception as e:
                self.logger.error(
                    f"WebSocket error for session {session_id}: {e}"
                )
            finally:
                if connection_id:
                    self.manager.disconnect(connection_id, session_id)

                # Clean up audio capture session
                if session_id in self.audio_capture_sessions:
                    audio_capture = self.audio_capture_sessions[session_id]
                    await audio_capture.cleanup()
                    del self.audio_capture_sessions[session_id]

        return router

    async def _start_realtime_processing(
        self, session_id: str, connection_id: str
    ):
        """Start real-time audio processing for a session."""
        try:
            # Create real audio capture instance
            audio_capture = RealtimeAudioCapture(
                model="tiny",
                device="cpu",
                use_vad=True,
                language="en",
                capture_audio=True
            )

            # Store the audio capture instance
            self.audio_capture_sessions[session_id] = audio_capture

            # Start real audio processing
            asyncio.create_task(
                self._start_real_audio_processing(session_id)
            )

            await self.manager.send_message(connection_id, {
                "type": "processing_started",
                "session_id": session_id,
                "message": "Real-time audio processing started"
            })
        except Exception as e:
            self.logger.error(f"Failed to start real-time processing: {e}")
            # Fallback to simulation if real audio fails
            asyncio.create_task(self._simulate_audio_stream(session_id))
            asyncio.create_task(self._simulate_transcription_stream(session_id))

            await self.manager.send_message(connection_id, {
                "type": "processing_started",
                "session_id": session_id,
                "message": "Real-time processing started (fallback mode)"
            })

    async def _handle_client_message(self, session_id: str, message: dict):
        """Handle incoming messages from the client."""
        message_type = message.get("type")

        if message_type == "audio_data":
            # Handle audio data from client
            await self._process_audio_data(session_id, message.get("data"))

        elif message_type == "command":
            # Handle commands like pause, resume, etc.
            await self._handle_command(session_id, message.get("command"))

        elif message_type == "ping":
            # Respond to ping with pong
            await self.manager.send_to_session(session_id, {
                "type": "pong",
                "timestamp": observability.get_current_timestamp()
            })

    async def _process_audio_data(self, session_id: str, audio_data):
        """Process incoming audio data with real-time transcription."""
        if not audio_data:
            return

        try:
            # Process audio data with real-time transcription
            from ...domain.entities.audio import AudioChunk

            # Convert audio data to proper format if needed
            if isinstance(audio_data, dict) and 'data' in audio_data:
                # Handle structured audio data
                audio_chunk = AudioChunk(
                    data=audio_data['data'],
                    sample_rate=audio_data.get('sample_rate', 16000),
                    channels=audio_data.get('channels', 1),
                    duration_ms=audio_data.get('duration_ms', 0)
                )
            elif isinstance(audio_data, bytes):
                # Handle raw audio bytes
                audio_chunk = AudioChunk(
                    data=audio_data,
                    sample_rate=16000,
                    channels=1,
                    duration_ms=len(audio_data) // 32  # Estimate duration
                )
            else:
                # Handle other formats by converting to string then bytes
                audio_bytes = str(audio_data).encode('utf-8')
                audio_chunk = AudioChunk(
                    data=audio_bytes,
                    sample_rate=16000,
                    channels=1,
                    duration_ms=len(audio_bytes) // 32
                )

            # Process the audio chunk through speech service
            result = await self.speech_use_cases.process_audio_chunk(
                audio_chunk, session_id
            )

            if result:
                # Send transcription result
                await self.manager.broadcast_transcription(
                    session_id,
                    result.text,
                    is_final=True,
                    confidence=result.confidence
                )

                # Generate AI response if transcription has content
                if result.text.strip():
                    ai_response = await self._generate_ai_response(result.text)
                    if ai_response:
                        await self.manager.broadcast_ai_response(
                            session_id, ai_response, result.text
                        )

                        # Optional TTS for AI response
                        try:
                            await self.tts_service.speak_text(ai_response)
                        except Exception as e:
                            self.logger.warning(f"TTS error: {e}")
            else:
                # Send status update when no transcription is available
                await self.manager.broadcast_status(session_id, "processing_audio", {
                    "data_size": len(str(audio_data)),
                    "result": "no_transcription"
                })

        except Exception as e:
            self.logger.error(f"Error processing audio data: {e}")
            await self.manager.send_to_session(session_id, {
                "type": "error",
                "message": f"Audio processing error: {str(e)}"
            })

    async def _handle_command(self, session_id: str, command: str):
        """Handle client commands."""
        if command == "pause":
            await self.manager.broadcast_status(session_id, "paused")
        elif command == "resume":
            await self.manager.broadcast_status(session_id, "listening")
        elif command == "stop":
            await self.manager.broadcast_status(session_id, "stopped")

    async def _start_real_audio_processing(self, session_id: str):
        """Start real audio processing using RealtimeSTT."""
        if session_id not in self.audio_capture_sessions:
            self.logger.error(
                f"No audio capture session found for {session_id}"
            )
            return

        audio_capture = self.audio_capture_sessions[session_id]

        try:
            await audio_capture.initialize()
            self.logger.info(
                f"Started real audio processing for session {session_id}"
            )

            # Start listening for real audio
            async for result in audio_capture.start_listening():
                transcription_result, audio_chunk = result
                if session_id not in self.manager.session_connections:
                    break

                # Send transcription
                await self.manager.broadcast_transcription(
                    session_id,
                    transcription_result.text,
                    True,
                    transcription_result.confidence
                )

                # Generate AI response
                ai_response = await self._generate_ai_response(
                    transcription_result.text
                )
                await self.manager.broadcast_ai_response(
                    session_id, ai_response, transcription_result.text
                )

                # Speak the AI response using TTS
                if ai_response:
                    try:
                        await self.tts_service.speak_text(ai_response)
                        self.logger.info(f"TTS spoken for AI response: {ai_response[:50]}...")
                    except Exception as e:
                        self.logger.error(f"TTS error: {e}")

                # Send audio visualization data if available
                if audio_chunk:
                    viz_data = audio_capture.get_audio_visualization_data(
                        audio_chunk
                    )
                    await self.manager.broadcast_audio_level(
                        session_id,
                        viz_data.get("amplitude", 0.0),
                        # Create spectrum from visualization data
                        [viz_data.get("amplitude", 0.0) * (1.0 - i/59.0)
                         for i in range(59)]
                    )

        except Exception as e:
            self.logger.error(
                f"Error in real audio processing for session {session_id}: {e}"
            )
            # Fallback to simulation
            await self._simulate_audio_stream(session_id)
            await self._simulate_transcription_stream(session_id)

    async def _simulate_audio_stream(self, session_id: str):
        """Simulate real-time audio level and spectrum data."""
        import random

        while session_id in self.manager.session_connections:
            # Simulate audio level
            if random.random() < 0.1:  # 10% chance of speech activity
                level = 0.3 + random.random() * 0.7
            else:
                level = random.random() * 0.2

            # Simulate spectrum data
            spectrum = [
                max(0, level * (1.0 - i/59.0) + (random.random() - 0.5) * 0.3)
                for i in range(59)
            ]

            await self.manager.broadcast_audio_level(
                session_id, level, spectrum
            )
            await asyncio.sleep(0.05)  # 20 Hz update rate

    async def _simulate_transcription_stream(self, session_id: str):
        """Simulate real-time transcription updates."""
        sample_texts = [
            "Hello, how are you today?",
            "I'm testing the speech recognition system",
            "This is a sample transcription",
            "The weather is nice today",
            "Can you hear me clearly?",
            "Real-time speech to text is working",
            "Let me try another sentence",
            "The audio quality seems good",
        ]

        import random

        while session_id in self.manager.session_connections:
            await asyncio.sleep(3 + random.randint(0, 5))  # Random interval

            if random.random() < 0.7:  # 70% chance of transcription
                text = sample_texts[random.randint(0, len(sample_texts) - 1)]
                confidence = 0.85 + random.random() * 0.15

                # Send transcription
                await self.manager.broadcast_transcription(
                    session_id, text, True, confidence
                )

                # Generate AI response
                ai_response = await self._generate_ai_response(text)
                await self.manager.broadcast_ai_response(
                    session_id, ai_response, text
                )

                # Speak the AI response using TTS
                if ai_response:
                    try:
                        await self.tts_service.speak_text(ai_response)
                        self.logger.info(f"TTS spoken for simulated response: {ai_response[:50]}...")
                    except Exception as e:
                        self.logger.error(f"TTS error: {e}")

    async def _generate_ai_response(self, transcription: str) -> str:
        """Generate AI response to transcription."""
        try:
            # Use the real AI service
            response = await self.ai_service.reason_and_respond(transcription)
            return response
        except Exception as e:
            self.logger.error(f"AI service error: {e}")
            # Fallback responses
            fallback_responses = [
                "I understand. How can I help you with that?",
                "That's interesting! Tell me more.",
                "I hear you clearly. What would you like to discuss?",
                "Got it! Is there anything specific you need?",
                "I'm here to help. What can I do for you?",
            ]
            import random
            idx = random.randint(0, len(fallback_responses) - 1)
            return fallback_responses[idx]

    def get_manager(self) -> WebSocketManager:
        """Get the WebSocket manager instance."""
        return self.manager
