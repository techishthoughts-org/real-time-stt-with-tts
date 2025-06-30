"""Rich CLI interface for real-time speech processing."""

import asyncio
import signal
import sys
from typing import Optional

import typer
from rich.columns import Columns
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.text import Text

from ...application.use_cases.speech_use_cases import SpeechUseCases
from ...domain.services.ai_reasoning_service import AIReasoningService
from ...infrastructure.observability.logger import observability


class RealtimeSTTCLI:
    """Rich CLI interface for real-time speech-to-text."""

    def __init__(
        self,
        speech_use_cases: SpeechUseCases,
        ai_service: AIReasoningService
    ):
        self.speech_use_cases = speech_use_cases
        self.ai_service = ai_service
        self.console = Console()
        self.logger = observability.get_logger("cli")

        # State
        self.session_id: Optional[str] = None
        self.is_running = False
        self.transcriptions = []
        self.ai_responses = []

    async def start_realtime_session(self):
        """Start a real-time speech processing session."""

        self.console.print(Panel.fit(
            "[bold blue]🎤 RealtimeSTT - Interactive CLI[/bold blue]\n"
            "[dim]Starting real-time speech-to-text with AI reasoning...[/dim]",
            border_style="blue"
        ))

        # Create session
        from ...application.dtos.speech_dtos import CreateSessionRequest
        session_response = await self.speech_use_cases.create_session(
            CreateSessionRequest()
        )
        self.session_id = session_response.session_id

        observability.log_event("cli_session_started", session_id=self.session_id)

        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        self.is_running = True

        # Create layout
        layout = Layout()
        layout.split_row(
            Layout(name="main", ratio=2),
            Layout(name="sidebar", ratio=1)
        )

        layout["main"].split_column(
            Layout(name="transcription", ratio=1),
            Layout(name="ai_response", ratio=1),
            Layout(name="logs", ratio=1)
        )

        with Live(layout, refresh_per_second=4, screen=True) as live:
            try:
                await self._run_realtime_loop(layout)
            except KeyboardInterrupt:
                await self._cleanup()

    async def _run_realtime_loop(self, layout):
        """Main real-time processing loop."""

        while self.is_running:
            try:
                # Simulate audio input (in real implementation, this would be actual audio)
                # For demo purposes, we'll simulate with user input
                layout["transcription"].update(
                    Panel(
                        self._create_transcription_display(),
                        title="🎤 Live Transcription",
                        border_style="green"
                    )
                )

                layout["ai_response"].update(
                    Panel(
                        self._create_ai_response_display(),
                        title="🤖 AI Response",
                        border_style="cyan"
                    )
                )

                layout["logs"].update(
                    Panel(
                        self._create_logs_display(),
                        title="📊 System Logs",
                        border_style="yellow"
                    )
                )

                layout["sidebar"].update(
                    Panel(
                        self._create_stats_display(),
                        title="📈 Session Stats",
                        border_style="magenta"
                    )
                )

                await asyncio.sleep(0.5)  # Refresh rate

            except Exception as e:
                observability.log_error(e)
                await asyncio.sleep(1)

    def _create_transcription_display(self) -> Text:
        """Create transcription display."""
        text = Text()

        if not self.transcriptions:
            text.append("🔊 Listening for speech...\n", style="dim")
            text.append("💡 Tip: Speak clearly into your microphone", style="dim italic")
        else:
            for i, trans in enumerate(self.transcriptions[-5:]):  # Show last 5
                text.append(f"[{i+1}] ", style="dim")
                text.append(f"{trans['text']}\n", style="white")
                text.append(f"    Confidence: {trans['confidence']:.2f} | ", style="dim")
                text.append(f"Time: {trans['timestamp']}\n\n", style="dim")

        return text

    def _create_ai_response_display(self) -> Text:
        """Create AI response display."""
        text = Text()

        if not self.ai_responses:
            text.append("🤖 AI is ready to respond...\n", style="dim")
            text.append("Waiting for speech input", style="dim italic")
        else:
            for response in self.ai_responses[-3:]:  # Show last 3
                text.append("🤖 AI: ", style="bold cyan")
                text.append(f"{response['text']}\n\n", style="cyan")
                text.append(f"    Processing time: {response['processing_time']}ms\n", style="dim")

        return text

    def _create_logs_display(self) -> Text:
        """Create system logs display."""
        text = Text()
        text.append("📝 Recent Events:\n", style="bold")

        # Mock recent logs (in real implementation, get from observability)
        logs = [
            "✅ Session initialized",
            "🎤 Audio input detected",
            "🔄 Processing speech...",
            "✨ Transcription completed",
            "🤖 AI reasoning started",
            "💬 Response generated"
        ]

        for log in logs[-6:]:
            text.append(f"• {log}\n", style="dim")

        return text

    def _create_stats_display(self) -> Table:
        """Create session statistics display."""
        table = Table(show_header=False, box=None)
        table.add_column("Metric", style="bold")
        table.add_column("Value", style="cyan")

        table.add_row("Session ID", str(self.session_id)[:8] + "..." if self.session_id else "N/A")
        table.add_row("Transcriptions", str(len(self.transcriptions)))
        table.add_row("AI Responses", str(len(self.ai_responses)))
        table.add_row("Status", "🟢 Active" if self.is_running else "🔴 Stopped")

        # Get conversation stats
        conv_stats = self.ai_service.get_conversation_summary()
        table.add_row("Exchanges", str(conv_stats["total_exchanges"]))

        return table

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        self.console.print("\n[yellow]🛑 Shutting down gracefully...[/yellow]")
        self.is_running = False

    async def _cleanup(self):
        """Cleanup resources."""
        if self.session_id:
            from ...application.dtos.speech_dtos import FinishSessionRequest
            await self.speech_use_cases.finish_session(
                FinishSessionRequest(session_id=self.session_id)
            )

        observability.log_event("cli_session_ended", session_id=self.session_id)
        self.console.print("[green]✅ Session ended successfully![/green]")

    async def simulate_speech_input(self, text: str):
        """Simulate speech input for testing."""
        from ...application.dtos.speech_dtos import AudioChunkRequest

        # Simulate audio data (in real implementation, this would be actual audio)
        audio_data = text.encode('utf-8')  # Mock audio data

        request = AudioChunkRequest(
            session_id=self.session_id,
            audio_data=audio_data,
            sample_rate=16000,
            channels=1
        )

        # Process audio
        transcription = await self.speech_use_cases.process_audio_chunk(request)

        if transcription:
            self.transcriptions.append({
                'text': transcription.text,
                'confidence': transcription.confidence,
                'timestamp': transcription.timestamp.strftime("%H:%M:%S")
            })

            # Get AI response
            ai_response = await self.ai_service.reason_and_respond(transcription.text)

            self.ai_responses.append({
                'text': ai_response,
                'processing_time': transcription.processing_time_ms
            })
