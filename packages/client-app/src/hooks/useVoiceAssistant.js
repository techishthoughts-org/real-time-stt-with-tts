import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from 'react-query';
export const useVoiceAssistant = () => {
    const [state, setState] = useState({
        isListening: false,
        isSpeaking: false,
        transcription: '',
        response: '',
        error: null,
    });
    const queryClient = useQueryClient();
    // Web Speech API setup
    const [recognition, setRecognition] = useState(null);
    const [speechSynthesis, setSpeechSynthesis] = useState(null);
    useEffect(() => {
        // Initialize Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'pt-BR';
            recognitionInstance.onstart = () => {
                setState(prev => ({ ...prev, isListening: true, error: null }));
            };
            recognitionInstance.onend = () => {
                setState(prev => ({ ...prev, isListening: false }));
            };
            recognitionInstance.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    }
                    else {
                        interimTranscript += transcript;
                    }
                }
                setState(prev => ({
                    ...prev,
                    transcription: finalTranscript || interimTranscript,
                }));
                // If we have a final transcript, send it to the AI
                if (finalTranscript) {
                    sendMessage(finalTranscript);
                }
            };
            recognitionInstance.onerror = (event) => {
                setState(prev => ({
                    ...prev,
                    isListening: false,
                    error: `Speech recognition error: ${event.error}`,
                }));
            };
            setRecognition(recognitionInstance);
        }
        // Initialize Speech Synthesis
        if ('speechSynthesis' in window) {
            setSpeechSynthesis(window.speechSynthesis);
        }
    }, []);
    // Send message to AI
    const sendMessageMutation = useMutation(async (message) => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        return response.json();
    }, {
        onSuccess: (data) => {
            setState(prev => ({
                ...prev,
                response: data.response,
            }));
            // Auto-speak the response
            speak(data.response);
            // Invalidate conversations query
            queryClient.invalidateQueries(['conversations']);
        },
        onError: (error) => {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to send message',
            }));
        },
    });
    const sendMessage = useCallback((message) => {
        sendMessageMutation.mutate(message);
    }, [sendMessageMutation]);
    // Start listening
    const startListening = useCallback(() => {
        if (recognition && !state.isListening) {
            try {
                recognition.start();
            }
            catch {
                setState(prev => ({
                    ...prev,
                    error: 'Failed to start speech recognition',
                }));
            }
        }
    }, [recognition, state.isListening]);
    // Stop listening
    const stopListening = useCallback(() => {
        if (recognition && state.isListening) {
            try {
                recognition.stop();
            }
            catch {
                setState(prev => ({
                    ...prev,
                    error: 'Failed to stop speech recognition',
                }));
            }
        }
    }, [recognition, state.isListening]);
    // Speak text
    const speak = useCallback((text) => {
        if (speechSynthesis && text) {
            // Stop any current speech
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.onstart = () => {
                setState(prev => ({ ...prev, isSpeaking: true }));
            };
            utterance.onend = () => {
                setState(prev => ({ ...prev, isSpeaking: false }));
            };
            utterance.onerror = (event) => {
                setState(prev => ({
                    ...prev,
                    isSpeaking: false,
                    error: `Speech synthesis error: ${event.error}`,
                }));
            };
            speechSynthesis.speak(utterance);
        }
    }, [speechSynthesis]);
    // Stop speaking
    const stopSpeaking = useCallback(() => {
        if (speechSynthesis) {
            speechSynthesis.cancel();
            setState(prev => ({ ...prev, isSpeaking: false }));
        }
    }, [speechSynthesis]);
    // Clear error
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);
    return {
        // State
        isListening: state.isListening,
        isSpeaking: state.isSpeaking,
        transcription: state.transcription,
        response: state.response,
        error: state.error,
        // Actions
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        sendMessage,
        clearError,
        // Loading state
        isLoading: sendMessageMutation.isLoading,
    };
};
