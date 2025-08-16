import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  Settings,
  History,
  Clear,
  PlayArrow,
  Stop,
  Refresh,
  Speed,
  Language,
  Person,
} from '@mui/icons-material';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useAuth } from '../hooks/useAuth';

interface VoiceAssistantProps {
  userId?: string;
  onSettingsChange?: (settings: any) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  userId = 'anonymous',
  onSettingsChange,
}) => {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,
    language: 'pt-BR',
  });
  const [aiSettings, setAiSettings] = useState({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 150,
    persona: 'Gon',
  });

  const {
    isListening,
    isSpeaking,
    isStreaming,
    transcription,
    response,
    partialResponse,
    error,
    conversationId,
    conversations,
    stats,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    sendMessage,
    clearError,
    clearConversation,
    isLoading,
    conversationsLoading,
  } = useVoiceAssistant(user?.id || userId, voiceSettings, aiSettings);

  const handleStartListening = useCallback(() => {
    clearError();
    startListening();
  }, [startListening, clearError]);

  const handleStopListening = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handleSendMessage = useCallback((message: string) => {
    sendMessage(message, useStreaming);
  }, [sendMessage, useStreaming]);

  const handleSpeak = useCallback((text: string) => {
    speak(text);
  }, [speak]);

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
  }, [stopSpeaking]);

  const handleClearConversation = useCallback(() => {
    clearConversation();
  }, [clearConversation]);

  const handleVoiceSettingsChange = useCallback((newSettings: typeof voiceSettings) => {
    setVoiceSettings(newSettings);
    onSettingsChange?.({ voice: newSettings, ai: aiSettings });
  }, [onSettingsChange, aiSettings]);

  const handleAISettingsChange = useCallback((newSettings: typeof aiSettings) => {
    setAiSettings(newSettings);
    onSettingsChange?.({ voice: voiceSettings, ai: newSettings });
  }, [onSettingsChange, voiceSettings]);

  const displayText = isStreaming ? partialResponse : response;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Voice Assistant Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
              Gon Voice Assistant
            </Typography>
            <IconButton onClick={() => setShowHistory(true)} disabled={conversationsLoading}>
              <History />
            </IconButton>
            <IconButton onClick={() => setShowSettings(true)}>
              <Settings />
            </IconButton>
          </Box>

          {/* Status Indicators */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {isListening && (
              <Chip
                icon={<Mic />}
                label="Listening"
                color="primary"
                variant="outlined"
              />
            )}
            {isSpeaking && (
              <Chip
                icon={<VolumeUp />}
                label="Speaking"
                color="secondary"
                variant="outlined"
              />
            )}
            {isStreaming && (
              <Chip
                icon={<Speed />}
                label="Streaming"
                color="info"
                variant="outlined"
              />
            )}
            {conversationId && (
              <Chip
                label={`Conversation: ${conversationId.slice(-8)}`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          {/* Loading Progress */}
          {(isLoading || isStreaming) && (
            <LinearProgress sx={{ mb: 2 }} />
          )}

          {/* Transcription Display */}
          {transcription && (
            <Card variant="outlined" sx={{ mb: 2, bgcolor: 'grey.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  You said:
                </Typography>
                <Typography variant="body1">{transcription}</Typography>
              </CardContent>
            </Card>
          )}

          {/* AI Response Display */}
          {displayText && (
            <Card variant="outlined" sx={{ mb: 2, bgcolor: 'primary.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    Gon's Response:
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleSpeak(displayText)}
                    disabled={isSpeaking}
                  >
                    <PlayArrow />
                  </IconButton>
                  {isSpeaking && (
                    <IconButton size="small" onClick={handleStopSpeaking}>
                      <Stop />
                    </IconButton>
                  )}
                </Box>
                <Typography variant="body1">{displayText}</Typography>
              </CardContent>
            </Card>
          )}

          {/* Control Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={isListening ? <MicOff /> : <Mic />}
              onClick={isListening ? handleStopListening : handleStartListening}
              disabled={isLoading || isStreaming}
              sx={{ minWidth: 120 }}
            >
              {isListening ? 'Stop' : 'Listen'}
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<Clear />}
              onClick={handleClearConversation}
              disabled={!conversationId && !transcription && !response}
            >
              Clear
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Reset
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      {stats && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Chat Statistics
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`${stats.totalConversations} Conversations`} />
              <Chip label={`${stats.totalMessages} Messages`} />
              <Chip label={`${stats.totalTokens} Tokens`} />
              <Chip label={`${stats.avgMessagesPerConversation} Avg/Conv`} />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="md" fullWidth>
        <DialogTitle>Voice Assistant Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 1 }}>
            {/* Voice Settings */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Voice Settings
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Language</InputLabel>
                <Select
                  value={voiceSettings.language}
                  onChange={(e) => handleVoiceSettingsChange({
                    ...voiceSettings,
                    language: e.target.value
                  })}
                >
                  <MenuItem value="pt-BR">Portuguese (Brazil)</MenuItem>
                  <MenuItem value="en-US">English (US)</MenuItem>
                  <MenuItem value="es-ES">Spanish (Spain)</MenuItem>
                  <MenuItem value="fr-FR">French (France)</MenuItem>
                  <MenuItem value="de-DE">German (Germany)</MenuItem>
                </Select>
              </FormControl>

              <Typography gutterBottom>Speech Rate</Typography>
              <Slider
                value={voiceSettings.rate}
                onChange={(_, value) => handleVoiceSettingsChange({
                  ...voiceSettings,
                  rate: value as number
                })}
                min={0.5}
                max={2.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />

              <Typography gutterBottom>Pitch</Typography>
              <Slider
                value={voiceSettings.pitch}
                onChange={(_, value) => handleVoiceSettingsChange({
                  ...voiceSettings,
                  pitch: value as number
                })}
                min={0.5}
                max={2.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />

              <Typography gutterBottom>Volume</Typography>
              <Slider
                value={voiceSettings.volume}
                onChange={(_, value) => handleVoiceSettingsChange({
                  ...voiceSettings,
                  volume: value as number
                })}
                min={0.0}
                max={1.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            {/* AI Settings */}
            <Box>
              <Typography variant="h6" gutterBottom>
                AI Settings
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Model</InputLabel>
                <Select
                  value={aiSettings.model}
                  onChange={(e) => handleAISettingsChange({
                    ...aiSettings,
                    model: e.target.value
                  })}
                >
                  <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                  <MenuItem value="gpt-4">GPT-4</MenuItem>
                  <MenuItem value="claude-3-sonnet">Claude 3 Sonnet</MenuItem>
                  <MenuItem value="llama-2-70b">Llama 2 70B</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Persona</InputLabel>
                <Select
                  value={aiSettings.persona}
                  onChange={(e) => handleAISettingsChange({
                    ...aiSettings,
                    persona: e.target.value
                  })}
                >
                  <MenuItem value="Gon">Gon (Friendly Assistant)</MenuItem>
                  <MenuItem value="Professional">Professional</MenuItem>
                  <MenuItem value="Casual">Casual</MenuItem>
                  <MenuItem value="Creative">Creative</MenuItem>
                </Select>
              </FormControl>

              <Typography gutterBottom>Temperature (Creativity)</Typography>
              <Slider
                value={aiSettings.temperature}
                onChange={(_, value) => handleAISettingsChange({
                  ...aiSettings,
                  temperature: value as number
                })}
                min={0.0}
                max={2.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />

              <Typography gutterBottom>Max Tokens</Typography>
              <Slider
                value={aiSettings.maxTokens}
                onChange={(_, value) => handleAISettingsChange({
                  ...aiSettings,
                  maxTokens: value as number
                })}
                min={50}
                max={500}
                step={10}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={useStreaming}
                    onChange={(e) => setUseStreaming(e.target.checked)}
                  />
                }
                label="Use Streaming Responses"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Conversation History Dialog */}
      <Dialog open={showHistory} onClose={() => setShowHistory(false)} maxWidth="md" fullWidth>
        <DialogTitle>Conversation History</DialogTitle>
        <DialogContent>
          {conversationsLoading ? (
            <LinearProgress />
          ) : conversations.length > 0 ? (
            <List>
              {conversations.map((conversation: any, index: number) => (
                <React.Fragment key={conversation.id}>
                  <ListItem>
                    <ListItemText
                      primary={`Conversation ${conversation.id.slice(-8)}`}
                      secondary={`${conversation.messages.length} messages • ${new Date(conversation.updatedAt).toLocaleDateString()}`}
                    />
                    <Chip
                      label={conversation.metadata?.language || 'Unknown'}
                      size="small"
                      variant="outlined"
                    />
                  </ListItem>
                  {index < conversations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No conversations yet. Start talking to Gon!
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
