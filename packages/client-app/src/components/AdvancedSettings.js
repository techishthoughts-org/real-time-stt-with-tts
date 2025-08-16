import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Accordion, AccordionSummary, AccordionDetails, Slider, FormControlLabel, Switch, TextField, Select, MenuItem, FormControl, InputLabel, Button, Chip, Divider, Grid, Alert, } from '@mui/material';
import { ExpandMore, Mic, VolumeUp, Settings, Tune, GraphicEq, RecordVoiceOver, Hearing, } from '@mui/icons-material';
export const AdvancedSettings = ({ onSettingsChange, initialSettings = {}, }) => {
    const [settings, setSettings] = useState({
        // Voice Activity Detection
        vad: {
            enabled: true,
            threshold: 0.3,
            silenceTimeout: 1000,
            minSpeechDuration: 200,
            sampleRate: 16000,
            frameSize: 1024,
        },
        // Noise Cancellation
        noiseCancellation: {
            enabled: true,
            noiseReductionLevel: 0.7,
            echoCancellation: true,
            autoGainControl: true,
            sampleRate: 16000,
            frameSize: 1024,
        },
        // Voice Commands
        voiceCommands: {
            enabled: true,
            sensitivity: 0.8,
            language: 'pt-BR',
            wakeWord: 'gon',
            wakeWordEnabled: true,
            autoExecute: true,
        },
        // Audio Visualization
        audioVisualization: {
            enabled: true,
            type: 'bars',
            autoScale: true,
            sensitivity: 1.0,
            color: '#2196f3',
            backgroundColor: '#f5f5f5',
        },
        // WebSocket
        websocket: {
            enabled: true,
            reconnectInterval: 3000,
            maxReconnectAttempts: 5,
            pingInterval: 30000,
        },
        // General
        general: {
            autoStart: false,
            continuousMode: false,
            saveConversations: true,
            analytics: true,
        },
    });
    // Update settings
    const updateSettings = useCallback((section, key, value) => {
        setSettings(prev => {
            const newSettings = {
                ...prev,
                [section]: {
                    ...prev[section],
                    [key]: value,
                },
            };
            onSettingsChange?.(newSettings);
            return newSettings;
        });
    }, [onSettingsChange]);
    // Reset settings to defaults
    const resetSettings = useCallback(() => {
        setSettings(initialSettings);
        onSettingsChange?.(initialSettings);
    }, [initialSettings, onSettingsChange]);
    // Export settings
    const exportSettings = useCallback(() => {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'voice-assistant-settings.json';
        link.click();
        URL.revokeObjectURL(url);
    }, [settings]);
    // Import settings
    const importSettings = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target?.result);
                setSettings(importedSettings);
                onSettingsChange?.(importedSettings);
            }
            catch (error) {
                console.error('Error importing settings:', error);
            }
        };
        reader.readAsText(file);
    }, [onSettingsChange]);
    return (_jsx(Box, { sx: { maxWidth: 800, mx: 'auto', p: 2 }, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 3 }, children: [_jsx(Settings, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h5", component: "h2", children: "Advanced Settings" })] }), _jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "Configure advanced voice processing features for optimal performance and user experience." }), _jsxs(Accordion, { defaultExpanded: true, children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMore, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(Mic, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", children: "Voice Activity Detection" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.vad.enabled, onChange: (e) => updateSettings('vad', 'enabled', e.target.checked) }), label: "Enable Voice Activity Detection" }) }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["Detection Threshold: ", settings.vad.threshold.toFixed(2)] }), _jsx(Slider, { value: settings.vad.threshold, onChange: (_, value) => updateSettings('vad', 'threshold', value), min: 0.1, max: 0.9, step: 0.05, disabled: !settings.vad.enabled })] }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["Silence Timeout: ", settings.vad.silenceTimeout, "ms"] }), _jsx(Slider, { value: settings.vad.silenceTimeout, onChange: (_, value) => updateSettings('vad', 'silenceTimeout', value), min: 500, max: 3000, step: 100, disabled: !settings.vad.enabled })] }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "Sample Rate", type: "number", value: settings.vad.sampleRate, onChange: (e) => updateSettings('vad', 'sampleRate', parseInt(e.target.value)), disabled: !settings.vad.enabled }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "Frame Size", type: "number", value: settings.vad.frameSize, onChange: (e) => updateSettings('vad', 'frameSize', parseInt(e.target.value)), disabled: !settings.vad.enabled }) })] }) })] }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMore, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(Hearing, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", children: "Noise Cancellation" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.noiseCancellation.enabled, onChange: (e) => updateSettings('noiseCancellation', 'enabled', e.target.checked) }), label: "Enable Noise Cancellation" }) }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["Noise Reduction Level: ", settings.noiseCancellation.noiseReductionLevel.toFixed(2)] }), _jsx(Slider, { value: settings.noiseCancellation.noiseReductionLevel, onChange: (_, value) => updateSettings('noiseCancellation', 'noiseReductionLevel', value), min: 0.1, max: 1.0, step: 0.1, disabled: !settings.noiseCancellation.enabled })] }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.noiseCancellation.echoCancellation, onChange: (e) => updateSettings('noiseCancellation', 'echoCancellation', e.target.checked) }), label: "Echo Cancellation", disabled: !settings.noiseCancellation.enabled }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.noiseCancellation.autoGainControl, onChange: (e) => updateSettings('noiseCancellation', 'autoGainControl', e.target.checked) }), label: "Auto Gain Control", disabled: !settings.noiseCancellation.enabled }) })] }) })] }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMore, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(RecordVoiceOver, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", children: "Voice Commands" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.voiceCommands.enabled, onChange: (e) => updateSettings('voiceCommands', 'enabled', e.target.checked) }), label: "Enable Voice Commands" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "Wake Word", value: settings.voiceCommands.wakeWord, onChange: (e) => updateSettings('voiceCommands', 'wakeWord', e.target.value), disabled: !settings.voiceCommands.enabled }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { fullWidth: true, disabled: !settings.voiceCommands.enabled, children: [_jsx(InputLabel, { children: "Language" }), _jsxs(Select, { value: settings.voiceCommands.language, onChange: (e) => updateSettings('voiceCommands', 'language', e.target.value), children: [_jsx(MenuItem, { value: "pt-BR", children: "Portuguese (Brazil)" }), _jsx(MenuItem, { value: "en-US", children: "English (US)" }), _jsx(MenuItem, { value: "es-ES", children: "Spanish" }), _jsx(MenuItem, { value: "fr-FR", children: "French" }), _jsx(MenuItem, { value: "de-DE", children: "German" })] })] }) }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["Command Sensitivity: ", settings.voiceCommands.sensitivity.toFixed(2)] }), _jsx(Slider, { value: settings.voiceCommands.sensitivity, onChange: (_, value) => updateSettings('voiceCommands', 'sensitivity', value), min: 0.1, max: 1.0, step: 0.1, disabled: !settings.voiceCommands.enabled })] }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.voiceCommands.autoExecute, onChange: (e) => updateSettings('voiceCommands', 'autoExecute', e.target.checked) }), label: "Auto Execute Commands", disabled: !settings.voiceCommands.enabled }) })] }) })] }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMore, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(GraphicEq, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", children: "Audio Visualization" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.audioVisualization.enabled, onChange: (e) => updateSettings('audioVisualization', 'enabled', e.target.checked) }), label: "Enable Audio Visualization" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { fullWidth: true, disabled: !settings.audioVisualization.enabled, children: [_jsx(InputLabel, { children: "Visualization Type" }), _jsxs(Select, { value: settings.audioVisualization.type, onChange: (e) => updateSettings('audioVisualization', 'type', e.target.value), children: [_jsx(MenuItem, { value: "bars", children: "Bars" }), _jsx(MenuItem, { value: "waveform", children: "Waveform" }), _jsx(MenuItem, { value: "spectrum", children: "Spectrum" }), _jsx(MenuItem, { value: "circular", children: "Circular" })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.audioVisualization.autoScale, onChange: (e) => updateSettings('audioVisualization', 'autoScale', e.target.checked) }), label: "Auto Scale", disabled: !settings.audioVisualization.enabled }) }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["Sensitivity: ", settings.audioVisualization.sensitivity.toFixed(2)] }), _jsx(Slider, { value: settings.audioVisualization.sensitivity, onChange: (_, value) => updateSettings('audioVisualization', 'sensitivity', value), min: 0.1, max: 2.0, step: 0.1, disabled: !settings.audioVisualization.enabled })] })] }) })] }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMore, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(Tune, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", children: "General Settings" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.general.autoStart, onChange: (e) => updateSettings('general', 'autoStart', e.target.checked) }), label: "Auto Start on Load" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.general.continuousMode, onChange: (e) => updateSettings('general', 'continuousMode', e.target.checked) }), label: "Continuous Mode" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.general.saveConversations, onChange: (e) => updateSettings('general', 'saveConversations', e.target.checked) }), label: "Save Conversations" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.general.analytics, onChange: (e) => updateSettings('general', 'analytics', e.target.checked) }), label: "Enable Analytics" }) })] }) })] }), _jsx(Divider, { sx: { my: 3 } }), _jsxs(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap' }, children: [_jsx(Button, { variant: "outlined", onClick: resetSettings, startIcon: _jsx(Settings, {}), children: "Reset to Defaults" }), _jsx(Button, { variant: "outlined", onClick: exportSettings, startIcon: _jsx(VolumeUp, {}), children: "Export Settings" }), _jsxs(Button, { variant: "outlined", component: "label", startIcon: _jsx(Mic, {}), children: ["Import Settings", _jsx("input", { type: "file", hidden: true, accept: ".json", onChange: importSettings })] })] }), _jsxs(Box, { sx: { mt: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Active Features" }), _jsxs(Box, { sx: { display: 'flex', gap: 1, flexWrap: 'wrap' }, children: [settings.vad.enabled && _jsx(Chip, { label: "VAD", color: "primary", size: "small" }), settings.noiseCancellation.enabled && _jsx(Chip, { label: "Noise Cancellation", color: "primary", size: "small" }), settings.voiceCommands.enabled && _jsx(Chip, { label: "Voice Commands", color: "primary", size: "small" }), settings.audioVisualization.enabled && _jsx(Chip, { label: "Audio Visualization", color: "primary", size: "small" }), settings.websocket.enabled && _jsx(Chip, { label: "WebSocket", color: "primary", size: "small" })] })] })] }) }) }));
};
