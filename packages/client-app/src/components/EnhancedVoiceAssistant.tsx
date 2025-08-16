import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { VoiceAssistant } from './VoiceAssistant';
import { VoiceRecorder } from './VoiceRecorder';
import { useWebSocketChat } from '../hooks/useWebSocketChat';

interface EnhancedVoiceAssistantProps {
  userId?: string;
  onSettingsChange?: (settings: any) => void;
}

export const EnhancedVoiceAssistant: React.FC<EnhancedVoiceAssistantProps> = ({
  userId = 'anonymous',
  onSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);

  const {
    isConnected,
    isListening,
    connectionId,
    error: wsError,
  } = useWebSocketChat();

  const handleTranscription = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscription(prev => prev + (prev ? ' ' : '') + text);
    } else {
      // Show interim transcription
      console.log('Interim transcription:', text);
    }
  }, []);

  const handleAudioData = useCallback((audioData: any) => {
    // Handle audio data if needed
    console.log('Audio data received:', audioData);
  }, []);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🎭 Gon Voice Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Advanced AI-powered voice assistant with real-time communication
        </Typography>
        
        {/* Connection Status */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mt: 2 }}>
          <Chip
            label={isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
            color={isConnected ? 'success' : 'error'}
            variant="outlined"
          />
          {connectionId && (
            <Chip
              label={`ID: ${connectionId.slice(-8)}`}
              variant="outlined"
              size="small"
            />
          )}
          {isListening && (
            <Chip
              label="Listening"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* WebSocket Error */}
      {wsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          WebSocket Error: {wsError}
        </Alert>
      )}

      {/* Mode Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Communication Mode
          </Typography>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label="Real-time Voice" />
            <Tab label="Traditional Chat" />
            <Tab label="Voice Recorder" />
          </Tabs>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Real-time Voice Communication
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use the voice recorder below for real-time voice communication with Gon via WebSocket.
            </Typography>
            
            <VoiceRecorder
              onTranscription={handleTranscription}
              onAudioData={handleAudioData}
              language="pt-BR"
              sampleRate={16000}
            />

            {/* Transcription Display */}
            {transcription && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Transcription:
                </Typography>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1">{transcription}</Typography>
                </Card>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Traditional Chat Interface
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use the traditional chat interface with Web Speech API.
            </Typography>
            
            <VoiceAssistant
              userId={userId}
              onSettingsChange={onSettingsChange}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Advanced Voice Recorder
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Advanced voice recording with audio visualization and playback.
            </Typography>
            
            <VoiceRecorder
              onTranscription={handleTranscription}
              onAudioData={handleAudioData}
              language="pt-BR"
              sampleRate={44100}
              channels={2}
            />
          </CardContent>
        </Card>
      )}

      {/* Features Overview */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Features
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                🎤 Real-time Voice
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live voice communication with instant transcription and AI responses
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                🔄 WebSocket Streaming
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Low-latency bidirectional communication for seamless interaction
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                🎵 Audio Processing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Advanced audio capture with noise suppression and echo cancellation
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                🤖 AI Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Powered by multiple AI models with context-aware responses
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Technical Information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                WebSocket Status
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Connection ID
              </Typography>
              <Typography variant="body1" fontWeight="bold" fontFamily="monospace">
                {connectionId ? connectionId.slice(-12) : 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Listening State
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {isListening ? 'Active' : 'Inactive'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Mode
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {isRealTimeMode ? 'Real-time' : 'Traditional'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
