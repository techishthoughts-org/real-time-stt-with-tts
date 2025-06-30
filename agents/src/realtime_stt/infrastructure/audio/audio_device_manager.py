"""Audio device management for optimal latency."""

import logging
import os
import time
from typing import List, Optional

import sounddevice as sd
from pydantic import BaseModel


class AudioDevice(BaseModel):
    """Audio device representation."""
    index: int
    name: str
    max_input_channels: int
    max_output_channels: int
    default_sample_rate: float
    is_default_input: bool = False
    is_default_output: bool = False
    is_loopback: bool = False
    hostapi_name: str = ""


class AudioDeviceManager:
    """Manages audio devices with resource cleanup and latency optimization."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._devices_cache = None
        self._cache_time = 0
        self._cache_duration = 30  # Cache for 30 seconds

        # Optimal settings for minimal latency
        self.optimal_settings = {
            "samplerate": 16000,
            "channels": 1,
            "dtype": "float32",
            "blocksize": 1024,  # Small buffer for low latency
            "latency": "low"
        }

    def _get_devices_info(self, force_refresh: bool = False) -> List[dict]:
        """Get audio devices info with caching."""
        current_time = time.time()

        if (not force_refresh and
                self._devices_cache and
                (current_time - self._cache_time) < self._cache_duration):
            return self._devices_cache

        try:
            # Get device info from sounddevice
            devices_info = sd.query_devices()

            # Get default devices
            try:
                default_input = sd.default.device[0]
                default_output = sd.default.device[1]
            except Exception:
                default_input = None
                default_output = None

            # Process device information
            processed_devices = []
            for i, device in enumerate(devices_info):
                try:
                    # Get host API info
                    hostapi_index = device.get('hostapi', 0)
                    try:
                        hostapi_info = sd.query_hostapis(hostapi_index)
                        hostapi_name = hostapi_info.get('name', 'Unknown')
                    except Exception:
                        hostapi_name = 'Unknown'

                    # Extract device properties (sounddevice returns dicts)
                    device_name = device.get('name', f'Device {i}')
                    max_input_channels = device.get('max_input_channels', 0)
                    max_output_channels = device.get('max_output_channels', 0)
                    default_sample_rate = device.get('default_samplerate', 44100)

                    processed_device = {
                        'index': i,
                        'name': device_name,
                        'max_input_channels': max_input_channels,
                        'max_output_channels': max_output_channels,
                        'default_sample_rate': default_sample_rate,
                        'is_default_input': i == default_input,
                        'is_default_output': i == default_output,
                        'hostapi_name': hostapi_name,
                        'is_loopback': 'loopback' in device_name.lower()
                    }
                    processed_devices.append(processed_device)

                except Exception as e:
                    self.logger.warning(f"Error processing device {i}: {e}")
                    # Add minimal device info as fallback
                    processed_devices.append({
                        'index': i,
                        'name': f'Device {i} (Error)',
                        'max_input_channels': 0,
                        'max_output_channels': 0,
                        'default_sample_rate': 16000,
                        'is_default_input': False,
                        'is_default_output': False,
                        'hostapi_name': 'Unknown',
                        'is_loopback': False
                    })

            # Cache the results
            self._devices_cache = processed_devices
            self._cache_time = current_time

            return processed_devices

        except Exception as e:
            self.logger.error(f"Error querying audio devices: {e}")
            return []

    def get_all_devices(self, force_refresh: bool = False) -> List[AudioDevice]:
        """Get all available audio devices."""
        devices_info = self._get_devices_info(force_refresh)
        devices = []

        for device_info in devices_info:
            try:
                device = AudioDevice(**device_info)
                devices.append(device)
            except Exception as e:
                self.logger.warning(f"Error creating AudioDevice: {e}")

        return devices

    def get_input_devices(self, force_refresh: bool = False) -> List[AudioDevice]:
        """Get available input devices."""
        all_devices = self.get_all_devices(force_refresh)
        return [d for d in all_devices if d.max_input_channels > 0]

    def get_output_devices(self, force_refresh: bool = False) -> List[AudioDevice]:
        """Get available output devices."""
        all_devices = self.get_all_devices(force_refresh)
        return [d for d in all_devices if d.max_output_channels > 0]

    def get_default_input_device(self) -> Optional[AudioDevice]:
        """Get the default input device."""
        input_devices = self.get_input_devices()
        for device in input_devices:
            if device.is_default_input:
                return device

        # Fallback to first available input device
        return input_devices[0] if input_devices else None

    def get_default_output_device(self) -> Optional[AudioDevice]:
        """Get the default output device."""
        output_devices = self.get_output_devices()
        for device in output_devices:
            if device.is_default_output:
                return device

        # Fallback to first available output device
        return output_devices[0] if output_devices else None

    def get_device_by_name(self, name_pattern: str) -> Optional[AudioDevice]:
        """Find device by name pattern (case-insensitive partial match)."""
        all_devices = self.get_all_devices()
        name_pattern = name_pattern.lower()

        # First try exact match
        for device in all_devices:
            if device.name.lower() == name_pattern:
                return device

        # Then try partial match
        for device in all_devices:
            if name_pattern in device.name.lower():
                return device

        return None

    def get_device_by_index(self, index: int) -> Optional[AudioDevice]:
        """Get device by index."""
        all_devices = self.get_all_devices()
        for device in all_devices:
            if device.index == index:
                return device
        return None

    def test_device(self, device_index: int, is_input: bool = True, duration: float = 0.5) -> bool:
        """Test if a device is working properly."""
        try:
            if is_input:
                # Test recording
                with sd.InputStream(
                    device=device_index,
                    channels=1,
                    samplerate=16000,
                    blocksize=1024,
                    dtype='float32'
                ) as stream:
                    # Record for a short duration
                    data, overflowed = stream.read(int(16000 * duration))
                    return not overflowed and len(data) > 0
            else:
                # Test playback
                import numpy as np

                # Generate a short quiet sine wave
                t = np.linspace(0, duration, int(16000 * duration), False)
                audio = np.sin(2 * np.pi * 440 * t) * 0.1  # Quiet 440Hz tone

                with sd.OutputStream(
                    device=device_index,
                    channels=1,
                    samplerate=16000,
                    blocksize=1024,
                    dtype='float32'
                ) as stream:
                    stream.write(audio.reshape(-1, 1))
                    return True

        except Exception as e:
            self.logger.warning(f"Device test failed for device {device_index}: {e}")
            return False

    def get_optimal_settings_for_device(self, device: AudioDevice, is_input: bool = True) -> dict:
        """Get optimal settings for a specific device to minimize latency."""
        settings = self.optimal_settings.copy()

        # Adjust sample rate if device doesn't support 16kHz
        if device.default_sample_rate != 16000:
            # Use device's default if it's reasonable
            if 8000 <= device.default_sample_rate <= 48000:
                settings["samplerate"] = int(device.default_sample_rate)

        # Adjust channels based on device capabilities
        if is_input:
            max_channels = device.max_input_channels
        else:
            max_channels = device.max_output_channels

        if max_channels > 0:
            settings["channels"] = min(settings["channels"], max_channels)

        # macOS specific optimizations
        if device.hostapi_name == "Core Audio":
            settings["latency"] = "low"
            settings["blocksize"] = 512  # Even smaller for Core Audio

        return settings

    def print_device_list(self):
        """Print a formatted list of available devices."""
        devices = self.get_all_devices(force_refresh=True)

        if not devices:
            print("No audio devices found.")
            return

        print("\n📻 Available Audio Devices:")
        print("=" * 60)

        input_devices = [d for d in devices if d.max_input_channels > 0]
        output_devices = [d for d in devices if d.max_output_channels > 0]

        if input_devices:
            print("\n🎤 Input Devices:")
            for device in input_devices:
                default_marker = " (DEFAULT)" if device.is_default_input else ""
                print(f"  [{device.index}] {device.name}{default_marker}")
                print(f"      Channels: {device.max_input_channels}, "
                      f"Sample Rate: {device.default_sample_rate}Hz")
                print(f"      Host API: {device.hostapi_name}")

        if output_devices:
            print("\n🔊 Output Devices:")
            for device in output_devices:
                default_marker = " (DEFAULT)" if device.is_default_output else ""
                print(f"  [{device.index}] {device.name}{default_marker}")
                print(f"      Channels: {device.max_output_channels}, "
                      f"Sample Rate: {device.default_sample_rate}Hz")
                print(f"      Host API: {device.hostapi_name}")

        print("=" * 60)

    def get_system_info(self) -> dict:
        """Get system audio information."""
        try:
            # Get sounddevice info
            sd_info = {
                "sounddevice_version": sd.__version__,
                "platform": os.name
            }

            # Get PortAudio info
            try:
                pa_version = sd.get_portaudio_version()
                sd_info["portaudio_version"] = pa_version[1]
            except Exception:
                sd_info["portaudio_version"] = "Unknown"

            # Get host APIs
            try:
                hostapis = []
                for i in range(sd.query_hostapis()):
                    api_info = sd.query_hostapis(i)
                    hostapis.append({
                        "name": api_info["name"],
                        "device_count": api_info["device_count"]
                    })
                sd_info["host_apis"] = hostapis
            except Exception:
                sd_info["host_apis"] = []

            # Device counts
            all_devices = self.get_all_devices()
            sd_info["total_devices"] = len(all_devices)
            sd_info["input_devices"] = len([d for d in all_devices if d.max_input_channels > 0])
            sd_info["output_devices"] = len([d for d in all_devices if d.max_output_channels > 0])

            return sd_info

        except Exception as e:
            self.logger.error(f"Error getting system info: {e}")
            return {"error": str(e)}

    def cleanup(self):
        """Cleanup resources and clear cache."""
        self._devices_cache = None
        self._cache_time = 0

        # Stop any active streams (sounddevice should handle this automatically)
        try:
            sd.stop()
        except Exception as e:
            self.logger.warning(f"Error stopping sounddevice: {e}")

    def __del__(self):
        """Destructor to ensure cleanup."""
        try:
            self.cleanup()
        except Exception:
            pass  # Ignore errors during cleanup in destructor
