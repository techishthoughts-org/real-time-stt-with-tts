"""Structured logging with observability."""

import sys
from datetime import datetime
from typing import Any, Dict, Optional

import structlog
from loguru import logger
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter


class ObservabilityLogger:
    """Centralized observability logger with tracing."""

    def __init__(self, service_name: str = "realtime-stt"):
        self.service_name = service_name
        self._setup_tracing()
        self._setup_logging()

    def _setup_tracing(self):
        """Setup OpenTelemetry tracing."""
        trace.set_tracer_provider(TracerProvider())
        tracer = trace.get_tracer_provider()

        # Console exporter for development
        console_exporter = ConsoleSpanExporter()
        span_processor = BatchSpanProcessor(console_exporter)
        tracer.add_span_processor(span_processor)

        self.tracer = trace.get_tracer(self.service_name)

    def _setup_logging(self):
        """Setup structured logging."""
        # Remove default loguru handler
        logger.remove()

        # Add structured logging handler
        logger.add(
            sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
                   "<level>{level: <8}</level> | "
                   "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
                   "<level>{message}</level>",
            level="INFO",
            colorize=True,
            serialize=False,
        )

        # Configure structlog
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )

    def get_logger(self, name: str):
        """Get a structured logger."""
        return structlog.get_logger(name)

    def trace_span(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        """Create a tracing span."""
        span = self.tracer.start_span(name)
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, str(value))
        return span

    def log_event(self, event_type: str, **kwargs):
        """Log a structured event."""
        logger.info(f"EVENT: {event_type}", **kwargs)

    def log_metric(self, metric_name: str, value: float, **tags):
        """Log a metric with tags."""
        logger.info(f"METRIC: {metric_name}", value=value, **tags)

    def log_error(self, error: Exception, context: Optional[Dict[str, Any]] = None):
        """Log an error with context."""
        ctx = context or {}
        logger.error(f"ERROR: {str(error)}", error_type=type(error).__name__, **ctx)

    def get_current_timestamp(self) -> str:
        """Get current timestamp in RFC3339 format."""
        return datetime.now().isoformat() + "Z"


# Global observability instance
observability = ObservabilityLogger()

def get_current_timestamp() -> str:
    """Get current timestamp in RFC3339 format."""
    return datetime.now().isoformat() + "Z"
