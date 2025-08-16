import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { Box, Button, Card, CardContent, Typography, IconButton, Chip, LinearProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider, Switch, FormControlLabel, Slider, Select, MenuItem, FormControl, InputLabel, } from '@mui/material';
import { Mic, MicOff, VolumeUp, Settings, History, Clear, PlayArrow, Stop, Refresh, Speed, } from '@mui/icons-material';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useAuth } from '../hooks/useAuth';
export const VoiceAssistant = ({ userId = 'anonymous', onSettingsChange, }) => {
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
    const { isListening, isSpeaking, isStreaming, transcription, response, partialResponse, error, conversationId, conversations, stats, startListening, stopListening, speak, stopSpeaking, sendMessage, clearError, clearConversation, isLoading, conversationsLoading, } = useVoiceAssistant(user?.id || userId, voiceSettings, aiSettings);
    const handleStartListening = useCallback(() => {
        clearError();
        startListening();
    }, [startListening, clearError]);
    const handleStopListening = useCallback(() => {
        stopListening();
    }, [stopListening]);
    const handleSendMessage = useCallback((message) => {
        sendMessage(message, useStreaming);
    }, [sendMessage, useStreaming]);
    const handleSpeak = useCallback((text) => {
        speak(text);
    }, [speak]);
    const handleStopSpeaking = useCallback(() => {
        stopSpeaking();
    }, [stopSpeaking]);
    const handleClearConversation = useCallback(() => {
        clearConversation();
    }, [clearConversation]);
    const handleVoiceSettingsChange = useCallback((newSettings) => {
        setVoiceSettings(newSettings);
        onSettingsChange?.({ voice: newSettings, ai: aiSettings });
    }, [onSettingsChange, aiSettings]);
    const handleAISettingsChange = useCallback((newSettings) => {
        setAiSettings(newSettings);
        onSettingsChange?.({ voice: voiceSettings, ai: newSettings });
    }, [onSettingsChange, voiceSettings]);
    const displayText = isStreaming ? partialResponse : response;
    return (_jsxs(Box, { sx: { maxWidth: 800, mx: 'auto', p: 2 }, children: [error && (_jsx(Alert, { severity: "error", onClose: clearError, sx: { mb: 2 }, children: error })), _jsx(Card, { sx: { mb: 2 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h5", component: "h2", sx: { flexGrow: 1 }, children: "Gon Voice Assistant" }), _jsx(IconButton, { onClick: () => setShowHistory(true), disabled: conversationsLoading, children: _jsx(History, {}) }), _jsx(IconButton, { onClick: () => setShowSettings(true), children: _jsx(Settings, {}) })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }, children: [isListening && (_jsx(Chip, { icon: _jsx(Mic, {}), label: "Listening", color: "primary", variant: "outlined" })), isSpeaking && (_jsx(Chip, { icon: _jsx(VolumeUp, {}), label: "Speaking", color: "secondary", variant: "outlined" })), isStreaming && (_jsx(Chip, { icon: _jsx(Speed, {}), label: "Streaming", color: "info", variant: "outlined" })), conversationId && (_jsx(Chip, { label: `Conversation: ${conversationId.slice(-8)}`, variant: "outlined", size: "small" }))] }), (isLoading || isStreaming) && (_jsx(LinearProgress, { sx: { mb: 2 } })), transcription && (_jsx(Card, { variant: "outlined", sx: { mb: 2, bgcolor: 'grey.50' }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "You said:" }), _jsx(Typography, { variant: "body1", children: transcription })] }) })), displayText && (_jsx(Card, { variant: "outlined", sx: { mb: 2, bgcolor: 'primary.50' }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 1 }, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", sx: { flexGrow: 1 }, children: "Gon's Response:" }), _jsx(IconButton, { size: "small", onClick: () => handleSpeak(displayText), disabled: isSpeaking, children: _jsx(PlayArrow, {}) }), isSpeaking && (_jsx(IconButton, { size: "small", onClick: handleStopSpeaking, children: _jsx(Stop, {}) }))] }), _jsx(Typography, { variant: "body1", children: displayText })] }) })), _jsxs(Box, { sx: { display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }, children: [_jsx(Button, { variant: "contained", size: "large", startIcon: isListening ? _jsx(MicOff, {}) : _jsx(Mic, {}), onClick: isListening ? handleStopListening : handleStartListening, disabled: isLoading || isStreaming, sx: { minWidth: 120 }, children: isListening ? 'Stop' : 'Listen' }), _jsx(Button, { variant: "outlined", size: "large", startIcon: _jsx(Clear, {}), onClick: handleClearConversation, disabled: !conversationId && !transcription && !response, children: "Clear" }), _jsx(Button, { variant: "outlined", size: "large", startIcon: _jsx(Refresh, {}), onClick: () => window.location.reload(), children: "Reset" })] })] }) }), stats && (_jsx(Card, { sx: { mb: 2 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Chat Statistics" }), _jsxs(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap' }, children: [_jsx(Chip, { label: `${stats.totalConversations} Conversations` }), _jsx(Chip, { label: `${stats.totalMessages} Messages` }), _jsx(Chip, { label: `${stats.totalTokens} Tokens` }), _jsx(Chip, { label: `${stats.avgMessagesPerConversation} Avg/Conv` })] })] }) })), _jsxs(Dialog, { open: showSettings, onClose: () => setShowSettings(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "Voice Assistant Settings" }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 1 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Voice Settings" }), _jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [_jsx(InputLabel, { children: "Language" }), _jsxs(Select, { value: voiceSettings.language, onChange: (e) => handleVoiceSettingsChange({
                                                        ...voiceSettings,
                                                        language: e.target.value
                                                    }), children: [_jsx(MenuItem, { value: "pt-BR", children: "Portuguese (Brazil)" }), _jsx(MenuItem, { value: "en-US", children: "English (US)" }), _jsx(MenuItem, { value: "es-ES", children: "Spanish (Spain)" }), _jsx(MenuItem, { value: "fr-FR", children: "French (France)" }), _jsx(MenuItem, { value: "de-DE", children: "German (Germany)" })] })] }), _jsx(Typography, { gutterBottom: true, children: "Speech Rate" }), _jsx(Slider, { value: voiceSettings.rate, onChange: (_, value) => handleVoiceSettingsChange({
                                                ...voiceSettings,
                                                rate: value
                                            }), min: 0.5, max: 2.0, step: 0.1, marks: true, valueLabelDisplay: "auto", sx: { mb: 2 } }), _jsx(Typography, { gutterBottom: true, children: "Pitch" }), _jsx(Slider, { value: voiceSettings.pitch, onChange: (_, value) => handleVoiceSettingsChange({
                                                ...voiceSettings,
                                                pitch: value
                                            }), min: 0.5, max: 2.0, step: 0.1, marks: true, valueLabelDisplay: "auto", sx: { mb: 2 } }), _jsx(Typography, { gutterBottom: true, children: "Volume" }), _jsx(Slider, { value: voiceSettings.volume, onChange: (_, value) => handleVoiceSettingsChange({
                                                ...voiceSettings,
                                                volume: value
                                            }), min: 0.0, max: 1.0, step: 0.1, marks: true, valueLabelDisplay: "auto" })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "AI Settings" }), _jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [_jsx(InputLabel, { children: "Model" }), _jsxs(Select, { value: aiSettings.model, onChange: (e) => handleAISettingsChange({
                                                        ...aiSettings,
                                                        model: e.target.value
                                                    }), children: [_jsx(MenuItem, { value: "gpt-3.5-turbo", children: "GPT-3.5 Turbo" }), _jsx(MenuItem, { value: "gpt-4", children: "GPT-4" }), _jsx(MenuItem, { value: "claude-3-sonnet", children: "Claude 3 Sonnet" }), _jsx(MenuItem, { value: "llama-2-70b", children: "Llama 2 70B" })] })] }), _jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [_jsx(InputLabel, { children: "Persona" }), _jsxs(Select, { value: aiSettings.persona, onChange: (e) => handleAISettingsChange({
                                                        ...aiSettings,
                                                        persona: e.target.value
                                                    }), children: [_jsx(MenuItem, { value: "Gon", children: "Gon (Friendly Assistant)" }), _jsx(MenuItem, { value: "Professional", children: "Professional" }), _jsx(MenuItem, { value: "Casual", children: "Casual" }), _jsx(MenuItem, { value: "Creative", children: "Creative" })] })] }), _jsx(Typography, { gutterBottom: true, children: "Temperature (Creativity)" }), _jsx(Slider, { value: aiSettings.temperature, onChange: (_, value) => handleAISettingsChange({
                                                ...aiSettings,
                                                temperature: value
                                            }), min: 0.0, max: 2.0, step: 0.1, marks: true, valueLabelDisplay: "auto", sx: { mb: 2 } }), _jsx(Typography, { gutterBottom: true, children: "Max Tokens" }), _jsx(Slider, { value: aiSettings.maxTokens, onChange: (_, value) => handleAISettingsChange({
                                                ...aiSettings,
                                                maxTokens: value
                                            }), min: 50, max: 500, step: 10, marks: true, valueLabelDisplay: "auto", sx: { mb: 2 } }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: useStreaming, onChange: (e) => setUseStreaming(e.target.checked) }), label: "Use Streaming Responses" })] })] }) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setShowSettings(false), children: "Close" }) })] }), _jsxs(Dialog, { open: showHistory, onClose: () => setShowHistory(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "Conversation History" }), _jsx(DialogContent, { children: conversationsLoading ? (_jsx(LinearProgress, {})) : conversations.length > 0 ? (_jsx(List, { children: conversations.map((conversation, index) => (_jsxs(React.Fragment, { children: [_jsxs(ListItem, { children: [_jsx(ListItemText, { primary: `Conversation ${conversation.id.slice(-8)}`, secondary: `${conversation.messages.length} messages • ${new Date(conversation.updatedAt).toLocaleDateString()}` }), _jsx(Chip, { label: conversation.metadata?.language || 'Unknown', size: "small", variant: "outlined" })] }), index < conversations.length - 1 && _jsx(Divider, {})] }, conversation.id))) })) : (_jsx(Typography, { color: "text.secondary", align: "center", sx: { py: 4 }, children: "No conversations yet. Start talking to Gon!" })) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setShowHistory(false), children: "Close" }) })] })] }));
};
