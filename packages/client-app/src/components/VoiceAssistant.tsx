import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Paper,
  Grid,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  PlayArrow,
  Stop,
  Settings,
  History,
} from '@mui/icons-material';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useAuth } from '../hooks/useAuth';

interface VoiceAssistantProps {
  isListening: boolean;
  isSpeaking: boolean;
  transcription: string;
  response: string;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  isListening,
  isSpeaking,
  transcription,
  response,
}) => {
  const { startListening, stopListening, speak, stopSpeaking } = useVoiceAssistant();
  const { user } = useAuth();
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate audio level for visual feedback
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isListening]);

  const handleVoiceButtonClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeakClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (response) {
      speak(response);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🎭 Gon Voice Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your personal AI companion with Brazilian Portuguese personality
        </Typography>
      </Box>

      {/* Main Voice Interface */}
      <Card sx={{ mb: 3, position: 'relative', overflow: 'visible' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {/* Status Indicator */}
          <Box sx={{ mb: 3 }}>
            <Chip
              label={isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready'}
              color={isListening ? 'error' : isSpeaking ? 'success' : 'default'}
              icon={isListening ? <Mic /> : isSpeaking ? <VolumeUp /> : <Mic />}
              sx={{ fontSize: '1.1rem', py: 1 }}
            />
          </Box>

          {/* Voice Button */}
          <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
            <IconButton
              onClick={handleVoiceButtonClick}
              disabled={isSpeaking}
              sx={{
                width: 120,
                height: 120,
                backgroundColor: isListening ? 'error.main' : 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: isListening ? 'error.dark' : 'primary.dark',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.3s ease',
                boxShadow: isListening ? '0 0 20px rgba(244, 67, 54, 0.4)' : '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
            >
              {isListening ? <MicOff sx={{ fontSize: 48 }} /> : <Mic sx={{ fontSize: 48 }} />}
            </IconButton>

            {/* Audio Level Visualization */}
            {isListening && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -10,
                  left: -10,
                  right: -10,
                  bottom: -10,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'error.main',
                  opacity: 0.3,
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: 0.3 },
                    '50%': { transform: 'scale(1.1)', opacity: 0.1 },
                    '100%': { transform: 'scale(1)', opacity: 0.3 },
                  },
                }}
              />
            )}
          </Box>

          {/* Audio Level Bar */}
          {isListening && (
            <Box sx={{ width: '100%', mb: 3 }}>
              <LinearProgress
                variant="determinate"
                value={audioLevel}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'error.main',
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          )}

          {/* Instructions */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isListening
              ? 'Speak now... I\'m listening to you!'
              : isSpeaking
              ? 'Speaking response...'
              : 'Tap the microphone to start talking with Gon'}
          </Typography>
        </CardContent>
      </Card>

      {/* Conversation Display */}
      <Grid container spacing={3}>
        {/* User Input */}
        {transcription && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, backgroundColor: 'primary.light', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'white', color: 'primary.main' }}>
                  {user?.name?.[0] || 'U'}
                </Avatar>
                <Typography variant="h6">You said:</Typography>
              </Box>
              <Typography variant="body1">{transcription}</Typography>
            </Paper>
          </Grid>
        )}

        {/* Assistant Response */}
        {response && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>🎭</Avatar>
                  <Typography variant="h6">Gon says:</Typography>
                </Box>
                <IconButton
                  onClick={handleSpeakClick}
                  color={isSpeaking ? 'error' : 'primary'}
                  disabled={!response}
                >
                  {isSpeaking ? <Stop /> : <PlayArrow />}
                </IconButton>
              </Box>
              <Typography variant="body1">{response}</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<History />}
          onClick={() => window.location.href = '/conversations'}
        >
          Conversation History
        </Button>
        <Button
          variant="outlined"
          startIcon={<Settings />}
          onClick={() => window.location.href = '/settings'}
        >
          Settings
        </Button>
      </Box>

      {/* Connection Status */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Chip
          label="Connected to Gon AI"
          color="success"
          size="small"
          sx={{ mr: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          Real-time voice processing with AI-powered responses
        </Typography>
      </Box>
    </Box>
  );
};

export default VoiceAssistant;
