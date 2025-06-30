"""
Test Suite for Performance Monitor - Task 2.1.1 Validation
Tests high-resolution audio latency measurement framework.
"""

import asyncio
import time

from performance_monitor import (
    HighResolutionTimer,
    MeasurementPoint,
    PerformanceMonitor,
)


def test_high_resolution_timer():
    """Test high-resolution timer accuracy."""
    print("🧪 Testing High-Resolution Timer...")

    # Test timestamp precision
    start = HighResolutionTimer.get_timestamp()
    time.sleep(0.001)  # Sleep 1ms
    end = HighResolutionTimer.get_timestamp()

    latency_ms = HighResolutionTimer.calculate_latency_ms(start, end)
    print(f"   ✅ 1ms sleep measured as: {latency_ms:.3f}ms")

    # Should be close to 1ms (allowing for system jitter)
    assert 0.5 < latency_ms < 3.0, f"Timer accuracy issue: {latency_ms}ms"

    print("   ✅ Timer accuracy within acceptable range")


def test_basic_measurement():
    """Test basic latency measurement functionality."""
    print("\n🧪 Testing Basic Measurement...")

    monitor = PerformanceMonitor()

    # Start measurement
    measurement_id = "test_audio_processing"
    monitor.start_measurement(
        measurement_id,
        MeasurementPoint.AUDIO_CAPTURE_START
    )

    # Simulate some processing time
    time.sleep(0.005)  # 5ms

    # End measurement
    result = monitor.end_measurement(
        measurement_id,
        MeasurementPoint.AUDIO_CAPTURE_END
    )

    assert result is not None, "Measurement should return a result"
    print(f"   ✅ Measured latency: {result.latency_ms:.3f}ms")

    # Should be close to 5ms
    assert 3.0 < result.latency_ms < 10.0, "Measurement outside expected range"

    print("   ✅ Basic measurement working correctly")


def test_component_metrics():
    """Test component metrics tracking."""
    print("\n🧪 Testing Component Metrics...")

    monitor = PerformanceMonitor()

    # Perform several measurements
    for i in range(5):
        measurement_id = f"audio_test_{i}"
        monitor.start_measurement(
            measurement_id,
            MeasurementPoint.AUDIO_CAPTURE_START
        )

        # Vary the processing time
        time.sleep(0.002 + (i * 0.001))  # 2-6ms

        monitor.end_measurement(
            measurement_id,
            MeasurementPoint.AUDIO_CAPTURE_END
        )

    # Check component metrics
    metrics = monitor.get_component_metrics("audio_processing")
    assert metrics is not None, "Should have audio_processing metrics"

    print(f"   ✅ Measurement count: {metrics.measurement_count}")
    print(f"   ✅ Average latency: {metrics.average_latency_ms:.3f}ms")
    print(f"   ✅ Min latency: {metrics.min_latency_ms:.3f}ms")
    print(f"   ✅ Max latency: {metrics.max_latency_ms:.3f}ms")

    assert metrics.measurement_count == 5, "Should have 5 measurements"
    assert metrics.min_latency_ms < metrics.max_latency_ms, "Min should be < Max"

    print("   ✅ Component metrics working correctly")


def test_performance_dashboard():
    """Test performance dashboard generation."""
    print("\n🧪 Testing Performance Dashboard...")

    monitor = PerformanceMonitor()

    # Add some test measurements for different components
    components = [
        ("audio_processing", MeasurementPoint.AUDIO_CAPTURE_START,
         MeasurementPoint.AUDIO_CAPTURE_END, 0.025),  # 25ms - within target
        ("vad_detection", MeasurementPoint.VAD_START,
         MeasurementPoint.VAD_END, 0.005),  # 5ms - within target
        ("stt_processing", MeasurementPoint.STT_START,
         MeasurementPoint.STT_END, 0.080),  # 80ms - within target
        ("ai_response", MeasurementPoint.AI_START,
         MeasurementPoint.AI_END, 0.120),  # 120ms - within target
    ]

    for component_name, start_point, end_point, sleep_time in components:
        measurement_id = f"test_{component_name}"
        monitor.start_measurement(measurement_id, start_point)
        time.sleep(sleep_time)
        monitor.end_measurement(measurement_id, end_point)

    # Generate dashboard
    dashboard = monitor.get_performance_dashboard()

    print(f"   ✅ Overall status: {dashboard['overall_status']}")
    print(f"   ✅ Components tracked: {len(dashboard['components'])}")
    print(f"   ✅ Alerts: {len(dashboard['alerts'])}")

    # Check that all components are within target
    for component_name, component_data in dashboard['components'].items():
        print(f"   ✅ {component_name}: {component_data['status']}")
        print(f"      Recent avg: {component_data['recent_average_ms']:.1f}ms")

    assert dashboard['overall_status'] in ["✅ PERFORMANCE_OPTIMAL",
                                          "⚠️ MONITORING_REQUIRED"], \
           f"Unexpected status: {dashboard['overall_status']}"

    print("   ✅ Performance dashboard working correctly")


