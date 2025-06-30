"""Keyboard handler for CLI shortcuts and controls."""

import sys
import threading
import time
from enum import Enum
from typing import Callable, Dict, Optional

from ..observability.logger import observability


class KeyAction(Enum):
    """Available keyboard actions."""
    QUIT = "quit"
    HELP = "help"
    CHANGE_DEVICES = "change_devices"
    PAUSE_RESUME = "pause_resume"
    TOGGLE_AI = "toggle_ai"
    SHOW_CONFIG = "show_config"
    SAVE_CONFIG = "save_config"


class KeyboardHandler:
    """Handles keyboard shortcuts for CLI interface."""

    def __init__(self):
        self.logger = observability.get_logger("keyboard_handler")
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._callbacks: Dict[str, Callable] = {}
        self._key_bindings = {
            'q': KeyAction.QUIT,
            'h': KeyAction.HELP,
            'd': KeyAction.CHANGE_DEVICES,
            ' ': KeyAction.PAUSE_RESUME,  # Space bar
            'a': KeyAction.TOGGLE_AI,
            'c': KeyAction.SHOW_CONFIG,
            's': KeyAction.SAVE_CONFIG,
        }
        # Custom bindings for direct callbacks (not enum actions)
        self._custom_callbacks: Dict[str, Callable] = {}
        self._setup_platform_input()

    def _setup_platform_input(self):
        """Setup platform-specific input handling."""
        try:
            if sys.platform == "win32":
                import msvcrt
                self._get_key = self._get_key_windows
            else:
                import termios
                import tty
                self._get_key = self._get_key_unix
                # Store original terminal settings
                self._old_settings = termios.tcgetattr(sys.stdin)
        except ImportError as e:
            self.logger.warning(f"Platform input setup failed: {e}")
            self._get_key = self._get_key_fallback

    def _get_key_windows(self) -> Optional[str]:
        """Get key press on Windows."""
        try:
            import msvcrt
            if msvcrt.kbhit():
                key = msvcrt.getch().decode('utf-8').lower()
                return key
        except Exception:
            pass
        return None

    def _get_key_unix(self) -> Optional[str]:
        """Get key press on Unix/Linux/macOS."""
        try:
            import select
            import sys
            import termios
            import tty

            # Check if input is available
            if select.select([sys.stdin], [], [], 0.1)[0]:
                # Set terminal to raw mode temporarily
                tty.setraw(sys.stdin.fileno())
                key = sys.stdin.read(1).lower()
                # Restore terminal settings
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self._old_settings)
                return key
        except Exception:
            pass
        return None

    def _get_key_fallback(self) -> Optional[str]:
        """Fallback key input method."""
        try:
            # Simple input method - requires Enter
            import select
            import sys
            if select.select([sys.stdin], [], [], 0.1)[0]:
                return input().lower().strip()[:1] if input() else None
        except Exception:
            pass
        return None

    def register_callback(self, action, callback: Callable):
        """Register a callback for a specific action."""
        if isinstance(action, KeyAction):
            self._callbacks[action.value] = callback
            observability.log_event(
                "keyboard_callback_registered",
                action=action.value,
                key=self._get_key_for_action(action)
            )
        else:
            # Direct key binding
            self._custom_callbacks[action] = callback
            observability.log_event(
                "keyboard_custom_callback_registered",
                key=action
            )

    def _get_key_for_action(self, action: KeyAction) -> Optional[str]:
        """Get the key mapped to an action."""
        for key, mapped_action in self._key_bindings.items():
            if mapped_action == action:
                return key
        return None

    def start(self):
        """Start the keyboard handler in a background thread."""
        if self._running:
            return

        self._running = True
        self._thread = threading.Thread(target=self._keyboard_loop, daemon=True)
        self._thread.start()

        observability.log_event("keyboard_handler_started")
        self.logger.info("Keyboard handler started")

    def stop(self):
        """Stop the keyboard handler."""
        if not self._running:
            return

        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)

        # Restore terminal settings if needed
        if hasattr(self, '_old_settings') and sys.platform != "win32":
            try:
                import termios
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self._old_settings)
            except Exception:
                pass

        observability.log_event("keyboard_handler_stopped")
        self.logger.info("Keyboard handler stopped")

    def _keyboard_loop(self):
        """Main keyboard monitoring loop."""
        while self._running:
            try:
                key = self._get_key()
                if key:
                    callback = None
                    action_name = None

                    # Check standard key bindings
                    if key in self._key_bindings:
                        action = self._key_bindings[key]
                        callback = self._callbacks.get(action.value)
                        action_name = action.value

                    # Check custom key bindings
                    elif key in self._custom_callbacks:
                        callback = self._custom_callbacks[key]
                        action_name = f"custom_{key}"

                    if callback:
                        observability.log_event(
                            "keyboard_shortcut_triggered",
                            key=key,
                            action=action_name
                        )
                        try:
                            callback()
                        except Exception as e:
                            self.logger.error(f"Error in keyboard callback: {e}")
                            observability.log_error(e, {
                                "key": key,
                                "action": action_name
                            })

                time.sleep(0.1)  # Small delay to prevent CPU spinning

            except Exception as e:
                self.logger.error(f"Error in keyboard loop: {e}")
                observability.log_error(e)
                time.sleep(0.5)  # Longer delay on error

    def get_help_text(self) -> str:
        """Get formatted help text for keyboard shortcuts."""
        help_lines = [
            "⌨️  Keyboard Shortcuts:",
            "=" * 40,
            "📋 Navigation & Control:",
            "  q  - Quit application",
            "  h  - Show this help",
            "  c  - Show current configuration",
            "  s  - Save current settings",
            "",
            "🎵 Audio & Devices:",
            "  d  - Change audio devices",
            "  ␣  - Pause/Resume (space bar)",
            "",
            "🤖 AI & Processing:",
            "  a  - Toggle AI reasoning",
            "",
            "🌍 Language:",
            "  l  - Switch language (EN → PT → ES)",
            "",
            "💡 Tips:",
            "  • Press keys directly (no Enter needed)",
            "  • All shortcuts work during conversation",
            "  • Settings are automatically saved",
        ]
        return "\n".join(help_lines)

    def is_running(self) -> bool:
        """Check if keyboard handler is running."""
        return self._running

    def get_key_bindings(self) -> Dict[str, str]:
        """Get current key bindings as a dictionary."""
        return {key: action.value for key, action in self._key_bindings.items()}

    def add_custom_binding(self, key: str, action: KeyAction) -> bool:
        """Add a custom key binding."""
        try:
            self._key_bindings[key.lower()] = action
            observability.log_event(
                "custom_key_binding_added",
                key=key,
                action=action.value
            )
            return True
        except Exception as e:
            self.logger.error(f"Error adding custom binding: {e}")
            return False
