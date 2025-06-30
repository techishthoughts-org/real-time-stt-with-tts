"""Real-time audio capture integration."""

import asyncio
import io
import queue
import time
import wave
from typing import AsyncGenerator, Callable, Optional, Tuple

import numpy as np
import sounddevice as sd
from RealtimeSTT import AudioToTextRecorder

from ...domain.entities.audio import AudioChunk, TranscriptionResult
from ...infrastructure.observability.logger import observability


class RealtimeAudioCapture:
    """Real-time audio capture with integrated STT and minimal latency."""

    def __init__(
        self,
        model: str = "tiny",
        device: str = "cpu",
        use_vad: bool = True,
        language: str = "en",
        capture_audio: bool = True,
        input_device_index: Optional[int] = None,
        sample_rate: int = 16000,
        channels: int = 1,
        chunk_size: int = 1024,  # Smaller chunk for lower latency
    ):
        self.model = model
        self.device = device
        self.use_vad = use_vad
        self.language = language
        self.capture_audio = capture_audio
        self.input_device_index = input_device_index
        self.logger = observability.get_logger("audio_capture")

        # Initialize recorder
        self.recorder: Optional[AudioToTextRecorder] = None
        self.is_recording = False
        self.transcription_queue = queue.Queue()
        self.audio_queue = queue.Queue()
        self.callback_handler: Optional[Callable] = None

        # Audio capture settings optimized for low latency
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_size = chunk_size
        # Dynamic calculation
        self.chunk_duration_ms = (chunk_size / sample_rate) * 1000

        # Real-time audio processing
        self.audio_stream = None
        self.audio_buffer = np.array([], dtype=np.float32)
        self.spectrum_data = np.zeros(32)  # For visualization
        self.current_level = 0.0

        # Cleanup tracking
        self._cleanup_done = False

    async def initialize(self):
        """Initialize the RealtimeSTT recorder with optimized settings."""
        try:
            with observability.trace_span("audio_capture_init"):
                self.logger.info(
                    "Initializing RealtimeSTT recorder with real-time audio capture"
                )

                # Enhanced recorder configuration for minimal latency
                recorder_config = {
                    "model": self.model,
                    "device": self.device,
                    "language": self.language,
                    "spinner": False,
                    "level": 30,  # Reduce logging
                    "enable_realtime_transcription": True,
                    "realtime_processing_pause": 0.1,  # Faster processing
                    "wake_words_sensitivity": 0.5,
                    "silero_sensitivity": 0.05,  # More sensitive VAD
                    "post_speech_silence_duration": 0.3,  # Shorter silence
                    "min_length_of_recording": 0.5,  # Shorter minimum
                    "min_gap_between_recordings": 0.1,  # Faster gap
                }

                # Add input device if specified
                if self.input_device_index is not None:
                    recorder_config[
                        "input_device_index"
                    ] = self.input_device_index

                self.recorder = AudioToTextRecorder(**recorder_config)

                # Initialize real-time audio stream for visualization
                if self.capture_audio:
                    await self._setup_audio_stream()

                observability.log_event(
                    "audio_capture_initialized",
                    model=self.model,
                    audio_capture=self.capture_audio,
                    latency_optimized=True
                )
                self.logger.info(
                    "RealtimeSTT recorder initialized successfully "
                    "with low-latency audio capture"
                )

        except Exception as e:
            observability.log_error(e, {"model": self.model, "device": self.device})
            raise RuntimeError(f"Failed to initialize audio capture: {e}")

    async def _setup_audio_stream(self):
        """Set up real-time audio stream for visualization and processing."""
        try:
            # Audio stream callback for real-time processing
            def audio_callback(indata, frames, time, status):
                if status:
                    self.logger.warning(f"Audio stream status: {status}")

                # Convert to float32 and flatten
                audio_data = indata[:, 0].astype(np.float32)

                # Update audio buffer
                self.audio_buffer = np.append(
                    self.audio_buffer, audio_data
                )

                # Keep buffer manageable (1 second of audio)
                max_buffer_size = self.sample_rate * 1
                if len(self.audio_buffer) > max_buffer_size:
                    self.audio_buffer = self.audio_buffer[-max_buffer_size:]

                # Calculate audio level
                self.current_level = float(
                    np.sqrt(np.mean(audio_data ** 2))
                )

                # Calculate spectrum for visualization
                if len(self.audio_buffer) >= 1024:
                    self._calculate_spectrum()

            # Create audio stream with low latency settings
            self.audio_stream = sd.InputStream(
                device=self.input_device_index,
                channels=self.channels,
                samplerate=self.sample_rate,
                blocksize=self.chunk_size,
                callback=audio_callback,
                dtype=np.float32
            )

            self.logger.info("Real-time audio stream configured")

        except Exception as e:
            self.logger.error(f"Failed to setup audio stream: {e}")
            raise

    def _calculate_spectrum(self):
        """Calculate frequency spectrum for real-time visualization."""
        try:
            # Use the most recent audio data
            if len(self.audio_buffer) < 1024:
                return

            # Apply window function to reduce artifacts
            windowed = self.audio_buffer[-1024:] * np.hanning(1024)

            # Calculate FFT
            fft = np.fft.rfft(windowed)
            magnitude = np.abs(fft)

            # Convert to dB scale
            magnitude_db = 20 * np.log10(magnitude + 1e-8)

            # Bin the spectrum into 32 frequency bands
            n_bins = 32
            bin_size = len(magnitude_db) // n_bins

            spectrum = np.zeros(n_bins)
            for i in range(n_bins):
                start_idx = i * bin_size
                end_idx = (i + 1) * bin_size
                spectrum[i] = np.mean(magnitude_db[start_idx:end_idx])

            # Normalize to 0-1 range
            spectrum = np.clip((spectrum + 60) / 60, 0, 1)  # Assuming -60dB to 0dB range

            self.spectrum_data = spectrum

        except Exception as e:
            self.logger.error(f"Error calculating spectrum: {e}")

    def set_transcription_callback(self, callback: Callable[[str, float, Optional[AudioChunk]], None]):
        """Set callback for when transcription is ready with optional audio chunk."""
        self.callback_handler = callback

    async def start_listening(self) -> AsyncGenerator[Tuple[TranscriptionResult, Optional[AudioChunk]], None]:
        """Start listening and yield transcription results with audio chunks."""
        if not self.recorder:
            await self.initialize()

        self.is_recording = True

        # Start audio stream if available
        if self.audio_stream and not self.audio_stream.active:
            self.audio_stream.start()

        observability.log_event("audio_capture_started",
                              audio_enabled=self.capture_audio,
                              low_latency=True)

        try:
            while self.is_recording:
                with observability.trace_span("audio_transcription_cycle"):
                    # Capture both transcription and audio
                    result = await self._capture_transcription_and_audio()

                    if result:
                        transcription_result, audio_chunk = result

                        if transcription_result.text.strip():
                            observability.log_event(
                                "transcription_with_audio_received",
                                text_length=len(transcription_result.text),
                                text_preview=transcription_result.text[:50] + "..." if len(transcription_result.text) > 50 else transcription_result.text,
                                audio_duration_ms=audio_chunk.duration_ms if audio_chunk else 0,
                                audio_size_bytes=len(audio_chunk.data) if audio_chunk else 0,
                                audio_level=self.current_level
                            )

                            if self.callback_handler:
                                self.callback_handler(
                                    transcription_result.text,
                                    transcription_result.confidence,
                                    audio_chunk
                                )

                            yield transcription_result, audio_chunk

                await asyncio.sleep(0.05)  # Reduced delay for better responsiveness

        except Exception as e:
            observability.log_error(e)
            raise
        finally:
            await self.stop_listening()

    async def _capture_transcription_and_audio(self) -> Optional[Tuple[TranscriptionResult, Optional[AudioChunk]]]:
        """Capture both transcription and real audio using RealtimeSTT."""
        try:
            loop = asyncio.get_event_loop()

            def listen_with_audio():
                if self.recorder and self.is_recording:
                    try:
                        # Get transcription
                        text = self.recorder.text()

                        if text and text.strip():
                            # Create audio chunk from real audio buffer
                            audio_chunk = None
                            if self.capture_audio and len(self.audio_buffer) > 0:
                                audio_chunk = self._create_real_audio_chunk()

                            # Create transcription result
                            transcription_result = TranscriptionResult(
                                text=text,
                                confidence=0.95,  # RealtimeSTT typically has high confidence
                                language=self.language,
                                audio_chunk_id=f"chunk_{int(time.time() * 1000)}",
                                processing_time_ms=int(self.chunk_duration_ms)
                            )

                            return transcription_result, audio_chunk

                    except Exception as e:
                        self.logger.error(f"Error in listen_with_audio: {e}")
                        return None
                return None

            # Run in thread pool to avoid blocking
            result = await loop.run_in_executor(None, listen_with_audio)
            return result

        except Exception as e:
            self.logger.error(f"Error capturing transcription and audio: {e}")
            return None

    def _create_real_audio_chunk(self) -> AudioChunk:
        """Create an audio chunk from real microphone input."""
        try:
            if len(self.audio_buffer) == 0:
                return self._create_empty_audio_chunk()

            # Use the most recent audio data
            chunk_samples = min(int(self.sample_rate * 0.5), len(self.audio_buffer))  # 0.5 seconds
            audio_samples = self.audio_buffer[-chunk_samples:].copy()

            # Convert to 16-bit PCM
            audio_int16 = (audio_samples * 32767).astype(np.int16)
            audio_bytes = audio_int16.tobytes()

            duration_ms = int((len(audio_samples) / self.sample_rate) * 1000)

            return AudioChunk(
                data=audio_bytes,
                sample_rate=self.sample_rate,
                channels=self.channels,
                duration_ms=duration_ms,
            )

        except Exception as e:
            self.logger.error(f"Error creating real audio chunk: {e}")
            return self._create_empty_audio_chunk()

    def _create_empty_audio_chunk(self) -> AudioChunk:
        """Create an empty audio chunk as fallback."""
        return AudioChunk(
            data=b'',
            sample_rate=self.sample_rate,
            channels=self.channels,
            duration_ms=0,
        )

    def _audio_to_wav_bytes(self, audio_data: bytes, sample_rate: int, channels: int) -> bytes:
        """Convert raw audio data to WAV format bytes."""
        try:
            # Create a BytesIO object to hold the WAV data
            wav_buffer = io.BytesIO()

            # Write WAV data
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(channels)
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data)

            # Get the WAV bytes
            wav_buffer.seek(0)
            return wav_buffer.read()

        except Exception as e:
            self.logger.error(f"Error converting to WAV: {e}")
            return b''

    def get_audio_visualization_data(self, audio_chunk: AudioChunk) -> dict:
        """Get real-time audio visualization data."""
        try:
            return {
                "level": min(self.current_level * 100, 100),  # Convert to percentage
                "spectrum": self.spectrum_data.tolist(),
                "sample_rate": self.sample_rate,
                "channels": self.channels,
                "chunk_duration_ms": self.chunk_duration_ms,
                "buffer_size": len(self.audio_buffer),
                "frequency_bands": [
                    {"range": "0-500 Hz", "values": self.spectrum_data[:8].tolist()},
                    {"range": "500-2000 Hz", "values": self.spectrum_data[8:16].tolist()},
                    {"range": "2000-8000 Hz", "values": self.spectrum_data[16:24].tolist()},
                    {"range": "8000+ Hz", "values": self.spectrum_data[24:32].tolist()}
                ]
            }

        except Exception as e:
            self.logger.error(f"Error getting visualization data: {e}")
            return {
                "level": 0,
                "spectrum": [0] * 32,
                "sample_rate": self.sample_rate,
                "channels": self.channels,
                "chunk_duration_ms": 0,
                "buffer_size": 0,
                "frequency_bands": []
            }

    async def stop_listening(self):
        """Stop listening and cleanup resources."""
        if self._cleanup_done:
            return

        self.is_recording = False

        try:
            # Stop audio stream
            if self.audio_stream and self.audio_stream.active:
                self.audio_stream.stop()
                self.audio_stream.close()
                self.audio_stream = None

            # Clear audio buffer
            self.audio_buffer = np.array([], dtype=np.float32)

            observability.log_event("audio_capture_stopped")
            self.logger.info("Audio capture stopped and cleaned up")

        except Exception as e:
            self.logger.error(f"Error stopping audio capture: {e}")

    def is_listening(self) -> bool:
        """Check if currently listening."""
        return self.is_recording

    async def cleanup(self):
        """Cleanup all resources."""
        if self._cleanup_done:
            return

        await self.stop_listening()

        try:
            if self.recorder:
                # Give recorder time to finish
                await asyncio.sleep(0.1)
                self.recorder = None

            # Clear queues
            while not self.transcription_queue.empty():
                try:
                    self.transcription_queue.get_nowait()
                except queue.Empty:
                    break

            while not self.audio_queue.empty():
                try:
                    self.audio_queue.get_nowait()
                except queue.Empty:
                    break

            self._cleanup_done = True
            observability.log_event("audio_capture_cleaned_up")
            self.logger.info("All audio capture resources cleaned up")

        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")

    def export_audio_chunk(self, audio_chunk: AudioChunk, format: str = "wav") -> bytes:
        """Export audio chunk in specified format."""
        try:
            if format.lower() == "wav":
                return self._audio_to_wav_bytes(
                    audio_chunk.data,
                    audio_chunk.sample_rate,
                    audio_chunk.channels
                )
            else:
                # For other formats, return raw data
                return audio_chunk.data

        except Exception as e:
            self.logger.error(f"Error exporting audio chunk: {e}")
            return b''
