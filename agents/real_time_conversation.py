#!/usr/bin/env python3
"""Real-time conversation interface with live transcription and AI responses."""

import asyncio
import os
import sys
from datetime import datetime
from typing import List, Optional

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from rich.columns import Columns
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from realtime_stt.domain.services.ai_reasoning_service import AIReasoningService
from realtime_stt.infrastructure.audio.audio_device_manager import AudioDeviceManager
from realtime_stt.infrastructure.audio.config_manager import ConfigManager
from realtime_stt.infrastructure.audio.keyboard_handler import (
    KeyAction,
    KeyboardHandler,
)
from realtime_stt.infrastructure.speech.realtime_stt_repository import (
    RealtimeSTTSpeechRepository,
)
from realtime_stt.infrastructure.tts.text_to_speech_service import TextToSpeechService


class RealTimeConversation:
    """Real-time conversation interface with live updates."""

    def __init__(self,
                 input_device_index: Optional[int] = None,
                 output_device_index: Optional[int] = None,
                 openai_key: Optional[str] = None,
                 language: str = "auto"):
        """Initialize the real-time conversation interface."""
        self.console = Console()
        self.language = language

        # Configuration manager
        self.config_manager = ConfigManager()

        # Use provided devices or fall back to config
        if input_device_index is None:
            input_device_index = self.config_manager.get("audio.input_device_index")
        if output_device_index is None:
            output_device_index = self.config_manager.get("audio.output_device_index")

        # Use provided language or fall back to config
        if language == "auto":
            language = self.config_manager.get("stt.language", "en")

        # Save current settings to config
        if input_device_index is not None or output_device_index is not None:
            self.config_manager.set_audio_devices(
                input_index=input_device_index,
                output_index=output_device_index
            )

        # Save language setting
        self.config_manager.set("stt.language", language)

        # Services
        self.speech_repository = RealtimeSTTSpeechRepository(
            model="tiny",  # Fast for real-time
            device="cpu",
            language=language,
            input_device_index=input_device_index,
            output_device_index=output_device_index,
        )

        # Initialize AI reasoning service with local LLM support
        local_model_type = self.config_manager.get("ai.local_model_type", "auto")
        local_model_name = self.config_manager.get("ai.local_model_name", "llama3.1:8b")

        self.ai_service = AIReasoningService(
            api_key=openai_key,
            local_model_type=local_model_type,
            local_model_name=local_model_name
        )
        self.tts_service = TextToSpeechService(output_device_index=output_device_index, language=language)

        # Audio device manager for changing devices
        self.device_manager = AudioDeviceManager()

        # Keyboard handler
        self.keyboard_handler = KeyboardHandler()
        self._setup_keyboard_shortcuts()

        # Add simple keyboard detection for space bar
        self._setup_simple_keyboard_detection()

        # Conversation state
        self.conversation_history: List[dict] = []
        self.current_transcription = ""
        self.is_listening = False
        self.is_speaking = False
        self.is_paused = False
        self.show_help = False
        self.push_to_talk_active = False  # True when space is held down
        self.listening_for_input = True  # Always listening mode - changed from False

        # Language switching support
        self.available_languages = [
            {"code": "en", "name": "English"},
            {"code": "pt", "name": "Portuguese (BR)"},
            {"code": "es", "name": "Spanish"}
        ]

        # Find current language index based on initial language
        self.current_language_index = 0
        for i, lang_info in enumerate(self.available_languages):
            if lang_info["code"] == self.language:
                self.current_language_index = i
                break

        self.current_language = self.available_languages[self.current_language_index]["code"]
        self.stats = {
            "transcriptions": 0,
            "responses": 0,
            "start_time": datetime.now()
        }

        # Initialize conversation logging
        self.log_file = f"conversation_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        self._initialize_conversation_log()

    def _setup_keyboard_shortcuts(self):
        """Setup keyboard shortcut callbacks."""
        self.keyboard_handler.register_callback(KeyAction.QUIT, self._handle_quit)
        self.keyboard_handler.register_callback(KeyAction.HELP, self._handle_help)
        self.keyboard_handler.register_callback(KeyAction.CHANGE_DEVICES, self._handle_change_devices)
        self.keyboard_handler.register_callback(KeyAction.PAUSE_RESUME, self._handle_push_to_talk)
        self.keyboard_handler.register_callback(KeyAction.SHOW_CONFIG, self._handle_show_config)
        self.keyboard_handler.register_callback(KeyAction.SAVE_CONFIG, self._handle_save_config)

        # Add language switching callback
        self.keyboard_handler.register_callback('l', self._handle_language_switch)

    def _handle_quit(self):
        """Handle quit shortcut."""
        self.console.print("\n[yellow]Quitting conversation...[/yellow]")
        # Set a flag that the main loop can check
        self.is_listening = False

    def _handle_help(self):
        """Handle help shortcut."""
        self.show_help = not self.show_help

    def _handle_change_devices(self):
        """Handle change devices shortcut."""
        asyncio.create_task(self._change_devices_interactive())

    def _handle_push_to_talk(self):
        """Handle push-to-talk (space bar) - toggle listening state."""
        print(f"🔑 Legacy space handler called! Current listening state: {self.listening_for_input}")

        self.listening_for_input = not self.listening_for_input
        if self.listening_for_input:
            print("🎤 Push-to-talk ACTIVATED - Listening for your input...")
            self.console.print("[green]🎤 Listening - speak now![/green]")
        else:
            print("🔇 Push-to-talk DEACTIVATED - Stopped listening")
            self.console.print("[yellow]🔇 Stopped listening[/yellow]")

    def _handle_show_config(self):
        """Handle show config shortcut."""
        config_summary = self.config_manager.get_config_summary()
        self.console.print(f"\n{config_summary}")

    def _handle_save_config(self):
        """Handle save config shortcut."""
        if self.config_manager.save_config():
            self.console.print("[green]Configuration saved successfully![/green]")
        else:
            self.console.print("[red]Failed to save configuration[/red]")

    def _handle_language_switch(self):
        """Handle language switching shortcut."""
        # Cycle to next language
        self.current_language_index = (self.current_language_index + 1) % len(self.available_languages)
        new_lang = self.available_languages[self.current_language_index]

        self.current_language = new_lang["code"]

        # Update services with new language
        self.language = new_lang["code"]

        # Update STT service
        try:
            if hasattr(self.speech_repository, 'update_language'):
                self.speech_repository.update_language(new_lang["code"])
            elif hasattr(self.speech_repository, 'set_language'):
                self.speech_repository.set_language(new_lang["code"])
        except Exception as e:
            print(f"Warning: Could not update STT language: {e}")

        # Update TTS service
        try:
            if hasattr(self.tts_service, 'update_language'):
                self.tts_service.update_language(new_lang["code"])
            elif hasattr(self.tts_service, 'set_language'):
                self.tts_service.set_language(new_lang["code"])
        except Exception as e:
            print(f"Warning: Could not update TTS language: {e}")

        # Update configuration
        self.config_manager.set("stt.language", new_lang["code"])
        self.config_manager.set("tts.language", new_lang["code"])
        self.config_manager.save_config()

        # Log the language switch
        self._log_conversation(f"🌍 Language switched to: {new_lang['name']} ({new_lang['code']})")

        self.console.print(f"[yellow]🌍 Language switched to: {new_lang['name']} ({new_lang['code']})[/yellow]")

        # Respond in the new language
        if new_lang["code"] == "pt":
            response = "Mudei para português! Como posso ajudá-lo?"
        elif new_lang["code"] == "es":
            response = "¡Cambié a español! ¿Cómo puedo ayudarte?"
        else:
            response = "Switched to English! How can I help you?"

        # Schedule AI response
        try:
            loop = asyncio.get_running_loop()
            loop.call_soon_threadsafe(
                lambda: asyncio.create_task(self._speak_language_switch_response(response))
            )
        except Exception as e:
            print(f"Error scheduling language switch response: {e}")

    def _setup_simple_keyboard_detection(self):
        """Setup simple keyboard detection for space bar."""
        import sys
        import threading
        import time

        self.last_space_time = 0
        self.space_press_count = 0

        def keyboard_thread():
            """Simple keyboard detection thread with space press patterns."""
            print("🔑 Keyboard detection thread started - Press SPACE once or twice")

            while True:
                try:
                    key_pressed = None

                    if sys.platform != "win32":
                        import select
                        import termios
                        import tty

                        # Check if input is available without blocking
                        if select.select([sys.stdin], [], [], 0.1)[0]:
                            # Read single character
                            old_settings = termios.tcgetattr(sys.stdin)
                            try:
                                tty.setraw(sys.stdin.fileno())
                                key_pressed = sys.stdin.read(1)
                            finally:
                                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
                    else:
                        import msvcrt
                        if msvcrt.kbhit():
                            key_pressed = msvcrt.getch().decode('utf-8')

                    if key_pressed:
                        current_time = time.time()

                        if key_pressed == ' ':
                            print(f"🔑 SPACE detected! Time: {current_time}")

                            # Check if this is within double-press window (0.5 seconds)
                            if current_time - self.last_space_time < 0.5:
                                self.space_press_count += 1
                                print(f"🔑 Space press count: {self.space_press_count}")
                            else:
                                self.space_press_count = 1
                                print(f"🔑 New space sequence started")

                            self.last_space_time = current_time

                            # Wait a bit to see if another space comes
                            time.sleep(0.6)

                            # Process the space press pattern
                            if self.space_press_count == 1:
                                print("🔑 SINGLE SPACE - Toggle listening")
                                self._handle_single_space()
                            elif self.space_press_count >= 2:
                                print("🔑 DOUBLE SPACE - Force stop listening")
                                self._handle_double_space()

                            # Reset counter
                            self.space_press_count = 0

                        elif key_pressed == 'q':
                            print("🔑 Q detected - quitting")
                            self._handle_quit()
                        elif key_pressed == 'l':
                            print("🔑 L detected - language switch")
                            self._handle_language_switch()
                        else:
                            print(f"🔑 Key detected: '{key_pressed}' (ASCII: {ord(key_pressed)})")

                except Exception as e:
                    print(f"Keyboard detection error: {e}")

                time.sleep(0.05)  # Reduced sleep for better responsiveness

        # Start keyboard detection thread
        kbd_thread = threading.Thread(target=keyboard_thread, daemon=True)
        kbd_thread.start()
        print("🔑 Enhanced keyboard detection started - SPACE once=listen, SPACE twice=stop")

    def _initialize_conversation_log(self):
        """Initialize the conversation log file."""
        try:
            with open(self.log_file, 'w', encoding='utf-8') as f:
                f.write(f"=== RealtimeSTT Conversation Log ===\n")
                f.write(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Initial Language: {self.language}\n")
                f.write("=" * 50 + "\n\n")
            print(f"📝 Conversation log initialized: {self.log_file}")
        except Exception as e:
            print(f"Warning: Could not initialize conversation log: {e}")

    def _log_conversation(self, message: str, message_type: str = "system"):
        """Log a message to the conversation log file."""
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(f"[{timestamp}] [{message_type.upper()}] {message}\n")
        except Exception as e:
            print(f"Warning: Could not write to conversation log: {e}")

    async def start_conversation(self):
        """Start the real-time conversation."""
        try:
            self.console.print("[bold green]🎤 Starting Real-Time Conversation[/bold green]")

            # Show device information
            input_device, output_device = self.speech_repository.get_selected_devices()
            if input_device:
                self.console.print(f"🎤 Input: {input_device.name}")
            if output_device:
                self.console.print(f"🔊 Output: {output_device.name}")

            # Show configuration summary
            config_summary = self.config_manager.get_config_summary()
            self.console.print(f"\n{config_summary}")

            # Show keyboard shortcuts
            self.console.print(f"\n{self.keyboard_handler.get_help_text()}")

            self.console.print("\n[dim]Starting in 3 seconds... Speak naturally![/dim]")
            await asyncio.sleep(3)

            # Start keyboard handler
            self.keyboard_handler.start()

            # Start the live display and conversation loop
            await self._run_live_conversation()

        except KeyboardInterrupt:
            self.console.print("\n[yellow]Conversation ended by user[/yellow]")
        except Exception as e:
            self.console.print(f"[red]Error in conversation: {e}[/red]")
        finally:
            await self._cleanup()

    async def _run_live_conversation(self):
        """Run the live conversation with Rich Live display."""
        self.is_listening = True

        # Try Rich Live display first, fallback to simple mode
        try:
            await self._run_with_rich_display()
        except Exception as e:
            self.console.print(f"[yellow]Rich display failed: {e}[/yellow]")
            self.console.print("[yellow]Falling back to simple mode...[/yellow]")
            await self._run_with_simple_display()

    async def _run_with_rich_display(self):
        """Run with Rich Live display."""
        layout = self._create_layout()

        with Live(layout, refresh_per_second=8, screen=True) as live:
            # Start transcription in background
            transcription_task = asyncio.create_task(
                self._start_transcription_service()
            )

            # UI update loop
            try:
                self.console.print("[green]🎤 Live conversation started - speak naturally![/green]")

                while self.is_listening:
                    # Update the display
                    live.update(self._create_layout())

                    # Check if transcription task failed
                    if transcription_task.done():
                        if transcription_task.exception():
                            raise transcription_task.exception()
                        # If task completed without error, keep running
                        # (this shouldn't happen in normal operation)
                        self.console.print("[yellow]Transcription task completed unexpectedly[/yellow]")
                        break

                    # Small delay for smooth updates
                    await asyncio.sleep(0.125)

            finally:
                # Cancel transcription task
                if not transcription_task.done():
                    transcription_task.cancel()
                    try:
                        await transcription_task
                    except asyncio.CancelledError:
                        pass

    async def _run_with_simple_display(self):
        """Run with simple console output (fallback mode)."""
        self.console.print("[bold green]🎤 Simple Conversation Mode[/bold green]")
        self.console.print("Speak naturally - transcriptions will appear below:")
        self.console.print("Press 'q' and Enter to quit\n")

        # Start transcription in background
        transcription_task = asyncio.create_task(
            self._start_transcription_service()
        )

        try:
            # Simple status loop
            last_stats = {"transcriptions": 0, "responses": 0}

            while self.is_listening:
                # Show stats if they changed
                if (self.stats["transcriptions"] != last_stats["transcriptions"] or
                    self.stats["responses"] != last_stats["responses"]):

                    self.console.print(f"[dim]📊 Transcriptions: {self.stats['transcriptions']}, "
                                     f"AI Responses: {self.stats['responses']}[/dim]")
                    last_stats = self.stats.copy()

                # Check if transcription task failed
                if transcription_task.done():
                    if transcription_task.exception():
                        raise transcription_task.exception()
                    break

                # Wait a bit
                await asyncio.sleep(1)

        finally:
            # Cancel transcription task
            if not transcription_task.done():
                transcription_task.cancel()
                try:
                    await transcription_task
                except asyncio.CancelledError:
                    pass

    async def _start_transcription_service(self):
        """Start continuous transcription service."""
        try:
            # Start real-time transcription
            await self.speech_repository.start_real_time_transcription(
                self._on_transcription_update
            )
        except Exception as e:
            self.console.print(f"[red]Error in transcription service: {e}[/red]")
            raise

    def _on_transcription_update(self, text: str, is_final: bool):
        """Handle real-time transcription updates - always listening mode."""
        if not text.strip():
            return

        # Always listening mode - process all transcriptions
        # (removed the listening_for_input check)

        # Skip transcription if AI is currently speaking (prevent feedback loop)
        if self.is_speaking:
            print(f"🔇 Ignoring transcription while AI is speaking: '{text}'")
            return

        # Filter out very short transcriptions (likely noise)
        if is_final and len(text.strip()) < 3:
            print(f"🔇 Ignoring short transcription (likely noise): '{text}'")
            return

        text_lower = text.lower().strip()

        # Enhanced language switching detection
        language_switch_detected = False
        if is_final:
            # More comprehensive Portuguese switch commands
            portuguese_commands = [
                "switch to portuguese", "change to portuguese", "use portuguese",
                "switch for portuguese", "can you switch for portuguese",
                "portuguese please", "falar português", "mudar para português",
                "trocar para português", "poderia trocar", "pode trocar",
                "mude para português", "fale português", "português por favor"
            ]

            # More comprehensive Spanish switch commands
            spanish_commands = [
                "switch to spanish", "change to spanish", "use spanish",
                "switch for spanish", "can you switch for spanish",
                "spanish please", "hablar español", "cambiar a español",
                "cambia a español", "habla español", "español por favor"
            ]

            # More comprehensive English switch commands
            english_commands = [
                "switch to english", "change to english", "use english",
                "switch for english", "can you switch for english",
                "english please", "speak english", "change to english",
                "fale inglês", "inglês por favor", "habla inglés"
            ]

            # Check each command set
            for cmd in portuguese_commands:
                if cmd in text_lower:
                    print(f"🌍 Portuguese switch command detected: '{cmd}' in '{text}'")
                    self._switch_to_language("pt")
                    language_switch_detected = True
                    break

            if not language_switch_detected:
                for cmd in spanish_commands:
                    if cmd in text_lower:
                        print(f"🌍 Spanish switch command detected: '{cmd}' in '{text}'")
                        self._switch_to_language("es")
                        language_switch_detected = True
                        break

            if not language_switch_detected:
                for cmd in english_commands:
                    if cmd in text_lower:
                        print(f"🌍 English switch command detected: '{cmd}' in '{text}'")
                        self._switch_to_language("en")
                        language_switch_detected = True
                        break

        # If it was a language switch command, don't process it as a regular query
        if language_switch_detected:
            # In always listening mode, continue listening after language switch
            print("🌍 Language switched - continuing to listen")
            return

        # Debug output to see transcription activity
        status = "FINAL" if is_final else "PARTIAL"
        print(f"🎤 [{status}] Always listening - Processing: '{text}'")

        # Update current transcription for live display
        self.current_transcription = text

        if is_final:
            print(f"✅ Final transcription detected: '{text}' - Generating AI response...")

            # In always listening mode, continue listening
            print("🎤 Continuing to listen for more input")

            # Add to conversation history
            self.conversation_history.append({
                "type": "user",
                "text": text,
                "timestamp": datetime.now(),
                "is_final": True
            })

            # Log user input
            self._log_conversation(text, "user")

            self.stats["transcriptions"] += 1

            # Schedule AI response generation in the main event loop
            print(f"🚀 Scheduling AI response task for: '{text}'")
            try:
                # Try to get the running event loop
                try:
                    loop = asyncio.get_running_loop()
                    # Use call_soon_threadsafe to schedule from different thread
                    loop.call_soon_threadsafe(
                        lambda: asyncio.create_task(self._generate_ai_response(text))
                    )
                    print(f"✅ AI response task scheduled successfully")
                except RuntimeError:
                    # If no running loop, try to create task directly
                    print("⚠️ No running loop found, trying direct task creation...")
                    asyncio.create_task(self._generate_ai_response(text))
                    print(f"✅ AI response task created directly")
            except Exception as e:
                print(f"❌ Error scheduling AI response: {e}")
                # Fallback: run in thread
                import threading
                thread = threading.Thread(target=lambda: asyncio.run(self._generate_ai_response(text)))
                thread.start()
                print(f"✅ AI response running in separate thread")

            # Clear current transcription
            self.current_transcription = ""
        else:
            # For partial transcriptions, set a timer to auto-finalize if no final comes
            if hasattr(self, '_transcription_timer'):
                self._transcription_timer.cancel()

            # Auto-finalize after 2 seconds (reduced from 3)
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    self._transcription_timer = asyncio.create_task(
                        self._auto_finalize_transcription(text)
                    )
            except RuntimeError:
                pass  # No event loop available

    def _switch_to_language(self, language_code: str):
        """Switch to a specific language."""
        # Find the language in available languages
        for i, lang_info in enumerate(self.available_languages):
            if lang_info["code"] == language_code:
                self.current_language_index = i
                new_lang = lang_info

                self.current_language = new_lang["code"]
                self.language = new_lang["code"]

                # Update STT service
                try:
                    if hasattr(self.speech_repository, 'update_language'):
                        self.speech_repository.update_language(new_lang["code"])
                    elif hasattr(self.speech_repository, 'set_language'):
                        self.speech_repository.set_language(new_lang["code"])
                except Exception as e:
                    print(f"Warning: Could not update STT language: {e}")

                # Update TTS service
                try:
                    if hasattr(self.tts_service, 'update_language'):
                        self.tts_service.update_language(new_lang["code"])
                    elif hasattr(self.tts_service, 'set_language'):
                        self.tts_service.set_language(new_lang["code"])
                except Exception as e:
                    print(f"Warning: Could not update TTS language: {e}")

                # Update configuration
                self.config_manager.set("stt.language", new_lang["code"])
                self.config_manager.set("tts.language", new_lang["code"])
                self.config_manager.save_config()

                # Log the language switch
                self._log_conversation(f"🌍 Language switched to: {new_lang['name']} ({new_lang['code']})")

                print(f"🌍 Language switched to: {new_lang['name']} ({new_lang['code']})")

                # Respond in the new language
                if language_code == "pt":
                    response = "Mudei para português! Como posso ajudá-lo?"
                elif language_code == "es":
                    response = "¡Cambié a español! ¿Cómo puedo ayudarte?"
                else:
                    response = "Switched to English! How can I help you?"

                # Schedule AI response
                try:
                    loop = asyncio.get_running_loop()
                    loop.call_soon_threadsafe(
                        lambda: asyncio.create_task(self._speak_language_switch_response(response))
                    )
                except Exception as e:
                    print(f"Error scheduling language switch response: {e}")

                break

    async def _speak_language_switch_response(self, response: str):
        """Speak the language switch confirmation."""
        try:
            self.is_speaking = True
            print(f"🗣️ Speaking language switch confirmation: '{response}'")

            # Add to conversation history
            self.conversation_history.append({
                "type": "ai",
                "text": response,
                "timestamp": datetime.now(),
                "is_final": True
            })

            # Log AI response
            self._log_conversation(response, "ai")

            # Speak the response
            await self.tts_service.speak_text(response)

            # Add a longer pause after language switching to prevent immediate feedback
            print("⏸️ Pausing briefly after language switch...")
            await asyncio.sleep(3)  # 3 second pause
            print("👂 Ready to listen in new language")

        except Exception as e:
            print(f"Error in language switch response: {e}")
        finally:
            self.is_speaking = False

    async def _auto_finalize_transcription(self, text: str):
        """Auto-finalize transcription after a delay."""
        try:
            await asyncio.sleep(2)  # Wait 2 seconds

            # If we still have the same transcription, finalize it
            if self.current_transcription == text and text.strip():
                print(f"⏰ Auto-finalizing transcription: '{text}'")

                # Add to conversation history
                self.conversation_history.append({
                    "type": "user",
                    "text": text,
                    "timestamp": datetime.now(),
                    "is_final": True
                })

                self.stats["transcriptions"] += 1

                # Generate AI response (we're already in the main event loop here)
                print(f"🚀 Creating AI response task (auto-finalize) for: '{text}'")
                try:
                    asyncio.create_task(self._generate_ai_response(text))
                    print(f"✅ AI response task created (auto-finalize)")
                except Exception as e:
                    print(f"❌ Error creating AI task (auto-finalize): {e}")
                    # Fallback: run in thread
                    import threading
                    thread = threading.Thread(target=lambda: asyncio.run(self._generate_ai_response(text)))
                    thread.start()
                    print(f"✅ AI response running in thread (auto-finalize)")

                # Clear current transcription
                self.current_transcription = ""

        except asyncio.CancelledError:
            # Timer was cancelled, which is fine
            pass

    async def _generate_ai_response(self, user_text: str):
        """Generate and speak AI response."""
        print(f"🤖 Starting AI response generation for: '{user_text}'")
        self.is_speaking = True

        try:
            # Generate AI response
            print("🤖 Calling AI service...")
            ai_response = await self.ai_service.reason_and_respond(user_text)
            print(f"🤖 AI service returned: '{ai_response}'")

            if ai_response:
                print(f"✅ Got AI response: '{ai_response}' - Adding to history and speaking...")

                # Add to conversation history
                self.conversation_history.append({
                    "type": "ai",
                    "text": ai_response,
                    "timestamp": datetime.now(),
                    "is_final": True
                })

                # Log AI response
                self._log_conversation(ai_response, "ai")

                self.stats["responses"] += 1
                print(f"📊 Updated stats - Responses: {self.stats['responses']}")

                # Speak the response
                print("🔊 Starting TTS...")
                await self.tts_service.speak_text(ai_response)
                print("✅ TTS completed")

                # Add a pause after AI response to prevent immediate feedback
                print("⏸️ Pausing briefly after AI response...")
                await asyncio.sleep(2)  # 2 second pause
                print("👂 Ready to listen again")

            else:
                print("❌ AI service returned empty response")

        except Exception as e:
            print(f"❌ Error generating AI response: {e}")
            import traceback
            traceback.print_exc()
            self.console.print(f"[red]Error generating AI response: {e}[/red]")
        finally:
            self.is_speaking = False
            print("🤖 AI response generation completed")

    def _create_layout(self) -> Layout:
        """Create the layout for real-time display."""
        layout = Layout()

        # Split into sections
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="main"),
            Layout(name="footer", size=4)
        )

        # Split main section
        layout["main"].split_row(
            Layout(name="conversation", ratio=2),
            Layout(name="status", ratio=1)
        )

        # Update sections
        layout["header"].update(self._create_header())
        layout["conversation"].update(self._create_conversation_panel())
        layout["status"].update(self._create_status_panel())
        layout["footer"].update(self._create_footer())

        return layout

    def _create_header(self) -> Panel:
        """Create header panel."""
        return Panel(
            Text("🗣️ Real-Time Conversation Interface", style="bold green", justify="center"),
            title="RealtimeSTT + AI Assistant",
            border_style="green"
        )

    def _create_conversation_panel(self) -> Panel:
        """Create conversation history panel."""
        content = Text()

        # Show recent conversation history (last 10 messages)
        recent_history = self.conversation_history[-10:]

        for entry in recent_history:
            timestamp = entry["timestamp"].strftime("%H:%M:%S")

            if entry["type"] == "user":
                content.append(f"[{timestamp}] ", style="dim")
                content.append("You: ", style="bold blue")
                content.append(f"{entry['text']}\n\n", style="white")
            else:
                content.append(f"[{timestamp}] ", style="dim")
                content.append("AI: ", style="bold green")
                content.append(f"{entry['text']}\n\n", style="cyan")

        # Show current transcription if active
        if self.current_transcription:
            content.append("▶ ", style="yellow")
            content.append("You: ", style="bold blue")
            content.append(self.current_transcription, style="yellow")
            content.append(" █", style="blink yellow")  # Cursor

        return Panel(
            content,
            title="💬 Conversation",
            border_style="blue",
            height=None
        )

    def _create_status_panel(self) -> Panel:
        """Create the status panel."""

        # Determine listening status (always listening mode)
        listening_status = "[green]🎤 Always Listening[/green]"

        # Determine AI status
        if self.is_speaking:
            ai_status = "[blue]🔊 Speaking[/blue]"
        else:
            ai_status = "[dim]🔇 Silent[/dim]"

        # Current language info
        current_lang = self.available_languages[self.current_language_index]
        language_info = f"{current_lang['name']} ({current_lang['code'].upper()})"

        # Format runtime
        runtime = datetime.now() - self.stats["start_time"]
        runtime_str = str(runtime).split('.')[0]  # Remove microseconds

        status_content = f"""Status:         {listening_status}
AI:             {ai_status}
Language:       {language_info}

📊 Stats:
Transcriptions: {self.stats['transcriptions']}
AI Responses:   {self.stats['responses']}
Runtime:        {runtime_str}

TTS Method:     {self.tts_service.tts_method}"""

        return Panel(
            status_content,
            title="📊 Status",
            border_style="blue",
            width=45
        )

    def _create_footer(self) -> Panel:
        """Create footer panel."""
        if self.show_help:
            # Show detailed keyboard shortcuts when help is toggled
            return Panel(
                self.keyboard_handler.get_help_text(),
                title="⌨️ Keyboard Shortcuts",
                border_style="magenta"
            )
        else:
            # Show basic controls
            current_lang_info = self.available_languages[self.current_language_index]
            controls = [
                "[bold cyan]Controls:[/bold cyan]",
                f"• System is [bold green]always listening[/bold green] - just speak naturally",
                f"• Say [bold yellow]'switch to Portuguese'[/bold yellow] to change language",
                f"• Current: [green]{current_lang_info['name']} ({current_lang_info['code'].upper()})[/green]",
                "• Press [bold yellow]h[/bold yellow] for keyboard shortcuts",
                "• Press [bold blue]l[/bold blue] to switch language",
                "• Press [bold red]q[/bold red] to quit"
            ]

            return Panel(
                "\n".join(controls),
                title="💡 Instructions",
                border_style="cyan"
            )

    def _create_instructions_panel(self) -> Panel:
        """Create the instructions panel."""
        instructions_text = """Controls:
• System is always listening - just speak naturally
• 'q' - Quit application
• 'h' - Toggle this help
• 'd' - Change audio devices
• 'c' - Show current configuration
• 's' - Save current configuration
• 'l' - Switch language (English → Portuguese → Spanish)

Voice Commands (while listening):
• "Switch to Portuguese" / "Falar português" - Change to Portuguese
• "Switch to Spanish" / "Hablar español" - Change to Spanish
• "Switch to English" / "Fale inglês" - Change to English"""

        return Panel(
            instructions_text,
            title="💡 Instructions",
            border_style="green"
        )

    async def _change_devices_interactive(self):
        """Interactive device change functionality."""
        try:
            self.console.print("\n[bold blue]🎵 Audio Device Selection[/bold blue]")

            # Show current devices
            input_device, output_device = self.speech_repository.get_selected_devices()
            self.console.print(f"Current Input: {input_device.name if input_device else 'None'}")
            self.console.print(f"Current Output: {output_device.name if output_device else 'None'}")

            # Get available devices
            input_devices = self.device_manager.get_input_devices()
            output_devices = self.device_manager.get_output_devices()

            # Show available input devices
            self.console.print("\n[bold]Available Input Devices:[/bold]")
            for i, device in enumerate(input_devices):
                mark = "✓" if input_device and device.index == input_device.index else " "
                self.console.print(f"  {mark} [{device.index}] {device.name}")

            # Show available output devices
            self.console.print("\n[bold]Available Output Devices:[/bold]")
            for i, device in enumerate(output_devices):
                mark = "✓" if output_device and device.index == output_device.index else " "
                self.console.print(f"  {mark} [{device.index}] {device.name}")

            self.console.print("\n[dim]Use --input-device and --output-device to change devices at startup[/dim]")

        except Exception as e:
            self.console.print(f"[red]Error showing devices: {e}[/red]")

    async def _cleanup(self):
        """Clean up resources."""
        try:
            # Stop keyboard handler
            if hasattr(self.keyboard_handler, 'stop'):
                self.keyboard_handler.stop()

            # Stop speech services
            if hasattr(self.speech_repository, 'stop_real_time_transcription'):
                self.speech_repository.stop_real_time_transcription()
            if hasattr(self.speech_repository, 'cleanup'):
                self.speech_repository.cleanup()
            if hasattr(self.tts_service, 'cleanup'):
                self.tts_service.cleanup()
            if hasattr(self.device_manager, 'cleanup'):
                self.device_manager.cleanup()

            # Save final configuration
            self.config_manager.save_config()

            # Show final stats
            self.console.print("\n[bold green]📊 Final Statistics:[/bold green]")
            self.console.print(f"  • Transcriptions: {self.stats['transcriptions']}")
            self.console.print(f"  • AI Responses: {self.stats['responses']}")
            runtime = datetime.now() - self.stats["start_time"]
            self.console.print(f"  • Total Runtime: {str(runtime).split('.')[0]}")

        except Exception as e:
            self.console.print(f"[red]Error during cleanup: {e}[/red]")

    def _handle_single_space(self):
        """Handle single space press - toggle listening."""
        print(f"🔑 Single space! Current state: listening={self.listening_for_input}")

        self.listening_for_input = not self.listening_for_input
        if self.listening_for_input:
            print("🎤 SINGLE SPACE - Started listening...")
            self.console.print("[green]🎤 Listening - speak now![/green]")
        else:
            print("🔇 SINGLE SPACE - Stopped listening")
            self.console.print("[yellow]🔇 Stopped listening[/yellow]")

    def _handle_double_space(self):
        """Handle double space press - force stop listening."""
        print("🔇 DOUBLE SPACE - Force stop listening")
        self.listening_for_input = False
        self.console.print("[red]🔇 Force stopped listening[/red]")


