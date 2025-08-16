import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Slider, FormControlLabel, Switch, Chip, } from '@mui/material';
import { VolumeUp, MusicNote, GraphicEq } from '@mui/icons-material';
export const AudioVisualizer = ({ audioData, volume = 0, isActive = false, width = 400, height = 200, type = 'bars', color = '#2196f3', backgroundColor = '#f5f5f5', showControls = true, autoScale = true, sensitivity = 1.0, }) => {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [visualizerType, setVisualizerType] = useState(type);
    const [isEnabled, setIsEnabled] = useState(true);
    const [scale, setScale] = useState(1.0);
    // Draw bars visualizer
    const drawBars = useCallback((ctx, data) => {
        const barWidth = width / data.length;
        const maxBarHeight = height * 0.8;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < data.length; i++) {
            const barHeight = (data[i] / 255) * maxBarHeight * scale * sensitivity;
            const x = i * barWidth;
            const y = height - barHeight;
            // Create gradient
            const gradient = ctx.createLinearGradient(x, y, x, height);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, `${color}80`);
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
    }, [width, height, backgroundColor, color, scale, sensitivity]);
    // Draw waveform visualizer
    const drawWaveform = useCallback((ctx, data) => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const centerY = height / 2;
        const step = width / data.length;
        for (let i = 0; i < data.length; i++) {
            const x = i * step;
            const y = centerY + (data[i] * centerY * scale * sensitivity);
            if (i === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }, [width, height, backgroundColor, color, scale, sensitivity]);
    // Draw spectrum visualizer
    const drawSpectrum = useCallback((ctx, data) => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        const barWidth = width / data.length;
        const maxBarHeight = height * 0.9;
        for (let i = 0; i < data.length; i++) {
            const barHeight = (data[i] / 255) * maxBarHeight * scale * sensitivity;
            const x = i * barWidth;
            const y = height - barHeight;
            // Create radial gradient for spectrum effect
            const gradient = ctx.createRadialGradient(x + barWidth / 2, y + barHeight / 2, 0, x + barWidth / 2, y + barHeight / 2, barHeight);
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.7, `${color}80`);
            gradient.addColorStop(1, `${color}20`);
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
    }, [width, height, backgroundColor, color, scale, sensitivity]);
    // Draw circular visualizer
    const drawCircular = useCallback((ctx, data) => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;
        const maxRadius = Math.min(width, height) * 0.4;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        for (let i = 0; i < data.length; i++) {
            const angle = (i / data.length) * 2 * Math.PI;
            const dataRadius = radius + (data[i] / 255) * (maxRadius - radius) * scale * sensitivity;
            const x1 = centerX + radius * Math.cos(angle);
            const y1 = centerY + radius * Math.sin(angle);
            const x2 = centerX + dataRadius * Math.cos(angle);
            const y2 = centerY + dataRadius * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }, [width, height, backgroundColor, color, scale, sensitivity]);
    // Main render function
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isEnabled)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        if (audioData) {
            switch (visualizerType) {
                case 'bars':
                    if (audioData instanceof Uint8Array) {
                        drawBars(ctx, audioData);
                    }
                    break;
                case 'waveform':
                    if (audioData instanceof Float32Array) {
                        drawWaveform(ctx, audioData);
                    }
                    break;
                case 'spectrum':
                    if (audioData instanceof Uint8Array) {
                        drawSpectrum(ctx, audioData);
                    }
                    break;
                case 'circular':
                    if (audioData instanceof Uint8Array) {
                        drawCircular(ctx, audioData);
                    }
                    break;
            }
        }
        else if (volume > 0) {
            // Fallback to volume-based visualization
            const data = new Uint8Array(64);
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.floor(volume * 255 * (0.5 + 0.5 * Math.sin(i * 0.1)));
            }
            drawBars(ctx, data);
        }
        animationFrameRef.current = requestAnimationFrame(render);
    }, [audioData, volume, visualizerType, isEnabled, drawBars, drawWaveform, drawSpectrum, drawCircular]);
    // Start/stop animation
    useEffect(() => {
        if (isEnabled) {
            render();
        }
        else if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [render, isEnabled]);
    // Auto-scale based on audio data
    useEffect(() => {
        if (autoScale && audioData && audioData.length > 0) {
            let maxValue = 0;
            for (let i = 0; i < audioData.length; i++) {
                maxValue = Math.max(maxValue, audioData[i]);
            }
            if (maxValue > 0) {
                const newScale = Math.min(2.0, 1.0 / (maxValue / 255));
                setScale(newScale);
            }
        }
    }, [audioData, autoScale]);
    // Update canvas size
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
        }
    }, [width, height]);
    return (_jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h6", sx: { flexGrow: 1 }, children: "Audio Visualizer" }), _jsx(Chip, { icon: isActive ? _jsx(VolumeUp, {}) : _jsx(MusicNote, {}), label: isActive ? 'Active' : 'Inactive', color: isActive ? 'success' : 'default', size: "small" })] }), _jsxs(Box, { sx: { position: 'relative', mb: 2 }, children: [_jsx("canvas", { ref: canvasRef, style: {
                                width: '100%',
                                height: height,
                                borderRadius: 8,
                                border: `2px solid ${isActive ? color : '#ddd'}`,
                            } }), volume > 0 && (_jsxs(Box, { sx: {
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                bgcolor: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                            }, children: [Math.round(volume * 100), "%"] }))] }), showControls && (_jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: isEnabled, onChange: (e) => setIsEnabled(e.target.checked) }), label: "Enable" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: autoScale, onChange: (e) => setScale(1.0) }), label: "Auto Scale" })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", gutterBottom: true, children: "Visualizer Type" }), _jsx(Box, { sx: { display: 'flex', gap: 1, flexWrap: 'wrap' }, children: ['bars', 'waveform', 'spectrum', 'circular'].map((type) => (_jsx(Chip, { label: type.charAt(0).toUpperCase() + type.slice(1), variant: visualizerType === type ? 'filled' : 'outlined', size: "small", onClick: () => setVisualizerType(type), icon: _jsx(GraphicEq, {}) }, type))) })] }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["Sensitivity: ", sensitivity.toFixed(2)] }), _jsx(Slider, { value: sensitivity, onChange: (_, value) => setScale(value), min: 0.1, max: 2.0, step: 0.1, marks: [
                                        { value: 0.1, label: 'Low' },
                                        { value: 1.0, label: 'Normal' },
                                        { value: 2.0, label: 'High' },
                                    ] })] })] }))] }) }));
};
