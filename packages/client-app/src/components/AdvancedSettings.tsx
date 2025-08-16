import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  FormControlLabel,
  Switch,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Divider,
  Grid,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  Mic,
  VolumeUp,
  Settings,
  Tune,
  GraphicEq,
  RecordVoiceOver,
  Hearing,
} from '@mui/icons-material';

interface AdvancedSettingsProps {
  onSettingsChange?: (settings: any) => void;
  initialSettings?: any;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  onSettingsChange,
  initialSettings = {},
}) => {
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
  const updateSettings = useCallback((section: string, key: string, value: any) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
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
  const importSettings = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        onSettingsChange?.(importedSettings);
      } catch (error) {
        console.error('Error importing settings:', error);
      }
    };
    reader.readAsText(file);
  }, [onSettingsChange]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Settings sx={{ mr: 1 }} />
            <Typography variant="h5" component="h2">
              Advanced Settings
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Configure advanced voice processing features for optimal performance and user experience.
          </Alert>

          {/* Voice Activity Detection */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Mic sx={{ mr: 1 }} />
                <Typography variant="h6">Voice Activity Detection</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.vad.enabled}
                        onChange={(e) => updateSettings('vad', 'enabled', e.target.checked)}
                      />
                    }
                    label="Enable Voice Activity Detection"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    Detection Threshold: {settings.vad.threshold.toFixed(2)}
                  </Typography>
                  <Slider
                    value={settings.vad.threshold}
                    onChange={(_, value) => updateSettings('vad', 'threshold', value)}
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    disabled={!settings.vad.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    Silence Timeout: {settings.vad.silenceTimeout}ms
                  </Typography>
                  <Slider
                    value={settings.vad.silenceTimeout}
                    onChange={(_, value) => updateSettings('vad', 'silenceTimeout', value)}
                    min={500}
                    max={3000}
                    step={100}
                    disabled={!settings.vad.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Sample Rate"
                    type="number"
                    value={settings.vad.sampleRate}
                    onChange={(e) => updateSettings('vad', 'sampleRate', parseInt(e.target.value))}
                    disabled={!settings.vad.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Frame Size"
                    type="number"
                    value={settings.vad.frameSize}
                    onChange={(e) => updateSettings('vad', 'frameSize', parseInt(e.target.value))}
                    disabled={!settings.vad.enabled}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Noise Cancellation */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Hearing sx={{ mr: 1 }} />
                <Typography variant="h6">Noise Cancellation</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.noiseCancellation.enabled}
                        onChange={(e) => updateSettings('noiseCancellation', 'enabled', e.target.checked)}
                      />
                    }
                    label="Enable Noise Cancellation"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    Noise Reduction Level: {settings.noiseCancellation.noiseReductionLevel.toFixed(2)}
                  </Typography>
                  <Slider
                    value={settings.noiseCancellation.noiseReductionLevel}
                    onChange={(_, value) => updateSettings('noiseCancellation', 'noiseReductionLevel', value)}
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    disabled={!settings.noiseCancellation.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.noiseCancellation.echoCancellation}
                        onChange={(e) => updateSettings('noiseCancellation', 'echoCancellation', e.target.checked)}
                      />
                    }
                    label="Echo Cancellation"
                    disabled={!settings.noiseCancellation.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.noiseCancellation.autoGainControl}
                        onChange={(e) => updateSettings('noiseCancellation', 'autoGainControl', e.target.checked)}
                      />
                    }
                    label="Auto Gain Control"
                    disabled={!settings.noiseCancellation.enabled}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Voice Commands */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <RecordVoiceOver sx={{ mr: 1 }} />
                <Typography variant="h6">Voice Commands</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.voiceCommands.enabled}
                        onChange={(e) => updateSettings('voiceCommands', 'enabled', e.target.checked)}
                      />
                    }
                    label="Enable Voice Commands"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Wake Word"
                    value={settings.voiceCommands.wakeWord}
                    onChange={(e) => updateSettings('voiceCommands', 'wakeWord', e.target.value)}
                    disabled={!settings.voiceCommands.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!settings.voiceCommands.enabled}>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={settings.voiceCommands.language}
                      onChange={(e) => updateSettings('voiceCommands', 'language', e.target.value)}
                    >
                      <MenuItem value="pt-BR">Portuguese (Brazil)</MenuItem>
                      <MenuItem value="en-US">English (US)</MenuItem>
                      <MenuItem value="es-ES">Spanish</MenuItem>
                      <MenuItem value="fr-FR">French</MenuItem>
                      <MenuItem value="de-DE">German</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    Command Sensitivity: {settings.voiceCommands.sensitivity.toFixed(2)}
                  </Typography>
                  <Slider
                    value={settings.voiceCommands.sensitivity}
                    onChange={(_, value) => updateSettings('voiceCommands', 'sensitivity', value)}
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    disabled={!settings.voiceCommands.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.voiceCommands.autoExecute}
                        onChange={(e) => updateSettings('voiceCommands', 'autoExecute', e.target.checked)}
                      />
                    }
                    label="Auto Execute Commands"
                    disabled={!settings.voiceCommands.enabled}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Audio Visualization */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <GraphicEq sx={{ mr: 1 }} />
                <Typography variant="h6">Audio Visualization</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.audioVisualization.enabled}
                        onChange={(e) => updateSettings('audioVisualization', 'enabled', e.target.checked)}
                      />
                    }
                    label="Enable Audio Visualization"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!settings.audioVisualization.enabled}>
                    <InputLabel>Visualization Type</InputLabel>
                    <Select
                      value={settings.audioVisualization.type}
                      onChange={(e) => updateSettings('audioVisualization', 'type', e.target.value)}
                    >
                      <MenuItem value="bars">Bars</MenuItem>
                      <MenuItem value="waveform">Waveform</MenuItem>
                      <MenuItem value="spectrum">Spectrum</MenuItem>
                      <MenuItem value="circular">Circular</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.audioVisualization.autoScale}
                        onChange={(e) => updateSettings('audioVisualization', 'autoScale', e.target.checked)}
                      />
                    }
                    label="Auto Scale"
                    disabled={!settings.audioVisualization.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    Sensitivity: {settings.audioVisualization.sensitivity.toFixed(2)}
                  </Typography>
                  <Slider
                    value={settings.audioVisualization.sensitivity}
                    onChange={(_, value) => updateSettings('audioVisualization', 'sensitivity', value)}
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    disabled={!settings.audioVisualization.enabled}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* General Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tune sx={{ mr: 1 }} />
                <Typography variant="h6">General Settings</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.general.autoStart}
                        onChange={(e) => updateSettings('general', 'autoStart', e.target.checked)}
                      />
                    }
                    label="Auto Start on Load"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.general.continuousMode}
                        onChange={(e) => updateSettings('general', 'continuousMode', e.target.checked)}
                      />
                    }
                    label="Continuous Mode"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.general.saveConversations}
                        onChange={(e) => updateSettings('general', 'saveConversations', e.target.checked)}
                      />
                    }
                    label="Save Conversations"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.general.analytics}
                        onChange={(e) => updateSettings('general', 'analytics', e.target.checked)}
                      />
                    }
                    label="Enable Analytics"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={resetSettings}
              startIcon={<Settings />}
            >
              Reset to Defaults
            </Button>

            <Button
              variant="outlined"
              onClick={exportSettings}
              startIcon={<VolumeUp />}
            >
              Export Settings
            </Button>

            <Button
              variant="outlined"
              component="label"
              startIcon={<Mic />}
            >
              Import Settings
              <input
                type="file"
                hidden
                accept=".json"
                onChange={importSettings}
              />
            </Button>
          </Box>

          {/* Current Settings Summary */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Features
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {settings.vad.enabled && <Chip label="VAD" color="primary" size="small" />}
              {settings.noiseCancellation.enabled && <Chip label="Noise Cancellation" color="primary" size="small" />}
              {settings.voiceCommands.enabled && <Chip label="Voice Commands" color="primary" size="small" />}
              {settings.audioVisualization.enabled && <Chip label="Audio Visualization" color="primary" size="small" />}
              {settings.websocket.enabled && <Chip label="WebSocket" color="primary" size="small" />}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
