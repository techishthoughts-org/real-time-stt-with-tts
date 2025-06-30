"""CLI entry point for RealtimeSTT application."""

import asyncio
import os
from typing import Optional

import typer
from rich.console import Console

from .adapters.primary.cli_interface import RealtimeSTTCLI
from .infrastructure.observability.logger import observability
from .main import create_app, create_services

app = typer.Typer(
    name="realtime-stt",
    help="🎤 Real-time Speech-to-Text with AI reasoning",
    rich_markup_mode="rich"
)
console = Console()


@app.command("cli")
async def run_cli(
    model: str = typer.Option(
        "tiny",
        "--model",
        "-m",
        help="Whisper model size: tiny, base, small, medium, large"
    ),
    device: str = typer.Option(
        "cpu",
        "--device",
        "-d",
        help="Device: cpu, cuda, auto"
    ),
    openai_key: Optional[str] = typer.Option(
        None,
        "--openai-key",
        "-k",
        help="OpenAI API key for AI reasoning (optional)"
    ),
    language: str = typer.Option(
        "en",
        "--language",
        "-l",
        help="Language code for speech recognition"
    )
):
    """🎤 Start real-time CLI interface."""

    console.print("🚀 [bold blue]Starting RealtimeSTT CLI...[/bold blue]")

    # Get OpenAI key from environment if not provided
    if not openai_key:
        openai_key = os.getenv("OPENAI_API_KEY")

    try:
        # Create services
        speech_service, ai_service = await create_services(
            model=model,
            device=device,
            openai_key=openai_key,
            language=language
        )

        # Create CLI interface
        cli_interface = RealtimeSTTCLI(speech_service, ai_service)

        # Start real-time session
        await cli_interface.start_realtime_session()

    except KeyboardInterrupt:
        console.print("\n[yellow]👋 Goodbye![/yellow]")
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")
        observability.log_error(e)


@app.command("server")
def run_server(
    model: str = typer.Option(
        "tiny",
        "--model",
        "-m",
        help="Whisper model size"
    ),
    device: str = typer.Option(
        "cpu",
        "--device",
        "-d",
        help="Device: cpu, cuda, auto"
    ),
    host: str = typer.Option(
        "0.0.0.0",
        "--host",
        "-h",
        help="Host address"
    ),
    port: int = typer.Option(
        8000,
        "--port",
        "-p",
        help="Port number"
    ),
    openai_key: Optional[str] = typer.Option(
        None,
        "--openai-key",
        "-k",
        help="OpenAI API key"
    )
):
    """🌐 Start FastAPI server."""

    console.print("🚀 [bold blue]Starting RealtimeSTT Server...[/bold blue]")

    import uvicorn

    from .main import create_app

    # Set environment variables
    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key

    # Create app
    fastapi_app = create_app(model=model, device=device)

    # Run server
    uvicorn.run(
        fastapi_app,
        host=host,
        port=port,
        log_level="info"
    )


@app.command("demo")
async def run_demo():
    """🎭 Run a demo with simulated speech input."""

    console.print("🎭 [bold green]Running RealtimeSTT Demo...[/bold green]")

    try:
        # Create services with default settings
        speech_service, ai_service = await create_services()

        # Create CLI interface
        cli_interface = RealtimeSTTCLI(speech_service, ai_service)

        # Start session
        from .application.dtos.speech_dtos import CreateSessionRequest
        session_response = await speech_service.create_session(CreateSessionRequest())
        cli_interface.session_id = session_response.session_id

        # Simulate some speech inputs
        demo_inputs = [
            "Hello, how are you today?",
            "What's the weather like?",
            "Can you help me with something?",
            "Thank you for your assistance."
        ]

        console.print("[dim]Simulating speech inputs...[/dim]")

        for text in demo_inputs:
            console.print(f"🎤 [blue]Simulating:[/blue] {text}")
            await cli_interface.simulate_speech_input(text)
            await asyncio.sleep(2)

        console.print("✅ [green]Demo completed![/green]")

    except Exception as e:
        console.print(f"[red]❌ Demo error: {e}[/red]")
        observability.log_error(e)


def main():
    """Main CLI entry point."""
    # Handle async commands
    async def run_async_command():
        if len(typer.main.get_params_from_ctx(typer.Context(app))) == 0:
            # No command specified, default to CLI
            await run_cli()
        else:
            app()

    # Check if we need to run an async command
    import sys
    if len(sys.argv) > 1 and sys.argv[1] in ["cli", "demo"]:
        asyncio.run(run_async_command())
    else:
        app()


if __name__ == "__main__":
    main()
