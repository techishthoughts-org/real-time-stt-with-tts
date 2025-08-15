import { act, renderHook } from '@testing-library/react-native';
import { useAppStore } from '../store';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock logger
jest.mock('@voice/observability', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('App Store', () => {
  beforeEach(() => {
    // Clear store state before each test
    act(() => {
      useAppStore.getState().reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.sessionToken).toBeNull();
      expect(result.current.isListening).toBe(false);
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.transcription).toBe('');
      expect(result.current.response).toBe('');
      expect(result.current.audioLevel).toBe(0);
      expect(result.current.conversations).toEqual([]);
      expect(result.current.currentConversation).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.settings).toEqual({
        autoSpeak: true,
        offlineMode: false,
        darkMode: false,
        language: 'pt-BR',
        voiceSpeed: 1.0,
        voicePitch: 1.0,
        notifications: true,
        hapticFeedback: true,
        biometricAuth: false,
      });
      expect(result.current.permissions).toEqual({
        microphone: false,
        notifications: false,
        biometrics: false,
      });
    });
  });

  describe('User Management', () => {
    it('should set user correctly', () => {
      const { result } = renderHook(() => useAppStore());
      const testUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        tenantId: 'tenant1',
        isActive: true,
      };

      act(() => {
        result.current.setUser(testUser);
      });

      expect(result.current.user).toEqual(testUser);
    });

    it('should set authentication status', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setAuthenticated(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should set session token', () => {
      const { result } = renderHook(() => useAppStore());
      const testToken = 'test-token-123';

      act(() => {
        result.current.setSessionToken(testToken);
      });

      expect(result.current.sessionToken).toBe(testToken);
    });
  });

  describe('Voice Assistant State', () => {
    it('should set listening status', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setListening(true);
      });

      expect(result.current.isListening).toBe(true);
    });

    it('should set speaking status', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSpeaking(true);
      });

      expect(result.current.isSpeaking).toBe(true);
    });

    it('should set connection status', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setConnected(true);
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should set transcription', () => {
      const { result } = renderHook(() => useAppStore());
      const testTranscription = 'Hello, how are you?';

      act(() => {
        result.current.setTranscription(testTranscription);
      });

      expect(result.current.transcription).toBe(testTranscription);
    });

    it('should set response', () => {
      const { result } = renderHook(() => useAppStore());
      const testResponse = 'I am doing well, thank you!';

      act(() => {
        result.current.setResponse(testResponse);
      });

      expect(result.current.response).toBe(testResponse);
    });

    it('should set audio level', () => {
      const { result } = renderHook(() => useAppStore());
      const testLevel = 0.75;

      act(() => {
        result.current.setAudioLevel(testLevel);
      });

      expect(result.current.audioLevel).toBe(testLevel);
    });
  });

  describe('Conversation Management', () => {
    it('should add conversation', () => {
      const { result } = renderHook(() => useAppStore());
      const testConversation = {
        id: '1',
        userMessage: 'Hello',
        assistantResponse: 'Hi there!',
        timestamp: new Date(),
        confidence: 0.95,
        language: 'en',
      };

      act(() => {
        result.current.addConversation(testConversation);
      });

      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.conversations[0]).toEqual(testConversation);
    });

    it('should limit conversations to 100', () => {
      const { result } = renderHook(() => useAppStore());

      // Add 101 conversations
      act(() => {
        for (let i = 0; i < 101; i++) {
          result.current.addConversation({
            id: i.toString(),
            userMessage: `Message ${i}`,
            assistantResponse: `Response ${i}`,
            timestamp: new Date(),
            confidence: 0.9,
            language: 'en',
          });
        }
      });

      expect(result.current.conversations).toHaveLength(100);
      expect(result.current.conversations[0].id).toBe('100'); // Most recent first
    });

    it('should clear conversations', () => {
      const { result } = renderHook(() => useAppStore());

      // Add a conversation first
      act(() => {
        result.current.addConversation({
          id: '1',
          userMessage: 'Hello',
          assistantResponse: 'Hi there!',
          timestamp: new Date(),
          confidence: 0.95,
          language: 'en',
        });
      });

      expect(result.current.conversations).toHaveLength(1);

      // Clear conversations
      act(() => {
        result.current.clearConversations();
      });

      expect(result.current.conversations).toHaveLength(0);
    });

    it('should set current conversation', () => {
      const { result } = renderHook(() => useAppStore());
      const testConversation = {
        id: '1',
        userMessage: 'Hello',
        assistantResponse: 'Hi there!',
        timestamp: new Date(),
        confidence: 0.95,
        language: 'en',
      };

      act(() => {
        result.current.setCurrentConversation(testConversation);
      });

      expect(result.current.currentConversation).toEqual(testConversation);
    });
  });

  describe('App State Management', () => {
    it('should set loading status', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should set error', () => {
      const { result } = renderHook(() => useAppStore());
      const testError = 'Something went wrong';

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toBe(testError);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useAppStore());

      // Set error first
      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Settings Management', () => {
    it('should update settings', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateSettings({
          darkMode: true,
          language: 'en',
          voiceSpeed: 1.2,
        });
      });

      expect(result.current.settings.darkMode).toBe(true);
      expect(result.current.settings.language).toBe('en');
      expect(result.current.settings.voiceSpeed).toBe(1.2);
      expect(result.current.settings.autoSpeak).toBe(true); // Should remain unchanged
    });

    it('should preserve existing settings when updating', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateSettings({
          darkMode: true,
        });
      });

      expect(result.current.settings.darkMode).toBe(true);
      expect(result.current.settings.autoSpeak).toBe(true);
      expect(result.current.settings.language).toBe('pt-BR');
    });
  });

  describe('Permissions Management', () => {
    it('should set permission', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setPermission('microphone', true);
      });

      expect(result.current.permissions.microphone).toBe(true);
      expect(result.current.permissions.notifications).toBe(false); // Should remain unchanged
    });

    it('should update multiple permissions', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setPermission('microphone', true);
        result.current.setPermission('notifications', true);
        result.current.setPermission('biometrics', true);
      });

      expect(result.current.permissions.microphone).toBe(true);
      expect(result.current.permissions.notifications).toBe(true);
      expect(result.current.permissions.biometrics).toBe(true);
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useAppStore());

      // Modify some state
      act(() => {
        result.current.setUser({ id: '1', email: 'test@example.com', name: 'Test', role: 'user', tenantId: '1', isActive: true });
        result.current.setAuthenticated(true);
        result.current.setListening(true);
        result.current.addConversation({
          id: '1',
          userMessage: 'Hello',
          assistantResponse: 'Hi',
          timestamp: new Date(),
          confidence: 0.9,
          language: 'en',
        });
        result.current.updateSettings({ darkMode: true });
        result.current.setPermission('microphone', true);
      });

      // Verify state was modified
      expect(result.current.user).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isListening).toBe(true);
      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.settings.darkMode).toBe(true);
      expect(result.current.permissions.microphone).toBe(true);

      // Reset store
      act(() => {
        result.current.reset();
      });

      // Verify state was reset
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isListening).toBe(false);
      expect(result.current.conversations).toHaveLength(0);
      expect(result.current.settings.darkMode).toBe(false);
      expect(result.current.permissions.microphone).toBe(false);
    });
  });

  describe('Store Selectors', () => {
    it('should provide working selectors', () => {
      const { result: userResult } = renderHook(() => useAppStore((state) => state.user));
      const { result: authResult } = renderHook(() => useAppStore((state) => state.isAuthenticated));
      const { result: voiceResult } = renderHook(() => useAppStore((state) => ({
        isListening: state.isListening,
        isSpeaking: state.isSpeaking,
        isConnected: state.isConnected,
      })));

      expect(userResult.current).toBeNull();
      expect(authResult.current).toBe(false);
      expect(voiceResult.current).toEqual({
        isListening: false,
        isSpeaking: false,
        isConnected: false,
      });
    });
  });
});
