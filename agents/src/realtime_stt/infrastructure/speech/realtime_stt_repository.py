"""RealtimeSTT implementation of speech repository."""

import asyncio
import time
import uuid
from typing import AsyncGenerator, Callable, Optional

from RealtimeSTT import AudioToTextRecorder

from ...domain.entities.audio import (
    AudioChunk,
    TranscriptionResult,
    VoiceActivityDetection,
    VoiceActivityStatus,
)
from ...domain.repositories.speech_repository import SpeechRepository
from ..audio.audio_device_manager import AudioDevice, AudioDeviceManager


class RealtimeSTTSpeechRepository(SpeechRepository):
    """RealtimeSTT implementation of speech repository."""

    def __init__(
        self,
        model: str = "tiny",
        device: str = "cpu",
        compute_type: str = "float32",
        use_vad: bool = True,
        language: str = "auto",
        input_device_index: Optional[int] = None,
        output_device_index: Optional[int] = None,
        input_device_name: Optional[str] = None,
        output_device_name: Optional[str] = None,
        on_transcription_callback: Optional[Callable[[str], None]] = None,
    ):
        """Initialize RealtimeSTT speech repository.

        Args:
            model: Whisper model size ("tiny", "base", "small", "medium", "large")
            device: Device to run on ("cpu", "cuda", "auto")
            compute_type: Compute type for inference
            use_vad: Whether to use voice activity detection
            language: Language code for speech recognition ("en", "es", "fr", "auto", etc.)
            input_device_index: Specific input device index to use
            output_device_index: Specific output device index to use
            input_device_name: Input device name (partial match)
            output_device_name: Output device name (partial match)
            on_transcription_callback: Callback for real-time transcription updates
        """
        self._model = model
        self._device = device
        self._compute_type = compute_type
        self._use_vad = use_vad
        self._language = language if language != "auto" else None  # None means auto-detect
        self._recorder = None
        self._is_listening = False
        self._transcription_callback = on_transcription_callback

        # Lazy initialization state
        self._initialized = False
        self._initialization_lock = asyncio.Lock()

        # Audio device management
        self.device_manager = AudioDeviceManager()
        self._input_device: Optional[AudioDevice] = None
        self._output_device: Optional[AudioDevice] = None

        # Set up audio devices (this is lightweight)
        self._setup_audio_devices(
            input_device_index, output_device_index,
            input_device_name, output_device_name
        )

        # Don't initialize recorder during __init__ - do it lazily
        # self._initialize_recorder()

    async def _ensure_initialized(self) -> None:
        """Ensure the recorder is initialized (lazy initialization)."""
        async with self._initialization_lock:
            if not self._initialized:
                await self._initialize_recorder_async()
                self._initialized = True

    async def _initialize_recorder_async(self) -> None:
        """Initialize the RealtimeSTT recorder asynchronously."""
        try:
            # Build configuration for RealtimeSTT
            config = {
                "model": self._model,
                "device": self._device,
                "compute_type": self._compute_type,
                "spinner": False,  # Disable spinner for cleaner output
                "level": 30,  # Reduce logging level
                "use_microphone": True,
            }

            # Add language configuration
            if self._language:
                config["language"] = self._language
            # If _language is None, RealtimeSTT will auto-detect

            # Add audio device configuration if available
            if self._input_device:
                config["input_device_index"] = self._input_device.index

            # Initialize in executor to avoid blocking
            loop = asyncio.get_event_loop()
            self._recorder = await loop.run_in_executor(
                None,
                lambda: AudioToTextRecorder(**config)
            )

        except Exception as e:
            raise RuntimeError(f"Failed to initialize RealtimeSTT: {e}")

    def _setup_audio_devices(
        self,
        input_device_index: Optional[int],
        output_device_index: Optional[int],
        input_device_name: Optional[str],
        output_device_name: Optional[str]
    ) -> None:
        """Set up input and output audio devices."""
        # Set up input device
        if input_device_index is not None:
            devices = self.device_manager.get_input_devices()
            for device in devices:
                if device.index == input_device_index:
                    self._input_device = device
                    break
        elif input_device_name:
            self._input_device = self.device_manager.get_device_by_name(input_device_name)
            if self._input_device and self._input_device.max_input_channels == 0:
                self._input_device = None  # Not an input device

        if not self._input_device:
            self._input_device = self.device_manager.get_default_input_device()

        # Set up output device
        if output_device_index is not None:
            devices = self.device_manager.get_output_devices()
            for device in devices:
                if device.index == output_device_index:
                    self._output_device = device
                    break
        elif output_device_name:
            self._output_device = self.device_manager.get_device_by_name(output_device_name)
            if self._output_device and self._output_device.max_output_channels == 0:
                self._output_device = None  # Not an output device

        if not self._output_device:
            self._output_device = self.device_manager.get_default_output_device()

    def get_selected_devices(self) -> tuple[Optional[AudioDevice], Optional[AudioDevice]]:
        """Get the currently selected input and output devices."""
        return self._input_device, self._output_device

    def list_available_devices(self) -> None:
        """Print available audio devices."""
        self.device_manager.print_device_list()

    def get_available_devices(self) -> list[dict]:
        """Get available audio devices as a list of dictionaries."""
        devices = []

        # Get input devices
        for device in self.device_manager.get_input_devices():
            devices.append({
                "index": device.index,
                "name": device.name,
                "type": "input",
                "channels": device.max_input_channels,
                "sample_rate": device.default_sample_rate
            })

        # Get output devices
        for device in self.device_manager.get_output_devices():
            devices.append({
                "index": device.index,
                "name": device.name,
                "type": "output",
                "channels": device.max_output_channels,
                "sample_rate": device.default_sample_rate
            })

        return devices

    def test_devices(self) -> tuple[bool, bool]:
        """Test the selected input and output devices."""
        input_ok = False
        output_ok = False

        if self._input_device:
            input_ok = self.device_manager.test_device(
                self._input_device.index, is_input=True
            )

        if self._output_device:
            output_ok = self.device_manager.test_device(
                self._output_device.index, is_input=False
            )

        return input_ok, output_ok

    async def start_real_time_transcription(
        self,
        callback: Callable[[str, bool], None]
    ) -> None:
        """Start real-time transcription with callback for updates."""
        # Ensure recorder is initialized
        await self._ensure_initialized()

        if not self._recorder:
            raise RuntimeError("RealtimeSTT recorder not initialized")

        self._is_listening = True

        def process_transcription(text: str):
            """Process transcription and call the callback."""
            if text and self._is_listening:
                # Always treat RealtimeSTT text() results as final transcriptions
                callback(text.strip(), True)

        try:
            # Start continuous listening loop
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self._continuous_transcription_loop,
                process_transcription
            )
        except Exception as e:
            self._is_listening = False
            raise RuntimeError(f"Error in real-time transcription: {e}")

    def _continuous_transcription_loop(
        self,
        callback_func: Callable[[str], None]
    ) -> None:
        """Continuous transcription loop for real-time processing."""
        import time

        print("🎤 Starting continuous transcription loop...")

        try:
            while self._is_listening:
                try:
                    # Use RealtimeSTT's text() method for transcription
                    # This method blocks until it gets a complete phrase
                    text = self._recorder.text()
                    if text and text.strip():
                        print(f"📝 Transcribed: '{text}'")  # Debug output
                        # RealtimeSTT's text() method returns complete phrases,
                        # so we treat these as final transcriptions
                        callback_func(text)

                    # No sleep needed here as text() blocks until speech is detected

                except Exception as e:
                    print(f"Error getting transcription: {e}")
                    time.sleep(0.5)  # Wait longer on error

        except Exception as e:
            print(f"Error in transcription loop: {e}")
            self._is_listening = False
        finally:
            print("🛑 Transcription loop ended")

    def stop_real_time_transcription(self) -> None:
        """Stop real-time transcription."""
        self._is_listening = False
        if self._recorder:
            try:
                self._recorder.stop()
            except Exception as e:
                print(f"Error stopping recorder: {e}")

    async def transcribe_chunk(self, chunk: AudioChunk) -> TranscriptionResult:
        """Transcribe an audio chunk to text."""
        if not self._recorder:
            raise RuntimeError("RealtimeSTT recorder not initialized")

        start_time = time.time()

        try:
            # For chunk-based transcription, we'll use a different approach
            # This is mainly for compatibility with the existing interface
            loop = asyncio.get_event_loop()

            # Use the recorder's transcription capabilities
            text = await loop.run_in_executor(
                None, self._transcribe_audio_data, chunk.data
            )

            processing_time = int((time.time() - start_time) * 1000)

            return TranscriptionResult(
                text=text or "",
                confidence=0.9,  # RealtimeSTT doesn't provide confidence scores
                language="en",  # Default to English
                audio_chunk_id=str(uuid.uuid4()),
                processing_time_ms=processing_time,
            )

        except Exception:
            # Return empty result on error
            return TranscriptionResult(
                text="",
                confidence=0.0,
                language="en",
                audio_chunk_id=str(uuid.uuid4()),
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

    def _transcribe_audio_data(self, audio_data: bytes) -> str:
        """Transcribe raw audio data."""
        try:
            # This is a simplified approach for chunk-based transcription
            # In practice, RealtimeSTT works best with continuous streaming
            # For now, we'll return a realistic placeholder
            if len(audio_data) > 0:
                return ""  # Empty for now - real implementation would process audio
            return ""
        except Exception:
            return ""

    async def detect_voice_activity(
        self, chunk: AudioChunk
    ) -> VoiceActivityDetection:
        """Detect voice activity in an audio chunk."""
        # Simple heuristic: if audio data is above certain threshold, consider speech
        if len(chunk.data) > 0:
            # Calculate simple energy level
            try:
                energy = sum(abs(int.from_bytes(chunk.data[i:i+2], 'little', signed=True))
                            for i in range(0, len(chunk.data), 2)) / (len(chunk.data) // 2)

                if energy > 1000:  # Threshold for speech detection
                    status = VoiceActivityStatus.SPEECH
                    confidence = min(energy / 10000, 1.0)
                else:
                    status = VoiceActivityStatus.SILENCE
                    confidence = 1.0 - min(energy / 1000, 1.0)
            except Exception:
                status = VoiceActivityStatus.SILENCE
                confidence = 1.0
        else:
            status = VoiceActivityStatus.SILENCE
            confidence = 1.0

        return VoiceActivityDetection(
            status=status,
            confidence=confidence,
            chunk_id=str(uuid.uuid4()),
        )

    async def stream_transcriptions(
        self, audio_stream: AsyncGenerator[AudioChunk, None]
    ) -> AsyncGenerator[TranscriptionResult, None]:
        """Stream transcriptions from an audio stream."""
        async for chunk in audio_stream:
            # Only process chunks that have voice activity
            vad_result = await self.detect_voice_activity(chunk)
            if vad_result.status == VoiceActivityStatus.SPEECH:
                transcription = await self.transcribe_chunk(chunk)
                if transcription.text.strip():
                    yield transcription

    def update_language(self, language: str) -> None:
        """Update the language for speech recognition."""
        self._language = language if language != "auto" else None
        # Need to reinitialize recorder with new language
        if self._recorder:
            try:
                self._recorder.shutdown()
            except Exception:
                pass
        asyncio.create_task(self._initialize_recorder_async())
        print(f"STT language updated to: {language}")

    def _initialize_recorder(self) -> None:
        """Synchronous wrapper for initializing recorder."""
        try:
            loop = asyncio.get_event_loop()
            loop.run_until_complete(self._initialize_recorder_async())
        except Exception as e:
            print(f"Error initializing recorder: {e}")

    def cleanup(self) -> None:
        """Cleanup resources."""
        self.stop_real_time_transcription()
        if self.device_manager:
            self.device_manager.cleanup()
        if self._recorder:
            try:
                self._recorder.shutdown()
            except Exception:
                pass
