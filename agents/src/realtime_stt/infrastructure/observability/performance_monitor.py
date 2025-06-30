"""
High-Resolution Performance Monitoring for Latency Optimization
Task 2.1.1: Audio Latency Measurement Framework

Provides precise measurement of audio processing latency with ±1ms accuracy.
"""

import json
import statistics
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Deque, Dict, List, Optional

# Import logger if available
try:
    from .logger import observability
except ImportError:
    # Mock observability for standalone testing
    class MockObservability:
        def get_logger(self, name):
            return None
        def log_event(self, event_name, **kwargs):
            pass
    observability = MockObservability()


class MeasurementPoint(Enum):
    """Measurement points in the audio processing pipeline."""
    AUDIO_CAPTURE_START = "audio_capture_start"
    AUDIO_CAPTURE_END = "audio_capture_end"
    VAD_START = "vad_start"
    VAD_END = "vad_end"
    STT_START = "stt_start"
    STT_END = "stt_end"
    AI_START = "ai_start"
    AI_END = "ai_end"
    TTS_START = "tts_start"
    TTS_END = "tts_end"
    PIPELINE_START = "pipeline_start"
    PIPELINE_END = "pipeline_end"
    BUFFER_WRITE = "buffer_write"
    BUFFER_READ = "buffer_read"
    NETWORK_SEND = "network_send"
    NETWORK_RECEIVE = "network_receive"


@dataclass
class LatencyMeasurement:
    """Single latency measurement with high-precision timing."""
    measurement_id: str
    start_point: MeasurementPoint
    end_point: MeasurementPoint
    start_time: float  # High-resolution timestamp
    end_time: float
    latency_ms: float
    session_id: Optional[str] = None
    metadata: Dict = field(default_factory=dict)

    @property
    def latency_seconds(self) -> float:
        """Get latency in seconds."""
        return self.latency_ms / 1000.0


@dataclass
class ComponentMetrics:
    """Metrics for a specific component."""
    component_name: str
    measurement_count: int = 0
    total_latency_ms: float = 0.0
    min_latency_ms: float = float('inf')
    max_latency_ms: float = 0.0
    recent_measurements: Deque[float] = field(
        default_factory=lambda: deque(maxlen=100)
    )

    @property
    def average_latency_ms(self) -> float:
        """Calculate average latency."""
        if self.measurement_count > 0:
            return self.total_latency_ms / self.measurement_count
        else:
            return 0.0

    @property
    def recent_average_ms(self) -> float:
        """Calculate average of recent measurements."""
        return statistics.mean(self.recent_measurements) if self.recent_measurements else 0.0

    @property
    def percentile_95_ms(self) -> float:
        """Calculate 95th percentile latency."""
        if not self.recent_measurements:
            return 0.0
        sorted_measurements = sorted(self.recent_measurements)
        index = int(0.95 * len(sorted_measurements))
        return sorted_measurements[min(index, len(sorted_measurements) - 1)]


class HighResolutionTimer:
    """High-resolution timer for precise latency measurement."""

    @staticmethod
    def get_timestamp() -> float:
        """Get high-resolution timestamp in seconds."""
        return time.perf_counter()

    @staticmethod
    def get_timestamp_ms() -> float:
        """Get high-resolution timestamp in milliseconds."""
        return time.perf_counter() * 1000.0

    @staticmethod
    def calculate_latency_ms(start_time: float, end_time: float) -> float:
        """Calculate latency between two timestamps in milliseconds."""
        return (end_time - start_time) * 1000.0


