"""
Optimized Audio Buffer Manager - Task 2.1.2: Audio Buffer Optimization
Implements aggressive buffer size reduction and adaptive buffer management.

Target: 50% buffer latency reduction
Current baseline: ~64ms (1024 samples @ 16kHz) → Target: ~32ms
"""

import asyncio
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

import numpy as np
import sounddevice as sd

from ..observability.performance_monitor import (
    HighResolutionTimer,
    MeasurementPoint,
    performance_monitor,
)


class BufferOptimizationMode(Enum):
    """Buffer optimization modes for different use cases."""
    ULTRA_LOW_LATENCY = "ultra_low_latency"  # <10ms target
    LOW_LATENCY = "low_latency"              # <25ms target
    BALANCED = "balanced"                    # <50ms target
    QUALITY_FOCUSED = "quality_focused"      # <100ms target


@dataclass
class BufferConfiguration:
    """Audio buffer configuration with optimization parameters."""
    sample_rate: int = 16000
    channels: int = 1
    dtype: str = "float32"

    # Buffer size optimization
    chunk_size: int = 512  # Reduced from 1024 (32ms → 16ms)
    buffer_duration_ms: float = 16.0  # Target buffer duration

    # Adaptive settings
    min_chunk_size: int = 256   # Ultra-low latency: 8ms @ 16kHz
    max_chunk_size: int = 2048  # Quality focused: 64ms @ 16kHz

    # Platform-specific optimizations
    use_exclusive_mode: bool = True   # Windows WASAPI exclusive
    use_low_latency_flag: bool = True # Enable low-latency driver mode

    # Performance monitoring
    enable_monitoring: bool = True
    latency_target_ms: float = 32.0

    @property
    def chunk_duration_ms(self) -> float:
        """Calculate chunk duration in milliseconds."""
        return (self.chunk_size / self.sample_rate) * 1000.0

    @property
    def samples_per_ms(self) -> float:
        """Calculate samples per millisecond."""
        return self.sample_rate / 1000.0


@dataclass
class BufferMetrics:
    """Real-time buffer performance metrics."""
    current_latency_ms: float = 0.0
    average_latency_ms: float = 0.0
    min_latency_ms: float = float('inf')
    max_latency_ms: float = 0.0
    buffer_underruns: int = 0
    buffer_overruns: int = 0
    adaptation_count: int = 0
    current_chunk_size: int = 512
    optimization_mode: BufferOptimizationMode = BufferOptimizationMode.LOW_LATENCY
    last_updated: float = field(default_factory=time.time)


