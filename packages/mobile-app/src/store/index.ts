import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@voice/observability';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'enterprise';
  tenantId: string;
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface Conversation {
  id: string;
  userMessage: string;
  assistantResponse: string;
  timestamp: Date;
  confidence: number;
  language: string;
}

export interface AppSettings {
  autoSpeak: boolean;
  offlineMode: boolean;
  darkMode: boolean;
  language: string;
  voiceSpeed: number;
  voicePitch: number;
  notifications: boolean;
  hapticFeedback: boolean;
  biometricAuth: boolean;
}

export interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  sessionToken: string | null;
  
  // Voice assistant state
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  transcription: string;
  response: string;
  audioLevel: number;
  
  // Conversation state
  conversations: Conversation[];
  currentConversation: Conversation | null;
  
  // App state
  isLoading: boolean;
  error: string | null;
  settings: AppSettings;
  
  // Permissions
  permissions: {
    microphone: boolean;
    notifications: boolean;
    biometrics: boolean;
  };
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setSessionToken: (token: string | null) => void;
  setListening: (isListening: boolean) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  setTranscription: (transcription: string) => void;
  setResponse: (response: string) => void;
  setAudioLevel: (level: number) => void;
  addConversation: (conversation: Conversation) => void;
  clearConversations: () => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setPermission: (permission: keyof AppState['permissions'], granted: boolean) => void;
  reset: () => void;
}

// Default settings
const defaultSettings: AppSettings = {
  autoSpeak: true,
  offlineMode: false,
  darkMode: false,
  language: 'pt-BR',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  notifications: true,
  hapticFeedback: true,
  biometricAuth: false,
};

// Default permissions
const defaultPermissions = {
  microphone: false,
  notifications: false,
  biometrics: false,
};

// Create store
export const useAppStore = create<AppState>(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      sessionToken: null,
      isListening: false,
      isSpeaking: false,
      isConnected: false,
      transcription: '',
      response: '',
      audioLevel: 0,
      conversations: [],
      currentConversation: null,
      isLoading: false,
      error: null,
      settings: defaultSettings,
      permissions: defaultPermissions,

      // Actions
      setUser: (user) => {
        logger.info('Setting user', { userId: user?.id, email: user?.email });
        set({ user });
      },

      setAuthenticated: (isAuthenticated) => {
        logger.info('Setting authentication status', { isAuthenticated });
        set({ isAuthenticated });
      },

      setSessionToken: (sessionToken) => {
        logger.info('Setting session token', { hasToken: !!sessionToken });
        set({ sessionToken });
      },

      setListening: (isListening) => {
        logger.info('Setting listening status', { isListening });
        set({ isListening });
      },

      setSpeaking: (isSpeaking) => {
        logger.info('Setting speaking status', { isSpeaking });
        set({ isSpeaking });
      },

      setConnected: (isConnected) => {
        logger.info('Setting connection status', { isConnected });
        set({ isConnected });
      },

      setTranscription: (transcription) => {
        set({ transcription });
      },

      setResponse: (response) => {
        set({ response });
      },

      setAudioLevel: (audioLevel) => {
        set({ audioLevel });
      },

      addConversation: (conversation) => {
        const { conversations } = get();
        const updatedConversations = [conversation, ...conversations].slice(0, 100); // Keep last 100
        set({ conversations: updatedConversations });
        logger.info('Added conversation', { conversationId: conversation.id });
      },

      clearConversations: () => {
        set({ conversations: [] });
        logger.info('Cleared all conversations');
      },

      setCurrentConversation: (currentConversation) => {
        set({ currentConversation });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        if (error) {
          logger.error('App error', { error });
        }
        set({ error });
      },

      updateSettings: (newSettings) => {
        const { settings } = get();
        const updatedSettings = { ...settings, ...newSettings };
        set({ settings: updatedSettings });
        logger.info('Updated settings', { newSettings });
      },

      setPermission: (permission, granted) => {
        const { permissions } = get();
        const updatedPermissions = { ...permissions, [permission]: granted };
        set({ permissions: updatedPermissions });
        logger.info('Updated permission', { permission, granted });
      },

      reset: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionToken: null,
          isListening: false,
          isSpeaking: false,
          isConnected: false,
          transcription: '',
          response: '',
          audioLevel: 0,
          conversations: [],
          currentConversation: null,
          isLoading: false,
          error: null,
          settings: defaultSettings,
          permissions: defaultPermissions,
        });
        logger.info('Reset app state');
      },
    }),
    {
      name: 'gon-voice-assistant-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionToken: state.sessionToken,
        conversations: state.conversations,
        settings: state.settings,
        permissions: state.permissions,
      }),
      onRehydrateStorage: () => (state) => {
        logger.info('App state rehydrated', { 
          hasUser: !!state?.user,
          conversationCount: state?.conversations?.length || 0,
        });
      },
    }
  )
);

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useSessionToken = () => useAppStore((state) => state.sessionToken);
export const useVoiceState = () => useAppStore((state) => ({
  isListening: state.isListening,
  isSpeaking: state.isSpeaking,
  isConnected: state.isConnected,
  transcription: state.transcription,
  response: state.response,
  audioLevel: state.audioLevel,
}));
export const useConversations = () => useAppStore((state) => state.conversations);
export const useSettings = () => useAppStore((state) => state.settings);
export const usePermissions = () => useAppStore((state) => state.permissions);
export const useAppStatus = () => useAppStore((state) => ({
  isLoading: state.isLoading,
  error: state.error,
}));