class PerformanceMonitor:
    """
    High-precision performance monitoring system for audio latency measurement.

    Features:
    - Sub-millisecond timing accuracy
    - Real-time latency tracking
    - Component-wise performance breakdown
    - Statistical analysis and trending
    - Dashboard-ready metrics
    """

    def __init__(self, buffer_size: int = 1000):
        self.buffer_size = buffer_size
        self.measurements: List[LatencyMeasurement] = []
        self.active_measurements: Dict[str, float] = {}  # measurement_id -> start_time
        self.component_metrics: Dict[str, ComponentMetrics] = {}
        self.session_metrics: Dict[str, Dict] = defaultdict(dict)

        # Real-time monitoring
        self.monitoring_active = False
        self.monitoring_thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()

        # Performance targets (from Phase 2 plan)
        self.targets = {
            "audio_processing": 50.0,  # ms
            "vad_detection": 10.0,     # ms
            "stt_processing": 100.0,   # ms
            "ai_response": 150.0,      # ms
            "tts_generation": 2000.0,  # ms
            "end_to_end": 200.0        # ms
        }

        # For now, create a simple logger since we might not have the full observability system
        self.logger = None
        try:
            from .logger import observability
            self.logger = observability.get_logger("performance_monitor")
            observability.log_event("performance_monitor_initialized",
                                   buffer_size=buffer_size)
        except ImportError:
            print(f"Performance monitor initialized with buffer size {buffer_size}")

    def start_measurement(self, measurement_id: str,
                         start_point: MeasurementPoint,
                         session_id: Optional[str] = None,
                         metadata: Optional[Dict] = None) -> str:
        """
        Start a new latency measurement.

        Args:
            measurement_id: Unique identifier for this measurement
            start_point: Starting point in the pipeline
            session_id: Optional session ID for tracking
            metadata: Additional metadata for the measurement

        Returns:
            measurement_id for tracking
        """
        timestamp = HighResolutionTimer.get_timestamp()

        with self.lock:
            self.active_measurements[measurement_id] = timestamp

        if self.logger:
            self.logger.debug(f"Started measurement {measurement_id} at {start_point.value}")

        # Log event for observability
        observability.log_event("measurement_started",
                               measurement_id=measurement_id,
                               start_point=start_point.value,
                               session_id=session_id,
                               metadata=metadata or {})

        return measurement_id

    def end_measurement(self, measurement_id: str,
                       end_point: MeasurementPoint,
                       session_id: Optional[str] = None,
                       metadata: Optional[Dict] = None) -> Optional[LatencyMeasurement]:
        """
        End a latency measurement and calculate the latency.

        Args:
            measurement_id: Measurement ID from start_measurement
            end_point: Ending point in the pipeline
            session_id: Optional session ID
            metadata: Additional metadata

        Returns:
            LatencyMeasurement object with calculated latency
        """
        end_timestamp = HighResolutionTimer.get_timestamp()

        with self.lock:
            start_timestamp = self.active_measurements.pop(measurement_id, None)

        if start_timestamp is None:
            if self.logger:
                self.logger.warning(f"No start measurement found for {measurement_id}")
            return None

        # Calculate latency
        latency_ms = HighResolutionTimer.calculate_latency_ms(start_timestamp, end_timestamp)

        # Create measurement record
        measurement = LatencyMeasurement(
            measurement_id=measurement_id,
            start_point=self._infer_start_point(measurement_id),
            end_point=end_point,
            start_time=start_timestamp,
            end_time=end_timestamp,
            latency_ms=latency_ms,
            session_id=session_id,
            metadata=metadata or {}
        )

        # Store measurement
        with self.lock:
            self.measurements.append(measurement)

            # Maintain buffer size
            if len(self.measurements) > self.buffer_size:
                self.measurements.pop(0)

            # Update component metrics
            self._update_component_metrics(measurement)

        if self.logger:
            self.logger.debug(f"Completed measurement {measurement_id}: {latency_ms:.2f}ms")

        # Log event for observability
        observability.log_event("measurement_completed",
                               measurement_id=measurement_id,
                               latency_ms=latency_ms,
                               end_point=end_point.value,
                               session_id=session_id)

        return measurement

    def measure_async(self, measurement_id: str,
                     start_point: MeasurementPoint,
                     end_point: MeasurementPoint,
                     session_id: Optional[str] = None):
        """
        Context manager for measuring async operations.

        Usage:
            async with monitor.measure_async("audio_capture",
                                           MeasurementPoint.AUDIO_CAPTURE_START,
                                           MeasurementPoint.AUDIO_CAPTURE_END):
                # Audio capture code here
                pass
        """
        return AsyncMeasurementContext(self, measurement_id, start_point,
                                     end_point, session_id)

    def measure_sync(self, measurement_id: str,
                    start_point: MeasurementPoint,
                    end_point: MeasurementPoint,
                    session_id: Optional[str] = None):
        """
        Context manager for measuring synchronous operations.

        Usage:
            with monitor.measure_sync("vad_detection",
                                    MeasurementPoint.VAD_START,
                                    MeasurementPoint.VAD_END):
                # VAD code here
                pass
        """
        return SyncMeasurementContext(self, measurement_id, start_point,
                                    end_point, session_id)

    def get_component_metrics(self, component_name: str) -> Optional[ComponentMetrics]:
        """Get metrics for a specific component."""
        with self.lock:
            return self.component_metrics.get(component_name)

    def get_all_metrics(self) -> Dict[str, ComponentMetrics]:
        """Get metrics for all components."""
        with self.lock:
            return self.component_metrics.copy()

    def get_recent_measurements(self, count: int = 10) -> List[LatencyMeasurement]:
        """Get the most recent measurements."""
        with self.lock:
            return self.measurements[-count:] if self.measurements else []

    def get_pipeline_latency(self, session_id: Optional[str] = None) -> Optional[float]:
        """
        Calculate end-to-end pipeline latency for a session.

        Args:
            session_id: Session to calculate latency for

        Returns:
            Total pipeline latency in milliseconds
        """
        if not session_id:
            # Return most recent end-to-end measurement
            recent_measurements = self.get_recent_measurements(50)
            pipeline_measurements = [
                m for m in recent_measurements
                if m.start_point == MeasurementPoint.PIPELINE_START
                and m.end_point == MeasurementPoint.PIPELINE_END
            ]
            return pipeline_measurements[-1].latency_ms if pipeline_measurements else None

        # Calculate for specific session
        session_measurements = [
            m for m in self.measurements
            if m.session_id == session_id
        ]

        if not session_measurements:
            return None

        # Find pipeline start and end
        start_time = None
        end_time = None

        for measurement in session_measurements:
            if measurement.start_point == MeasurementPoint.PIPELINE_START:
                start_time = measurement.start_time
            if measurement.end_point == MeasurementPoint.PIPELINE_END:
                end_time = measurement.end_time

        if start_time and end_time:
            return HighResolutionTimer.calculate_latency_ms(start_time, end_time)

        return None

    def get_performance_dashboard(self) -> Dict:
        """
        Generate dashboard-ready performance metrics.

        Returns:
            Dictionary with current performance status
        """
        with self.lock:
            dashboard = {
                "timestamp": datetime.now().isoformat(),
                "targets": self.targets,
                "components": {},
                "overall_status": "UNKNOWN",
                "alerts": []
            }

            # Component metrics
            for component_name, metrics in self.component_metrics.items():
                component_data = {
                    "average_latency_ms": metrics.average_latency_ms,
                    "recent_average_ms": metrics.recent_average_ms,
                    "min_latency_ms": metrics.min_latency_ms,
                    "max_latency_ms": metrics.max_latency_ms,
                    "percentile_95_ms": metrics.percentile_95_ms,
                    "measurement_count": metrics.measurement_count,
                    "status": "UNKNOWN"
                }

                # Determine status based on targets
                target = self.targets.get(component_name.lower().replace("_", ""))
                if target:
                    current_latency = metrics.recent_average_ms
                    if current_latency <= target:
                        component_data["status"] = "✅ WITHIN_TARGET"
                    elif current_latency <= target * 1.2:  # 20% tolerance
                        component_data["status"] = "⚠️ NEAR_TARGET"
                        dashboard["alerts"].append(f"{component_name} approaching target limit")
                    else:
                        component_data["status"] = "❌ EXCEEDS_TARGET"
                        dashboard["alerts"].append(f"{component_name} exceeds target ({current_latency:.1f}ms > {target}ms)")

                dashboard["components"][component_name] = component_data

            # Overall status
            exceeds_target = any(
                "❌" in comp["status"]
                for comp in dashboard["components"].values()
            )
            near_target = any(
                "⚠️" in comp["status"]
                for comp in dashboard["components"].values()
            )

            if exceeds_target:
                dashboard["overall_status"] = "❌ NEEDS_OPTIMIZATION"
            elif near_target:
                dashboard["overall_status"] = "⚠️ MONITORING_REQUIRED"
            else:
                dashboard["overall_status"] = "✅ PERFORMANCE_OPTIMAL"

            return dashboard

    def start_realtime_monitoring(self, interval_seconds: float = 1.0):
        """Start real-time performance monitoring."""
        if self.monitoring_active:
            return

        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(interval_seconds,),
            daemon=True
        )
        self.monitoring_thread.start()

        self.logger.info("Real-time performance monitoring started")

    def stop_realtime_monitoring(self):
        """Stop real-time performance monitoring."""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=2.0)

        self.logger.info("Real-time performance monitoring stopped")

    def export_metrics(self, format: str = "json") -> str:
        """
        Export performance metrics for analysis.

        Args:
            format: Export format ("json", "csv")

        Returns:
            Formatted metrics data
        """
        if format == "json":
            return json.dumps(self.get_performance_dashboard(), indent=2)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def _infer_start_point(self, measurement_id: str) -> MeasurementPoint:
        """Infer start point from measurement ID."""
        # This is a simple heuristic - could be made more sophisticated
        if "audio" in measurement_id.lower():
            return MeasurementPoint.AUDIO_CAPTURE_START
        elif "vad" in measurement_id.lower():
            return MeasurementPoint.VAD_START
        elif "stt" in measurement_id.lower():
            return MeasurementPoint.STT_START
        elif "ai" in measurement_id.lower():
            return MeasurementPoint.AI_START
        elif "tts" in measurement_id.lower():
            return MeasurementPoint.TTS_START
        else:
            return MeasurementPoint.PIPELINE_START

    def _update_component_metrics(self, measurement: LatencyMeasurement):
        """Update component metrics with new measurement."""
        # Determine component name from measurement points
        component_name = self._get_component_name(measurement.start_point, measurement.end_point)

        if component_name not in self.component_metrics:
            self.component_metrics[component_name] = ComponentMetrics(component_name)

        metrics = self.component_metrics[component_name]
        metrics.measurement_count += 1
        metrics.total_latency_ms += measurement.latency_ms
        metrics.min_latency_ms = min(metrics.min_latency_ms, measurement.latency_ms)
        metrics.max_latency_ms = max(metrics.max_latency_ms, measurement.latency_ms)
        metrics.recent_measurements.append(measurement.latency_ms)

    def _get_component_name(self, start_point: MeasurementPoint,
                          end_point: MeasurementPoint) -> str:
        """Get component name from measurement points."""
        point_to_component = {
            (MeasurementPoint.AUDIO_CAPTURE_START, MeasurementPoint.AUDIO_CAPTURE_END): "audio_processing",
            (MeasurementPoint.VAD_START, MeasurementPoint.VAD_END): "vad_detection",
            (MeasurementPoint.STT_START, MeasurementPoint.STT_END): "stt_processing",
            (MeasurementPoint.AI_START, MeasurementPoint.AI_END): "ai_response",
            (MeasurementPoint.TTS_START, MeasurementPoint.TTS_END): "tts_generation",
            (MeasurementPoint.PIPELINE_START, MeasurementPoint.PIPELINE_END): "end_to_end"
        }

        return point_to_component.get((start_point, end_point), f"{start_point.value}_to_{end_point.value}")

    def _monitoring_loop(self, interval_seconds: float):
        """Real-time monitoring loop."""
        while self.monitoring_active:
            try:
                dashboard = self.get_performance_dashboard()

                # Log performance status
                observability.log_event("performance_status",
                                       overall_status=dashboard["overall_status"],
                                       alerts=dashboard["alerts"])

                # Alert on performance issues
                if dashboard["alerts"]:
                    for alert in dashboard["alerts"]:
                        self.logger.warning(f"Performance Alert: {alert}")

                time.sleep(interval_seconds)

            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval_seconds)


class AsyncMeasurementContext:
    """Async context manager for latency measurement."""

    def __init__(self, monitor: PerformanceMonitor, measurement_id: str,
                 start_point: MeasurementPoint, end_point: MeasurementPoint,
                 session_id: Optional[str] = None):
        self.monitor = monitor
        self.measurement_id = measurement_id
        self.start_point = start_point
        self.end_point = end_point
        self.session_id = session_id

    async def __aenter__(self):
        self.monitor.start_measurement(self.measurement_id, self.start_point, self.session_id)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.monitor.end_measurement(self.measurement_id, self.end_point, self.session_id)


class SyncMeasurementContext:
    """Sync context manager for latency measurement."""

    def __init__(self, monitor: PerformanceMonitor, measurement_id: str,
                 start_point: MeasurementPoint, end_point: MeasurementPoint,
                 session_id: Optional[str] = None):
        self.monitor = monitor
        self.measurement_id = measurement_id
        self.start_point = start_point
        self.end_point = end_point
        self.session_id = session_id

    def __enter__(self):
        self.monitor.start_measurement(self.measurement_id, self.start_point, self.session_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.monitor.end_measurement(self.measurement_id, self.end_point, self.session_id)


# Global performance monitor instance
performance_monitor = PerformanceMonitor()