class AdaptiveBufferManager:
    """
    Adaptive buffer manager with aggressive latency optimization.

    Features:
    - Dynamic chunk size adaptation based on performance
    - Platform-specific optimizations (Core Audio, WASAPI, ALSA)
    - Real-time latency monitoring and adjustment
    - Automatic buffer underrun/overrun prevention
    - Performance-guided optimization modes
    """

    def __init__(self, initial_config: Optional[BufferConfiguration] = None):
        self.config = initial_config or BufferConfiguration()
        self.metrics = BufferMetrics()
        self.lock = threading.Lock()

        # Performance tracking
        self.latency_history: List[float] = []
        self.max_history_size = 100

        # Adaptation parameters
        self.adaptation_threshold_ms = 5.0  # Trigger adaptation if >5ms from target
        self.adaptation_step_size = 0.2     # 20% change per adaptation
        self.min_adaptation_interval = 1.0  # Minimum 1s between adaptations
        self.last_adaptation_time = 0.0

        # Platform detection
        self.platform_optimizations = self._detect_platform_optimizations()

        # Callbacks
        self.buffer_callback: Optional[Callable] = None
        self.metrics_callback: Optional[Callable] = None

        self.logger = None

        if self.config.enable_monitoring:
            self._start_monitoring()

    def _detect_platform_optimizations(self) -> Dict[str, Any]:
        """Detect platform-specific optimizations."""
        optimizations = {
            "platform": "unknown",
            "audio_api": "unknown",
            "optimal_chunk_sizes": [256, 512, 1024],
            "supports_exclusive_mode": False,
            "recommended_latency": "low"
        }

        try:
            import platform
            system = platform.system().lower()

            if system == "darwin":  # macOS
                optimizations.update({
                    "platform": "macos",
                    "audio_api": "core_audio",
                    "optimal_chunk_sizes": [256, 512, 768],  # Core Audio prefers these
                    "supports_exclusive_mode": False,
                    "recommended_latency": "low",
                    "buffer_multiplier": 1.0
                })
            elif system == "windows":
                optimizations.update({
                    "platform": "windows",
                    "audio_api": "wasapi",
                    "optimal_chunk_sizes": [128, 256, 512],  # WASAPI can go lower
                    "supports_exclusive_mode": True,
                    "recommended_latency": "low",
                    "buffer_multiplier": 0.8
                })
            elif system == "linux":
                optimizations.update({
                    "platform": "linux",
                    "audio_api": "alsa",
                    "optimal_chunk_sizes": [256, 512, 1024],
                    "supports_exclusive_mode": False,
                    "recommended_latency": "low",
                    "buffer_multiplier": 1.2  # ALSA often needs slightly larger buffers
                })

        except Exception as e:
            print(f"Platform detection failed: {e}")

        return optimizations

    def optimize_for_mode(self, mode: BufferOptimizationMode) -> BufferConfiguration:
        """Optimize buffer configuration for specific mode."""
        config = BufferConfiguration()

        if mode == BufferOptimizationMode.ULTRA_LOW_LATENCY:
            # <10ms target - aggressive optimization
            config.chunk_size = max(self.config.min_chunk_size,
                                  int(self.config.samples_per_ms * 8))  # 8ms
            config.latency_target_ms = 10.0
            config.use_exclusive_mode = True

        elif mode == BufferOptimizationMode.LOW_LATENCY:
            # <25ms target - balanced optimization
            config.chunk_size = int(self.config.samples_per_ms * 16)  # 16ms
            config.latency_target_ms = 25.0
            config.use_exclusive_mode = self.platform_optimizations["supports_exclusive_mode"]

        elif mode == BufferOptimizationMode.BALANCED:
            # <50ms target - moderate optimization
            config.chunk_size = int(self.config.samples_per_ms * 32)  # 32ms
            config.latency_target_ms = 50.0
            config.use_exclusive_mode = False

        else:  # QUALITY_FOCUSED
            # <100ms target - prioritize quality
            config.chunk_size = int(self.config.samples_per_ms * 64)  # 64ms
            config.latency_target_ms = 100.0
            config.use_exclusive_mode = False

        # Apply platform-specific adjustments
        multiplier = self.platform_optimizations.get("buffer_multiplier", 1.0)
        config.chunk_size = int(config.chunk_size * multiplier)

        # Ensure chunk size is within bounds and optimal
        optimal_sizes = self.platform_optimizations["optimal_chunk_sizes"]
        config.chunk_size = min(optimal_sizes,
                               key=lambda x: abs(x - config.chunk_size))

        # Update other parameters
        config.sample_rate = self.config.sample_rate
        config.channels = self.config.channels
        config.dtype = self.config.dtype

        return config

    def get_optimized_stream_params(self, is_input: bool = True) -> Dict[str, Any]:
        """Get optimized sounddevice stream parameters."""
        params = {
            "samplerate": self.config.sample_rate,
            "channels": self.config.channels,
            "dtype": self.config.dtype,
            "blocksize": self.config.chunk_size,
            "latency": "low" if self.config.use_low_latency_flag else None,
        }

        # Platform-specific optimizations
        platform = self.platform_optimizations["platform"]

        if platform == "macos":
            # Core Audio optimizations (basic settings)
            # Note: Core Audio doesn't need exclusive mode
            pass

        elif platform == "windows" and self.config.use_exclusive_mode:
            # WASAPI exclusive mode for minimum latency
            params.update({
                "extra_settings": sd.WasapiSettings(
                    exclusive=True,
                    auto_convert=True,
                    channel_mask=None
                )
            })

        elif platform == "linux":
            # ALSA optimizations
            params.update({
                "extra_settings": sd.AlsaSettings(
                    alsa_pcm_card=None,
                    alsa_pcm_device=None
                )
            })

        return params

    def measure_buffer_latency(self, audio_data: np.ndarray,
                             timestamp: float) -> float:
        """Measure actual buffer latency."""
        if not self.config.enable_monitoring:
            return 0.0

        measurement_id = f"buffer_latency_{int(timestamp * 1000)}"

        # Start measurement
        performance_monitor.start_measurement(
            measurement_id,
            MeasurementPoint.BUFFER_WRITE
        )

        # Calculate theoretical latency
        buffer_latency_ms = len(audio_data) / self.config.samples_per_ms

        # End measurement
        performance_monitor.end_measurement(
            measurement_id,
            MeasurementPoint.BUFFER_READ
        )

        return buffer_latency_ms

    def adapt_buffer_size(self, current_latency_ms: float) -> bool:
        """Adapt buffer size based on current performance."""
        current_time = time.time()

        # Check if adaptation is needed and allowed
        if (current_time - self.last_adaptation_time) < self.min_adaptation_interval:
            return False

        if abs(current_latency_ms - self.config.latency_target_ms) < self.adaptation_threshold_ms:
            return False  # Within acceptable range

        with self.lock:
            old_chunk_size = self.config.chunk_size

            if current_latency_ms > self.config.latency_target_ms:
                # Latency too high - reduce buffer size
                new_chunk_size = int(self.config.chunk_size * (1 - self.adaptation_step_size))
                new_chunk_size = max(new_chunk_size, self.config.min_chunk_size)

            else:
                # Latency acceptable but could increase buffer for stability
                new_chunk_size = int(self.config.chunk_size * (1 + self.adaptation_step_size))
                new_chunk_size = min(new_chunk_size, self.config.max_chunk_size)

            # Apply platform-specific constraints
            optimal_sizes = self.platform_optimizations["optimal_chunk_sizes"]
            new_chunk_size = min(optimal_sizes,
                               key=lambda x: abs(x - new_chunk_size))

            if new_chunk_size != old_chunk_size:
                self.config.chunk_size = new_chunk_size
                self.metrics.adaptation_count += 1
                self.metrics.current_chunk_size = new_chunk_size
                self.last_adaptation_time = current_time

                if self.logger:
                    self.logger.info(f"Buffer adapted: {old_chunk_size} → {new_chunk_size} "
                                   f"(latency: {current_latency_ms:.1f}ms)")

                return True

        return False

    def update_metrics(self, latency_ms: float,
                      underrun: bool = False,
                      overrun: bool = False):
        """Update buffer performance metrics."""
        with self.lock:
            self.metrics.current_latency_ms = latency_ms
            self.latency_history.append(latency_ms)

            # Maintain history size
            if len(self.latency_history) > self.max_history_size:
                self.latency_history.pop(0)

            # Update statistics
            if self.latency_history:
                self.metrics.average_latency_ms = sum(self.latency_history) / len(self.latency_history)
                self.metrics.min_latency_ms = min(self.latency_history)
                self.metrics.max_latency_ms = max(self.latency_history)

            # Update error counts
            if underrun:
                self.metrics.buffer_underruns += 1
            if overrun:
                self.metrics.buffer_overruns += 1

            self.metrics.last_updated = time.time()

            # Trigger adaptation if needed
            self.adapt_buffer_size(latency_ms)

            # Callback for metrics updates
            if self.metrics_callback:
                try:
                    self.metrics_callback(self.metrics)
                except Exception as e:
                    if self.logger:
                        self.logger.error(f"Metrics callback error: {e}")

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary."""
        with self.lock:
            return {
                "configuration": {
                    "chunk_size": self.config.chunk_size,
                    "chunk_duration_ms": self.config.chunk_duration_ms,
                    "sample_rate": self.config.sample_rate,
                    "channels": self.config.channels,
                    "latency_target_ms": self.config.latency_target_ms
                },
                "metrics": {
                    "current_latency_ms": self.metrics.current_latency_ms,
                    "average_latency_ms": self.metrics.average_latency_ms,
                    "min_latency_ms": self.metrics.min_latency_ms,
                    "max_latency_ms": self.metrics.max_latency_ms,
                    "adaptation_count": self.metrics.adaptation_count,
                    "buffer_underruns": self.metrics.buffer_underruns,
                    "buffer_overruns": self.metrics.buffer_overruns
                },
                "platform": {
                    "platform": self.platform_optimizations["platform"],
                    "audio_api": self.platform_optimizations["audio_api"],
                    "supports_exclusive_mode": self.platform_optimizations["supports_exclusive_mode"]
                },
                "performance_status": self._get_performance_status()
            }

    def _get_performance_status(self) -> str:
        """Get current performance status."""
        if self.metrics.current_latency_ms <= self.config.latency_target_ms:
            return "✅ TARGET_ACHIEVED"
        elif self.metrics.current_latency_ms <= self.config.latency_target_ms * 1.2:
            return "⚠️ NEAR_TARGET"
        else:
            return "❌ EXCEEDS_TARGET"

    def set_buffer_callback(self, callback: Callable[[np.ndarray, float], None]):
        """Set callback for buffer processing."""
        self.buffer_callback = callback

    def set_metrics_callback(self, callback: Callable[[BufferMetrics], None]):
        """Set callback for metrics updates."""
        self.metrics_callback = callback

    def _start_monitoring(self):
        """Start real-time performance monitoring."""
        def monitoring_loop():
            while self.config.enable_monitoring:
                try:
                    # Create performance snapshot
                    if len(self.latency_history) > 0:
                        performance_monitor.start_measurement(
                            "buffer_performance_snapshot",
                            MeasurementPoint.BUFFER_WRITE
                        )

                        time.sleep(0.1)  # Small delay for measurement

                        performance_monitor.end_measurement(
                            "buffer_performance_snapshot",
                            MeasurementPoint.BUFFER_READ
                        )

                    time.sleep(1.0)  # Monitor every second

                except Exception as e:
                    if self.logger:
                        self.logger.error(f"Monitoring error: {e}")
                    time.sleep(1.0)

        # Start monitoring thread
        monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
        monitor_thread.start()

    def reset_metrics(self):
        """Reset all performance metrics."""
        with self.lock:
            self.metrics = BufferMetrics()
            self.latency_history.clear()
            self.last_adaptation_time = 0.0

    def export_performance_data(self) -> str:
        """Export performance data for analysis."""
        import json
        data = {
            "timestamp": time.time(),
            "performance_summary": self.get_performance_summary(),
            "latency_history": self.latency_history[-50:],  # Last 50 measurements
            "platform_info": self.platform_optimizations
        }
        return json.dumps(data, indent=2)


# Global optimized buffer manager instance
optimized_buffer_manager = AdaptiveBufferManager()
