import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from 'react-query';
export const useVoiceAssistant = (userId = 'anonymous', voiceSettings, aiSettings) => {
    const [state, setState] = useState({
        isListening: false,
        isSpeaking: false,
        transcription: '',
        response: '',
        error: null,
        conversationId: null,
        isStreaming: false,
        partialResponse: '',
    });
    const queryClient = useQueryClient();
    const recognitionRef = useRef(null);
    const speechSynthesisRef = useRef(null);
    const eventSourceRef = useRef(null);
    // Default settings
    const defaultVoiceSettings = {
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        voice: 'default',
        language: 'pt-BR',
        ...voiceSettings,
    };
    const defaultAISettings = {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 150,
        persona: 'Gon',
        ...aiSettings,
    };
    // Initialize Web Speech API
    useEffect(() => {
        // Initialize Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = defaultVoiceSettings.language;
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
            recognitionRef.current = recognitionInstance;
        }
        // Initialize Speech Synthesis
        if ('speechSynthesis' in window) {
            speechSynthesisRef.current = window.speechSynthesis;
        }
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [defaultVoiceSettings.language]);
    // Send message to AI with conversation management
    const sendMessageMutation = useMutation(async (message) => {
        const response = await fetch('/api/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                conversationId: state.conversationId,
                userId,
                language: defaultVoiceSettings.language,
                voiceSettings: defaultVoiceSettings,
                aiSettings: defaultAISettings,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send message');
        }
        return response.json();
    }, {
        onSuccess: (data) => {
            setState(prev => ({
                ...prev,
                response: data.response,
                conversationId: data.conversationId,
                partialResponse: '',
            }));
            // Auto-speak the response
            speak(data.response);
            // Invalidate conversations query
            queryClient.invalidateQueries(['conversations', userId]);
        },
        onError: (error) => {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to send message',
            }));
        },
    });
    // Stream message to AI
    const streamMessageMutation = useMutation(async (message) => {
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`/api/chat/stream?message=${encodeURIComponent(message)}&userId=${userId}&conversationId=${state.conversationId || ''}`);
            eventSourceRef.current = eventSource;
            setState(prev => ({ ...prev, isStreaming: true, partialResponse: '' }));
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    switch (data.type) {
                        case 'stream_start':
                            console.log('Stream started:', data.streamId);
                            break;
                        case 'chunk':
                            setState(prev => ({
                                ...prev,
                                partialResponse: data.partial,
                                response: data.partial,
                            }));
                            break;
                        case 'stream_end':
                            setState(prev => ({
                                ...prev,
                                isStreaming: false,
                                conversationId: data.conversationId,
                            }));
                            eventSource.close();
                            resolve();
                            break;
                        case 'error':
                            setState(prev => ({
                                ...prev,
                                isStreaming: false,
                                error: data.error,
                            }));
                            eventSource.close();
                            reject(new Error(data.error));
                            break;
                    }
                }
                catch (error) {
                    eventSource.close();
                    reject(error);
                }
            };
            eventSource.onerror = (error) => {
                setState(prev => ({ ...prev, isStreaming: false }));
                eventSource.close();
                reject(error);
            };
        });
    }, {
        onSuccess: () => {
            // Invalidate conversations query
            queryClient.invalidateQueries(['conversations', userId]);
        },
        onError: (error) => {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to stream message',
            }));
        },
    });
    const sendMessage = useCallback((message, useStreaming = false) => {
        if (useStreaming) {
            streamMessageMutation.mutate(message);
        }
        else {
            sendMessageMutation.mutate(message);
        }
    }, [sendMessageMutation, streamMessageMutation]);
    // Start listening
    const startListening = useCallback(() => {
        if (recognitionRef.current && !state.isListening) {
            try {
                recognitionRef.current.start();
            }
            catch (error) {
                setState(prev => ({
                    ...prev,
                    error: 'Failed to start speech recognition',
                }));
            }
        }
    }, [state.isListening]);
    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current && state.isListening) {
            try {
                recognitionRef.current.stop();
            }
            catch (error) {
                setState(prev => ({
                    ...prev,
                    error: 'Failed to stop speech recognition',
                }));
            }
        }
    }, [state.isListening]);
    // Speak text with enhanced settings
    const speak = useCallback((text) => {
        if (speechSynthesisRef.current && text) {
            // Stop any current speech
            speechSynthesisRef.current.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = defaultVoiceSettings.language;
            utterance.rate = defaultVoiceSettings.rate;
            utterance.pitch = defaultVoiceSettings.pitch;
            utterance.volume = defaultVoiceSettings.volume;
            // Try to set voice if available
            const voices = speechSynthesisRef.current.getVoices();
            const preferredVoice = voices.find(voice => voice.lang.includes(defaultVoiceSettings.language.split('-')[0]));
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
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
            speechSynthesisRef.current.speak(utterance);
        }
    }, [defaultVoiceSettings]);
    // Stop speaking
    const stopSpeaking = useCallback(() => {
        if (speechSynthesisRef.current) {
            speechSynthesisRef.current.cancel();
            setState(prev => ({ ...prev, isSpeaking: false }));
        }
    }, []);
    // Clear error
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);
    // Clear conversation
    const clearConversation = useCallback(() => {
        setState(prev => ({
            ...prev,
            conversationId: null,
            transcription: '',
            response: '',
            partialResponse: '',
        }));
    }, []);
    // Get conversation history
    const { data: conversations, isLoading: conversationsLoading } = useQuery(['conversations', userId], async () => {
        const response = await fetch(`/api/chat/conversations/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch conversations');
        }
        return response.json();
    }, {
        enabled: !!userId && userId !== 'anonymous',
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
    // Get chat statistics
    const { data: stats } = useQuery(['chat-stats', userId], async () => {
        const response = await fetch(`/api/chat/stats/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch chat stats');
        }
        return response.json();
    }, {
        enabled: !!userId && userId !== 'anonymous',
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
    return {
        // State
        isListening: state.isListening,
        isSpeaking: state.isSpeaking,
        isStreaming: state.isStreaming,
        transcription: state.transcription,
        response: state.response,
        partialResponse: state.partialResponse,
        error: state.error,
        conversationId: state.conversationId,
        // Actions
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        sendMessage,
        clearError,
        clearConversation,
        // Data
        conversations: conversations?.conversations || [],
        stats,
        // Loading states
        isLoading: sendMessageMutation.isLoading,
        conversationsLoading,
        // Settings
        voiceSettings: defaultVoiceSettings,
        aiSettings: defaultAISettings,
    };
};
