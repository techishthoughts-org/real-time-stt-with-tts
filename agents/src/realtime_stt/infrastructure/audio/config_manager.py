"""Configuration manager for RealtimeSTT settings."""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from ..observability.logger import observability


class ConfigManager:
    """Manages configuration settings for RealtimeSTT."""

    def __init__(self, config_file: str = ".realtime_stt_config.json"):
        self.config_file = Path(config_file)
        self.logger = observability.get_logger("config_manager")
        self._default_config = {
            "audio": {
                "input_device_index": None,
                "output_device_index": None,
                "input_device_name": None,
                "output_device_name": None,
                "last_tested": None
            },
            "stt": {
                "model": "tiny",
                "device": "cpu",
                "compute_type": "int8",
                "language": "en"
            },
            "ai": {
                "use_openai": False,
                "model": "gpt-3.5-turbo"
            },
            "ui": {
                "show_help_on_start": True,
                "auto_detect_devices": True
            }
        }
        self._config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or create default."""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    # Merge with defaults to ensure all keys exist
                    merged_config = self._merge_configs(self._default_config, config)
                    observability.log_event(
                        "config_loaded",
                        config_file=str(self.config_file),
                        keys_loaded=list(config.keys())
                    )
                    return merged_config
            else:
                self.logger.info(f"No config file found, creating default: {self.config_file}")
                return self._default_config.copy()
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            observability.log_error(e, {"config_file": str(self.config_file)})
            return self._default_config.copy()

    def _merge_configs(self, default: Dict, loaded: Dict) -> Dict:
        """Recursively merge loaded config with defaults."""
        result = default.copy()
        for key, value in loaded.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_configs(result[key], value)
            else:
                result[key] = value
        return result

    def save_config(self) -> bool:
        """Save current configuration to file."""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self._config, f, indent=2)
            observability.log_event(
                "config_saved",
                config_file=str(self.config_file),
                keys_saved=list(self._config.keys())
            )
            return True
        except Exception as e:
            self.logger.error(f"Error saving config: {e}")
            observability.log_error(e, {"config_file": str(self.config_file)})
            return False

    def get(self, key_path: str, default: Any = None) -> Any:
        """Get configuration value using dot notation (e.g., 'audio.input_device_index')."""
        keys = key_path.split('.')
        value = self._config
        try:
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default

    def set(self, key_path: str, value: Any, save: bool = True) -> bool:
        """Set configuration value using dot notation."""
        keys = key_path.split('.')
        config = self._config

        try:
            # Navigate to parent of target key
            for key in keys[:-1]:
                if key not in config:
                    config[key] = {}
                config = config[key]

            # Set the final value
            config[keys[-1]] = value

            if save:
                return self.save_config()
            return True
        except Exception as e:
            self.logger.error(f"Error setting config {key_path}: {e}")
            return False

    def get_audio_config(self) -> Dict[str, Any]:
        """Get audio configuration."""
        return self._config.get("audio", {})

    def set_audio_devices(self, input_index: Optional[int] = None,
                         output_index: Optional[int] = None,
                         input_name: Optional[str] = None,
                         output_name: Optional[str] = None,
                         save: bool = True) -> bool:
        """Set audio device configuration."""
        audio_config = self._config.setdefault("audio", {})

        if input_index is not None:
            audio_config["input_device_index"] = input_index
        if output_index is not None:
            audio_config["output_device_index"] = output_index
        if input_name is not None:
            audio_config["input_device_name"] = input_name
        if output_name is not None:
            audio_config["output_device_name"] = output_name

        audio_config["last_tested"] = None  # Reset test status

        if save:
            return self.save_config()
        return True

    def get_stt_config(self) -> Dict[str, Any]:
        """Get STT configuration."""
        return self._config.get("stt", {})

    def get_ai_config(self) -> Dict[str, Any]:
        """Get AI configuration."""
        return self._config.get("ai", {})

    def get_ui_config(self) -> Dict[str, Any]:
        """Get UI configuration."""
        return self._config.get("ui", {})

    def reset_to_defaults(self, save: bool = True) -> bool:
        """Reset configuration to defaults."""
        self._config = self._default_config.copy()
        if save:
            return self.save_config()
        return True

    def get_config_summary(self) -> str:
        """Get a human-readable summary of current configuration."""
        audio = self.get_audio_config()
        stt = self.get_stt_config()

        summary = []
        summary.append("📋 Current Configuration:")
        summary.append("-" * 30)

        # Audio settings
        input_info = f"Input: {audio.get('input_device_index', 'Auto')} ({audio.get('input_device_name', 'Default')})"
        output_info = f"Output: {audio.get('output_device_index', 'Auto')} ({audio.get('output_device_name', 'Default')})"
        summary.append(f"🎤 {input_info}")
        summary.append(f"🔊 {output_info}")

        # STT settings
        summary.append(f"🤖 Model: {stt.get('model', 'tiny')} | Device: {stt.get('device', 'cpu')}")
        summary.append(f"📁 Config file: {self.config_file}")

        return "\n".join(summary)

    def backup_config(self, backup_suffix: str = ".backup") -> bool:
        """Create a backup of current configuration."""
        try:
            if self.config_file.exists():
                backup_file = Path(str(self.config_file) + backup_suffix)
                import shutil
                shutil.copy2(self.config_file, backup_file)
                self.logger.info(f"Config backed up to: {backup_file}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Error backing up config: {e}")
            return False
