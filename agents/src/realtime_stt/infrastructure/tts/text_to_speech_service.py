"""Text-to-speech service for AI responses."""

import asyncio
import io
import os
import subprocess
import sys
import tempfile
from typing import Optional

import numpy as np
import pyaudio

from ..observability.logger import observability


class TextToSpeechService:
    """Service for converting text to speech and playing audio."""

    def __init__(self, output_device_index: Optional[int] = None, language: str = "en"):
        """Initialize TTS service.

        Args:
            output_device_index: Specific audio output device to use
            language: Language code for TTS ("en", "es", "fr", etc.)
        """
        self.logger = observability.get_logger("tts_service")
        self.output_device_index = output_device_index
        self.language = language
        self._pyaudio_instance: Optional[pyaudio.PyAudio] = None

        # Check available TTS methods
        self.tts_method = self._determine_tts_method()

        observability.log_event("tts_service_initialized",
                              method=self.tts_method,
                              language=self.language)

    def _determine_tts_method(self) -> str:
        """Determine which TTS method to use based on available tools."""
        # Check for macOS say command
        if sys.platform == "darwin":
            try:
                subprocess.run(["which", "say"], check=True, capture_output=True)
                return "macos_say"
            except subprocess.CalledProcessError:
                pass

        # Check for espeak (Linux)
        try:
            subprocess.run(["which", "espeak"], check=True, capture_output=True)
            return "espeak"
        except subprocess.CalledProcessError:
            pass

        # Check for festival (Linux)
        try:
            subprocess.run(["which", "festival"], check=True, capture_output=True)
            return "festival"
        except subprocess.CalledProcessError:
            pass

        # Fallback to simple beep
        return "beep"

    def _get_pyaudio(self) -> pyaudio.PyAudio:
        """Get or create PyAudio instance."""
        if self._pyaudio_instance is None:
            self._pyaudio_instance = pyaudio.PyAudio()
        return self._pyaudio_instance

    async def speak_text(self, text: str, voice: str = "default") -> bool:
        """Convert text to speech and play it.

        Args:
            text: Text to convert to speech
            voice: Voice to use (method-dependent)

        Returns:
            True if successful, False otherwise
        """
        if not text.strip():
            return False

        observability.log_event("tts_speak_started",
                              text_length=len(text),
                              method=self.tts_method)

        try:
            loop = asyncio.get_event_loop()

            # Run TTS in executor to avoid blocking
            success = await loop.run_in_executor(
                None, self._speak_text_sync, text, voice
            )

            observability.log_event("tts_speak_completed", success=success)
            return success

        except Exception as e:
            self.logger.error(f"Error in TTS: {e}")
            observability.log_error(e, {"text": text[:100]})
            return False

    def _speak_text_sync(self, text: str, voice: str = "default") -> bool:
        """Synchronous text-to-speech conversion."""
        try:
            if self.tts_method == "macos_say":
                return self._speak_macos_say(text, voice)
            elif self.tts_method == "espeak":
                return self._speak_espeak(text, voice)
            elif self.tts_method == "festival":
                return self._speak_festival(text)
            else:
                return self._speak_beep_fallback(text)

        except Exception as e:
            self.logger.error(f"Error in sync TTS: {e}")
            return False

    def _speak_macos_say(self, text: str, voice: str = "default") -> bool:
        """Use macOS say command for TTS with language support."""
        try:
            cmd = ["say"]

            # Add voice selection based on language if default voice is used
            if voice == "default":
                # Map language codes to macOS voices
                language_voices = {
                    "en": "Samantha",      # English (US)
                    "es": "Paulina",       # Spanish (Mexico)
                    "fr": "Amelie",        # French (France)
                    "de": "Anna",          # German (Germany)
                    "it": "Alice",         # Italian (Italy)
                    "pt": "Joana",         # Portuguese (Portugal)
                    "pt-br": "Luciana",    # Portuguese (Brazil)
                    "pt_br": "Luciana",    # Portuguese (Brazil) - alternative format
                    "ru": "Milena",        # Russian (Russia)
                    "ja": "Kyoko",         # Japanese (Japan)
                    "ko": "Yuna",          # Korean (Korea)
                    "zh": "Ting-Ting",    # Chinese (China)
                    "hi": "Lekha",         # Hindi (India)
                    "ar": "Maged",         # Arabic (Saudi Arabia)
                    "nl": "Ellen",         # Dutch (Netherlands)
                    "sv": "Alva",          # Swedish (Sweden)
                    "no": "Nora",          # Norwegian (Norway)
                    "da": "Sara",          # Danish (Denmark)
                    "fi": "Satu",          # Finnish (Finland)
                    "pl": "Zosia",         # Polish (Poland)
                    "cs": "Zuzana",        # Czech (Czech Republic)
                    "tr": "Yelda",         # Turkish (Turkey)
                }

                # Use language-specific voice if available
                if self.language in language_voices:
                    cmd.extend(["-v", language_voices[self.language]])
            else:
                cmd.extend(["-v", voice])

            # Add output device if specified
            if self.output_device_index is not None:
                # Note: macOS say doesn't directly support device selection
                # It uses the system default audio device
                pass

            # Add text
            cmd.append(text)

            # Execute command
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            if result.returncode == 0:
                self.logger.info(f"Successfully spoke text using macOS say (lang: {self.language})")
                return True
            else:
                self.logger.error(f"macOS say failed: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            self.logger.error("macOS say command timed out")
            return False
        except Exception as e:
            self.logger.error(f"Error with macOS say: {e}")
            return False

    def _speak_espeak(self, text: str, voice: str = "default") -> bool:
        """Use espeak for TTS (Linux)."""
        try:
            cmd = ["espeak", "-s", "150"]  # Set speaking rate

            if voice != "default":
                cmd.extend(["-v", voice])

            cmd.append(text)

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            if result.returncode == 0:
                self.logger.info(f"Successfully spoke text using espeak")
                return True
            else:
                self.logger.error(f"espeak failed: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            self.logger.error("espeak command timed out")
            return False
        except Exception as e:
            self.logger.error(f"Error with espeak: {e}")
            return False

    def _speak_festival(self, text: str) -> bool:
        """Use Festival for TTS (Linux)."""
        try:
            # Create temporary file for Festival
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(text)
                temp_file = f.name

            try:
                cmd = ["festival", "--tts", temp_file]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

                if result.returncode == 0:
                    self.logger.info(f"Successfully spoke text using Festival")
                    return True
                else:
                    self.logger.error(f"Festival failed: {result.stderr}")
                    return False
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_file)
                except Exception:
                    pass

        except subprocess.TimeoutExpired:
            self.logger.error("Festival command timed out")
            return False
        except Exception as e:
            self.logger.error(f"Error with Festival: {e}")
            return False

    def _speak_beep_fallback(self, text: str) -> bool:
        """Fallback method using audio beeps to indicate speech."""
        try:
            # Generate beep pattern based on text length
            beep_count = min(len(text.split()), 5)  # Max 5 beeps

            self._play_beep_pattern(beep_count)

            self.logger.info(f"Played {beep_count} beeps as TTS fallback")
            return True

        except Exception as e:
            self.logger.error(f"Error with beep fallback: {e}")
            return False

    def _play_beep_pattern(self, beep_count: int) -> None:
        """Play a pattern of beeps."""
        try:
            p = self._get_pyaudio()

            # Audio parameters
            sample_rate = 44100
            duration = 0.2  # 200ms per beep
            frequency = 800  # 800 Hz beep

            # Generate beep sound
            frames = int(duration * sample_rate)
            t = np.linspace(0, duration, frames, False)
            beep_wave = 0.3 * np.sin(2 * np.pi * frequency * t)
            beep_audio = (beep_wave * 32767).astype(np.int16)

            # Open audio stream
            stream = p.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=sample_rate,
                output=True,
                output_device_index=self.output_device_index,
                frames_per_buffer=1024
            )

            try:
                for i in range(beep_count):
                    # Play beep
                    stream.write(beep_audio.tobytes())

                    # Short pause between beeps
                    if i < beep_count - 1:
                        silence = np.zeros(int(0.1 * sample_rate), dtype=np.int16)
                        stream.write(silence.tobytes())

            finally:
                stream.close()

        except Exception as e:
            self.logger.error(f"Error playing beep pattern: {e}")

    def get_available_voices(self) -> list[str]:
        """Get list of available voices for the current TTS method."""
        try:
            if self.tts_method == "macos_say":
                result = subprocess.run(["say", "-v", "?"],
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    voices = []
                    for line in result.stdout.split('\n'):
                        if line.strip():
                            # Extract voice name (first word)
                            voice_name = line.split()[0]
                            voices.append(voice_name)
                    return voices
            elif self.tts_method == "espeak":
                result = subprocess.run(["espeak", "--voices"],
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    voices = []
                    for line in result.stdout.split('\n')[1:]:  # Skip header
                        if line.strip():
                            parts = line.split()
                            if len(parts) >= 4:
                                voices.append(parts[3])  # Voice identifier
                    return voices

        except Exception as e:
            self.logger.error(f"Error getting available voices: {e}")

        return ["default"]

    def set_output_device(self, device_index: int) -> None:
        """Set the output device for audio playback."""
        self.output_device_index = device_index
        observability.log_event("tts_output_device_changed", device_index=device_index)

    def update_language(self, language: str) -> None:
        """Update the language for TTS."""
        self.language = language
        observability.log_event("tts_language_updated", language=language)
        self.logger.info(f"TTS language updated to: {language}")

    def cleanup(self) -> None:
        """Cleanup TTS resources."""
        if self._pyaudio_instance:
            self._pyaudio_instance.terminate()
            self._pyaudio_instance = None
        observability.log_event("tts_service_cleanup")
