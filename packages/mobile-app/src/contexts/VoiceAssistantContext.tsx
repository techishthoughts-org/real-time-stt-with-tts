import React, { createContext, useContext, useEffect, useReducer } from 'react';
import Tts from 'react-native-tts';
import Voice from 'react-native-voice';

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
    // Initialize voice recognition
    Voice.onSpeechStart = () => dispatch({ type: 'START_LISTENING' });
    Voice.onSpeechEnd = () => dispatch({ type: 'STOP_LISTENING' });
    Voice.onSpeechResults = (event) => {
      if (event.value && event.value.length > 0) {
        const transcription = event.value[0];
        dispatch({ type: 'SET_TRANSCRIPTION', payload: transcription });
        handleVoiceInput(transcription);
      }
    };
    Voice.onSpeechError = (event) => {
      dispatch({ type: 'SET_ERROR', payload: event.error?.message || 'Speech recognition error' });
    };

    // Initialize TTS
    Tts.setDefaultLanguage('pt-BR');
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(1.0);
    Tts.onTtsStart = () => dispatch({ type: 'START_SPEAKING' });
    Tts.onTtsFinish = () => dispatch({ type: 'STOP_SPEAKING' });
    Tts.onTtsError = (event) => {
      dispatch({ type: 'SET_ERROR', payload: event.error || 'TTS error' });
    };

    // Check server connection
    checkServerConnection();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-error');
    };
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      dispatch({ type: 'SET_CONNECTED', payload: data.status === 'ok' });
    } catch (error) {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Server connection failed' });
    }
  };

  const handleVoiceInput = async (transcription: string) => {
    try {
      await sendMessage(transcription);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to process voice input' });
    }
  };

  const startListening = async () => {
    try {
      await Voice.start('pt-BR');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start voice recognition' });
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to stop voice recognition' });
    }
  };

  const speak = async (text: string) => {
    try {
      await Tts.speak(text);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to speak text' });
    }
  };

  const stopSpeaking = async () => {
    try {
      await Tts.stop();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to stop speaking' });
    }
  };

  const sendMessage = async (message: string) => {
    try {
      const response = await fetch('http://localhost:3000/llm/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token', // In production, use real auth
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      const assistantResponse = data.response?.response || data.response || 'Sorry, I could not process your request.';

      dispatch({ type: 'SET_RESPONSE', payload: assistantResponse });
      dispatch({
        type: 'ADD_CONVERSATION',
        payload: { userMessage: message, assistantResponse }
      });

      // Speak the response
      await speak(assistantResponse);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
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

export const useVoiceAssistant = (): VoiceAssistantContextType => {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
};