async def main():
    """Main function."""
    import argparse

    parser = argparse.ArgumentParser(description="Real-Time Conversation Interface")
    parser.add_argument("--input-device", type=int, help="Input device index")
    parser.add_argument("--output-device", type=int, help="Output device index")
    parser.add_argument("--openai-key", type=str, help="OpenAI API key for enhanced AI")
    parser.add_argument("--language", "-l", type=str, default="auto",
                       help="Language for speech recognition (en, es, fr, de, it, pt, ru, ja, ko, zh, hi, ar, auto)")
    parser.add_argument("--list-devices", action="store_true", help="List audio devices and exit")
    parser.add_argument("--list-languages", action="store_true", help="List supported languages and exit")

    args = parser.parse_args()

    if args.list_devices:
        device_manager = AudioDeviceManager()
        device_manager.print_device_list()
        device_manager.cleanup()
        return

    if args.list_languages:
        print("🌍 Supported Languages:")
        print("=" * 50)
        languages = {
            "auto": "Auto-detect language",
            "en": "English",
            "es": "Spanish / Español",
            "fr": "French / Français",
            "de": "German / Deutsch",
            "it": "Italian / Italiano",
            "pt": "Portuguese / Português",
            "ru": "Russian / Русский",
            "ja": "Japanese / 日本語",
            "ko": "Korean / 한국어",
            "zh": "Chinese / 中文",
            "hi": "Hindi / हिन्दी",
            "ar": "Arabic / العربية",
            "nl": "Dutch / Nederlands",
            "sv": "Swedish / Svenska",
            "no": "Norwegian / Norsk",
            "da": "Danish / Dansk",
            "fi": "Finnish / Suomi",
            "pl": "Polish / Polski",
            "cs": "Czech / Čeština",
            "tr": "Turkish / Türkçe"
        }

        for code, name in languages.items():
            print(f"  {code:4} - {name}")

        print("\nUsage: --language en (or -l en)")
        print("Example: uv run python real_time_conversation.py -l es")
        return

    # Create and start conversation
    conversation = RealTimeConversation(
        input_device_index=args.input_device,
        output_device_index=args.output_device,
        openai_key=args.openai_key,
        language=args.language
    )

    await conversation.start_conversation()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
