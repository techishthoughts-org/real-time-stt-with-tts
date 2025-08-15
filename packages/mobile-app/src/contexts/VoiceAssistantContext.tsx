import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { Platform } from 'react-native';
import { voiceService } from '../services/platformVoiceService';
import { logger } from '@voice/observability';

interface VoiceAssistantState {
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  transcription: string;
  response: string;
  error: string | null;
  conversationHistory: Array<{
    id: string;
    timestamp: Date;
    userMessage: string;
    assistantResponse: string;
  }>;
}

type VoiceAssistantAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_TRANSCRIPTION'; payload: string }
  | { type: 'SET_RESPONSE'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'START_SPEAKING' }
  | { type: 'STOP_SPEAKING' }
  | { type: 'ADD_CONVERSATION'; payload: { userMessage: string; assistantResponse: string } }
  | { type: 'CLEAR_ERROR' };

const initialState: VoiceAssistantState = {
  isListening: false,
  isSpeaking: false,
  isConnected: false,
  transcription: '',
  response: '',
  error: null,
  conversationHistory: [],
};

const voiceAssistantReducer = (state: VoiceAssistantState, action: VoiceAssistantAction): VoiceAssistantState => {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, isListening: true, error: null };
    case 'STOP_LISTENING':
      return { ...state, isListening: false };
    case 'SET_TRANSCRIPTION':
      return { ...state, transcription: action.payload };
    case 'SET_RESPONSE':
      return { ...state, response: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isListening: false, isSpeaking: false };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'START_SPEAKING':
      return { ...state, isSpeaking: true };
    case 'STOP_SPEAKING':
      return { ...state, isSpeaking: false };
    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversationHistory: [
          ...state.conversationHistory,
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            userMessage: action.payload.userMessage,
            assistantResponse: action.payload.assistantResponse,
          },
        ],
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

interface VoiceAssistantContextType {
  state: VoiceAssistantState;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  clearError: () => void;
  sendMessage: (message: string) => Promise<void>;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(voiceAssistantReducer, initialState);

  useEffect(() => {
    // Set up voice service callbacks
    if (Platform.OS === 'web') {
      // For web, set up callbacks for the web voice service
      const webVoiceService = voiceService as any;
      if (webVoiceService.setTranscriptionCallback) {
        webVoiceService.setTranscriptionCallback((text: string) => {
          dispatch({ type: 'SET_TRANSCRIPTION', payload: text });
        });
      }
      if (webVoiceService.setErrorCallback) {
        webVoiceService.setErrorCallback((error: string) => {
          dispatch({ type: 'SET_ERROR', payload: error });
        });
      }
    } else {
      // For native platforms, set up native event listeners
      const setupNativeListeners = async () => {
        try {
          const { Voice } = await import('@react-native-community/voice');
          const Tts = await import('react-native-tts');

          Voice.onSpeechStart = () => dispatch({ type: 'START_LISTENING' });
          Voice.onSpeechEnd = () => dispatch({ type: 'STOP_LISTENING' });
          Voice.onSpeechResults = (event) => {
            if (event.value && event.value.length > 0) {
              dispatch({ type: 'SET_TRANSCRIPTION', payload: event.value[0] });
            }
          };
          Voice.onSpeechError = (event) => {
            logger.error('Speech recognition error:', event);
            dispatch({ type: 'SET_ERROR', payload: event.error?.message || 'Speech recognition failed' });
          };

          Tts.default.on('tts-start', () => dispatch({ type: 'START_SPEAKING' }));
          Tts.default.on('tts-finish', () => dispatch({ type: 'STOP_SPEAKING' }));
          Tts.default.on('tts-cancel', () => dispatch({ type: 'STOP_SPEAKING' }));
          Tts.default.on('tts-error', (event) => {
            logger.error('TTS error:', event);
            dispatch({ type: 'SET_ERROR', payload: 'Text-to-speech failed' });
          });
        } catch (error) {
          logger.error('Failed to setup native voice listeners:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize voice services' });
        }
      };

      setupNativeListeners();
    }

    // Check initial connection
    dispatch({ type: 'SET_CONNECTED', payload: true });

    return () => {
      // Cleanup
      if (Platform.OS !== 'web') {
        const cleanup = async () => {
          try {
            const { Voice } = await import('@react-native-community/voice');
            Voice.destroy().then(Voice.removeAllListeners);
          } catch (error) {
            logger.error('Failed to cleanup voice listeners:', error);
          }
        };
        cleanup();
      }
    };
  }, []);

  const startListening = async () => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await voiceService.startListening();
      logger.info('Started listening');
    } catch (error) {
      logger.error('Failed to start listening:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start listening' });
    }
  };

  const stopListening = async () => {
    try {
      await voiceService.stopListening();
      logger.info('Stopped listening');
    } catch (error) {
      logger.error('Failed to stop listening:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to stop listening' });
    }
  };

  const speak = async (text: string) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await voiceService.speak(text);
      logger.info('Started speaking:', text);
    } catch (error) {
      logger.error('Failed to speak:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to speak' });
    }
  };

  const stopSpeaking = async () => {
    try {
      await voiceService.stopSpeaking();
      logger.info('Stopped speaking');
    } catch (error) {
      logger.error('Failed to stop speaking:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to stop speaking' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const sendMessage = async (message: string) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      
      // Simulate AI response (replace with actual API call)
      const response = `I received your message: "${message}". This is a simulated response.`;
      
      dispatch({ type: 'SET_RESPONSE', payload: response });
      dispatch({ 
        type: 'ADD_CONVERSATION', 
        payload: { userMessage: message, assistantResponse: response } 
      });

      // Speak the response
      await speak(response);
      
      logger.info('Message sent and response received');
    } catch (error) {
      logger.error('Failed to send message:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    }
  };

  const value: VoiceAssistantContextType = {
    state,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError,
    sendMessage,
  };

  return (
    <VoiceAssistantContext.Provider value={value}>
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
};
