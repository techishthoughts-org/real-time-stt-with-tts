import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, IconButton, Chip, LinearProgress, Paper, Grid, Avatar, } from '@mui/material';
import { Mic, MicOff, VolumeUp, PlayArrow, Stop, Settings, History, } from '@mui/icons-material';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useAuth } from '../hooks/useAuth';
const VoiceAssistant = ({ isListening, isSpeaking, transcription, response, }) => {
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
        }
        else {
            setAudioLevel(0);
        }
    }, [isListening]);
    const handleVoiceButtonClick = () => {
        if (isListening) {
            stopListening();
        }
        else {
            startListening();
        }
    };
    const handleSpeakClick = () => {
        if (isSpeaking) {
            stopSpeaking();
        }
        else if (response) {
            speak(response);
        }
    };
    return (_jsxs(Box, { sx: { maxWidth: 800, mx: 'auto' }, children: [_jsxs(Box, { sx: { textAlign: 'center', mb: 4 }, children: [_jsx(Typography, { variant: "h3", component: "h1", gutterBottom: true, children: "\uD83C\uDFAD Gon Voice Assistant" }), _jsx(Typography, { variant: "body1", color: "text.secondary", children: "Your personal AI companion with Brazilian Portuguese personality" })] }), _jsx(Card, { sx: { mb: 3, position: 'relative', overflow: 'visible' }, children: _jsxs(CardContent, { sx: { p: 4, textAlign: 'center' }, children: [_jsx(Box, { sx: { mb: 3 }, children: _jsx(Chip, { label: isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready', color: isListening ? 'error' : isSpeaking ? 'success' : 'default', icon: isListening ? _jsx(Mic, {}) : isSpeaking ? _jsx(VolumeUp, {}) : _jsx(Mic, {}), sx: { fontSize: '1.1rem', py: 1 } }) }), _jsxs(Box, { sx: { position: 'relative', display: 'inline-block', mb: 3 }, children: [_jsx(IconButton, { onClick: handleVoiceButtonClick, disabled: isSpeaking, sx: {
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
                                    }, children: isListening ? _jsx(MicOff, { sx: { fontSize: 48 } }) : _jsx(Mic, { sx: { fontSize: 48 } }) }), isListening && (_jsx(Box, { sx: {
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
                                    } }))] }), isListening && (_jsx(Box, { sx: { width: '100%', mb: 3 }, children: _jsx(LinearProgress, { variant: "determinate", value: audioLevel, sx: {
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                        backgroundColor: 'error.main',
                                        borderRadius: 4,
                                    },
                                } }) })), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: isListening
                                ? 'Speak now... I\'m listening to you!'
                                : isSpeaking
                                    ? 'Speaking response...'
                                    : 'Tap the microphone to start talking with Gon' })] }) }), _jsxs(Grid, { container: true, spacing: 3, children: [transcription && (_jsx(Grid, { item: true, xs: 12, children: _jsxs(Paper, { sx: { p: 3, backgroundColor: 'primary.light', color: 'white' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Avatar, { sx: { mr: 2, bgcolor: 'white', color: 'primary.main' }, children: user?.name?.[0] || 'U' }), _jsx(Typography, { variant: "h6", children: "You said:" })] }), _jsx(Typography, { variant: "body1", children: transcription })] }) })), response && (_jsx(Grid, { item: true, xs: 12, children: _jsxs(Paper, { sx: { p: 3, backgroundColor: 'grey.50' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(Avatar, { sx: { mr: 2, bgcolor: 'secondary.main' }, children: "\uD83C\uDFAD" }), _jsx(Typography, { variant: "h6", children: "Gon says:" })] }), _jsx(IconButton, { onClick: handleSpeakClick, color: isSpeaking ? 'error' : 'primary', disabled: !response, children: isSpeaking ? _jsx(Stop, {}) : _jsx(PlayArrow, {}) })] }), _jsx(Typography, { variant: "body1", children: response })] }) }))] }), _jsxs(Box, { sx: { mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(History, {}), onClick: () => window.location.href = '/conversations', children: "Conversation History" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(Settings, {}), onClick: () => window.location.href = '/settings', children: "Settings" })] }), _jsxs(Box, { sx: { mt: 4, textAlign: 'center' }, children: [_jsx(Chip, { label: "Connected to Gon AI", color: "success", size: "small", sx: { mr: 1 } }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "Real-time voice processing with AI-powered responses" })] })] }));
};
export default VoiceAssistant;
