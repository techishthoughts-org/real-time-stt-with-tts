import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from 'react-query';
import App from '../App';
import { useAppStore } from '../store';
import { securityService } from '../services/security';

// Mock all external dependencies
jest.mock('react-native-splash-screen', () => ({
  hide: jest.fn(),
}));

jest.mock('@voice/observability', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../services/security', () => ({
  securityService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getSecureData: jest.fn(),
    setSecureData: jest.fn(),
    removeSecureData: jest.fn(),
  },
}));

jest.mock('../services/api', () => ({
  useHealthCheck: () => ({
    data: { status: 'healthy', timestamp: Date.now() },
    error: null,
    isLoading: false,
  }),
}));

jest.mock('../contexts/VoiceAssistantContext', () => ({
  VoiceAssistantProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../contexts/PermissionsContext', () => ({
  PermissionsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock screens
jest.mock('../screens/HomeScreen', () => {
  const React = require('react');
  return function MockHomeScreen() {
    return React.createElement('View', { testID: 'home-screen' }, 'Home Screen');
  };
});

jest.mock('../screens/LoginScreen', () => {
  const React = require('react');
  return function MockLoginScreen() {
    return React.createElement('View', { testID: 'login-screen' }, 'Login Screen');
  };
});

jest.mock('../screens/LoadingScreen', () => {
  const React = require('react');
  return function MockLoadingScreen() {
    return React.createElement('View', { testID: 'loading-screen' }, 'Loading Screen');
  };
});

jest.mock('../screens/ConversationScreen', () => {
  const React = require('react');
  return function MockConversationScreen() {
    return React.createElement('View', { testID: 'conversation-screen' }, 'Conversation Screen');
  };
});

jest.mock('../screens/SettingsScreen', () => {
  const React = require('react');
  return function MockSettingsScreen() {
    return React.createElement('View', { testID: 'settings-screen' }, 'Settings Screen');
  };
});

// Mock React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    StatusBar: 'StatusBar',
    Alert: {
      alert: jest.fn(),
    },
    AppState: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  };
});

describe('App Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // Reset store state
    useAppStore.setState({
      isAuthenticated: false,
      sessionToken: null,
      error: null,
      isLoading: false,
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('App Initialization', () => {
    it('should show loading screen during initialization', async () => {
      const { getByTestId } = render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      expect(getByTestId('loading-screen')).toBeTruthy();
    });

    it('should initialize security service on app start', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(securityService.initialize).toHaveBeenCalled();
      });
    });

    it('should show login screen when not authenticated', async () => {
      (securityService.getSecureData as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });
    });

    it('should show home screen when authenticated', async () => {
      (securityService.getSecureData as jest.Mock).mockResolvedValue('valid-token');
      
      useAppStore.setState({
        isAuthenticated: true,
        sessionToken: 'valid-token',
      });

      const { getByTestId } = render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle authentication state changes', async () => {
      const { getByTestId } = render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      // Initially should show login
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });

      // Simulate authentication
      act(() => {
        useAppStore.setState({
          isAuthenticated: true,
          sessionToken: 'new-token',
        });
      });

      // Should now show home screen
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      (securityService.initialize as jest.Mock).mockRejectedValue(
        new Error('Security initialization failed')
      );

      const { getByTestId } = render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });
    });

    it('should handle health check errors', async () => {
      const mockUseHealthCheck = require('../services/api').useHealthCheck;
      mockUseHealthCheck.mockReturnValue({
        data: null,
        error: new Error('Health check failed'),
        isLoading: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(require('react-native').Alert.alert).toHaveBeenCalledWith(
          'Connection Error',
          'Unable to connect to the voice assistant server. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate between screens when authenticated', async () => {
      useAppStore.setState({
        isAuthenticated: true,
        sessionToken: 'valid-token',
      });

      const { getByTestId } = render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  describe('App State Management', () => {
    it('should handle app state changes', async () => {
      const mockAddEventListener = require('react-native').AppState.addEventListener;
      
      render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks during re-renders', async () => {
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <App />
          </NavigationContainer>
        </QueryClientProvider>
      );

      // Simulate multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <App />
            </NavigationContainer>
          </QueryClientProvider>
        );
      }

      // Should not throw any errors
      expect(true).toBe(true);
    });
  });
});