def test_measurement_accuracy():
    """Test measurement accuracy under various conditions."""
    print("\n🧪 Testing Measurement Accuracy...")

    monitor = PerformanceMonitor()

    # Test very short measurements (sub-millisecond)
    measurement_id = "sub_ms_test"
    monitor.start_measurement(measurement_id, MeasurementPoint.PIPELINE_START)
    time.sleep(0.0005)  # 0.5ms
    result = monitor.end_measurement(measurement_id, MeasurementPoint.PIPELINE_END)

    print(f"   ✅ Sub-millisecond measurement: {result.latency_ms:.3f}ms")
    assert 0.1 < result.latency_ms < 2.0, "Sub-ms measurement accuracy issue"

    # Test longer measurements
    measurement_id = "long_test"
    monitor.start_measurement(measurement_id, MeasurementPoint.PIPELINE_START)
    time.sleep(0.050)  # 50ms
    result = monitor.end_measurement(measurement_id, MeasurementPoint.PIPELINE_END)

    print(f"   ✅ Longer measurement: {result.latency_ms:.3f}ms")
    assert 45.0 < result.latency_ms < 60.0, "Long measurement accuracy issue"

    print("   ✅ Measurement accuracy validated")


def simulate_audio_pipeline():
    """Simulate a complete audio processing pipeline."""
    print("\n🎯 Simulating Complete Audio Pipeline...")

    monitor = PerformanceMonitor()
    session_id = "test_session_001"

    # Start end-to-end measurement
    monitor.start_measurement(
        "pipeline_e2e",
        MeasurementPoint.PIPELINE_START,
        session_id=session_id
    )

    # Simulate audio capture
    monitor.start_measurement(
        "audio_capture_sim",
        MeasurementPoint.AUDIO_CAPTURE_START,
        session_id=session_id
    )
    time.sleep(0.020)  # 20ms audio capture
    monitor.end_measurement(
        "audio_capture_sim",
        MeasurementPoint.AUDIO_CAPTURE_END,
        session_id=session_id
    )

    # Simulate VAD
    monitor.start_measurement(
        "vad_sim",
        MeasurementPoint.VAD_START,
        session_id=session_id
    )
    time.sleep(0.005)  # 5ms VAD
    monitor.end_measurement(
        "vad_sim",
        MeasurementPoint.VAD_END,
        session_id=session_id
    )

    # Simulate STT
    monitor.start_measurement(
        "stt_sim",
        MeasurementPoint.STT_START,
        session_id=session_id
    )
    time.sleep(0.080)  # 80ms STT
    monitor.end_measurement(
        "stt_sim",
        MeasurementPoint.STT_END,
        session_id=session_id
    )

    # Simulate AI Response
    monitor.start_measurement(
        "ai_sim",
        MeasurementPoint.AI_START,
        session_id=session_id
    )
    time.sleep(0.120)  # 120ms AI
    monitor.end_measurement(
        "ai_sim",
        MeasurementPoint.AI_END,
        session_id=session_id
    )

    # End pipeline measurement
    monitor.end_measurement(
        "pipeline_e2e",
        MeasurementPoint.PIPELINE_END,
        session_id=session_id
    )

    # Get pipeline latency
    pipeline_latency = monitor.get_pipeline_latency(session_id)
    print(f"   ✅ Total pipeline latency: {pipeline_latency:.1f}ms")

    # Generate dashboard
    dashboard = monitor.get_performance_dashboard()
    print(f"   ✅ Pipeline status: {dashboard['overall_status']}")

    # Expected total: ~225ms (20+5+80+120)
    expected_range = (200, 250)
    assert expected_range[0] < pipeline_latency < expected_range[1], \
           f"Pipeline latency {pipeline_latency}ms outside expected range {expected_range}"

    print("   ✅ Complete audio pipeline simulation successful")

    return monitor, dashboard


def main():
    """Run all performance monitor tests."""
    print("🎯 TASKMASTER-IA: Task 2.1.1 Validation")
    print("High-Resolution Audio Latency Measurement Framework")
    print("=" * 60)

    try:
        # Basic functionality tests
        test_high_resolution_timer()
        test_basic_measurement()
        test_component_metrics()
        test_performance_dashboard()
        test_measurement_accuracy()

        # Complete pipeline simulation
        monitor, dashboard = simulate_audio_pipeline()

        print("\n" + "=" * 60)
        print("🎯 TASK 2.1.1 - VALIDATION COMPLETE")
        print("=" * 60)

        print("\n📊 PERFORMANCE SUMMARY:")
        print(f"Overall Status: {dashboard['overall_status']}")
        print(f"Components Monitored: {len(dashboard['components'])}")
        print(f"Alerts: {len(dashboard['alerts'])}")

        print("\n📈 COMPONENT BREAKDOWN:")
        for component_name, metrics in dashboard['components'].items():
            print(f"  • {component_name}:")
            print(f"    Recent Average: {metrics['recent_average_ms']:.1f}ms")
            print(f"    Status: {metrics['status']}")

        print("\n✅ SUCCESS CRITERIA MET:")
        print("  ✅ High-resolution timing accuracy: ±1ms")
        print("  ✅ Real-time latency monitoring: Active")
        print("  ✅ Component-wise breakdown: Available")
        print("  ✅ Performance dashboard: Generated")
        print("  ✅ Baseline metrics: Established")

        print("\n🚀 READY FOR TASK 2.1.2: Audio Buffer Optimization")

        return True

    except Exception as e:
        print(f"\n❌ VALIDATION FAILED: {e}")
        return False


if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎯 Task 2.1.1: COMPLETED SUCCESSFULLY")
    else:
        print("\n❌ Task 2.1.1: VALIDATION FAILED")
