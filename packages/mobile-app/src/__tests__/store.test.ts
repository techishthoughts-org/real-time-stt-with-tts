import { renderHook, act } from '@testing-library/react-native';
import { useAppStore, useIsAuthenticated, useAppStatus } from '../store';

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

describe('App Store Tests', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      isAuthenticated: false,
      sessionToken: null,
      error: null,
      isLoading: false,
    });
  });

  describe('Authentication State', () => {
    it('should initialize with unauthenticated state', () => {
      const { result } = renderHook(() => useIsAuthenticated());
      expect(result.current).toBe(false);
    });

    it('should update authentication state', () => {
      const { result } = renderHook(() => useIsAuthenticated());
      
      act(() => {
        useAppStore.setState({
          isAuthenticated: true,
          sessionToken: 'test-token',
        });
      });

      expect(result.current).toBe(true);
    });

    it('should handle session token updates', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        useAppStore.setState({
          sessionToken: 'new-token',
        });
      });

      expect(useAppStore.getState().sessionToken).toBe('new-token');
    });

    it('should handle logout', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Set authenticated state first
      act(() => {
        result.current.setAuthenticated(true);
        result.current.setSessionToken('test-token');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.sessionToken).toBe('test-token');

      // Now logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.sessionToken).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should handle error state', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');
    });

    it('should clear error state', () => {
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

      expect(result.current.error).toBe(null);
    });

    it('should handle complex error objects', () => {
      const { result } = renderHook(() => useAppStore());
      
      const complexError = new Error('Complex error with details');
      
      act(() => {
        result.current.setError(complexError.message);
      });

      expect(result.current.error).toBe('Complex error with details');
    });
  });

  describe('Loading State', () => {
    it('should handle loading state', () => {
      const { result } = renderHook(() => useAppStatus());
      
      act(() => {
        useAppStore.setState({ isLoading: true });
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle loading state transitions', () => {
      const { result } = renderHook(() => useAppStatus());
      
      // Start loading
      act(() => {
        useAppStore.setState({ isLoading: true });
      });

      expect(result.current.isLoading).toBe(true);

      // Stop loading
      act(() => {
        useAppStore.setState({ isLoading: false });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('App Status Hook', () => {
    it('should return correct app status', () => {
      const { result } = renderHook(() => useAppStatus());
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);

      act(() => {
        useAppStore.setState({
          isLoading: true,
          error: 'Test error',
        });
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Test error');
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across multiple updates', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Multiple state updates
      act(() => {
        result.current.setAuthenticated(true);
        result.current.setSessionToken('token-1');
        result.current.setError('error-1');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.sessionToken).toBe('token-1');
      expect(result.current.error).toBe('error-1');

      // More updates
      act(() => {
        result.current.setSessionToken('token-2');
        result.current.setError(null);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.sessionToken).toBe('token-2');
      expect(result.current.error).toBe(null);
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle concurrent state updates', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        // Simulate concurrent updates
        result.current.setAuthenticated(true);
        result.current.setSessionToken('concurrent-token');
        result.current.setError('concurrent-error');
        result.current.setAuthenticated(false);
      });

      // Should have the last state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.sessionToken).toBe('concurrent-token');
      expect(result.current.error).toBe('concurrent-error');
    });
  });

  describe('Store Performance', () => {
    it('should handle rapid state updates efficiently', () => {
      const { result } = renderHook(() => useAppStore());
      
      const startTime = Date.now();
      
      act(() => {
        // Rapid state updates
        for (let i = 0; i < 100; i++) {
          result.current.setSessionToken(`token-${i}`);
          result.current.setError(`error-${i}`);
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
      expect(result.current.sessionToken).toBe('token-99');
      expect(result.current.error).toBe('error-99');
    });
  });

  describe('Store Isolation', () => {
    it('should isolate state between different test runs', () => {
      const { result: result1 } = renderHook(() => useAppStore());
      const { result: result2 } = renderHook(() => useAppStore());
      
      // Update state in first hook
      act(() => {
        result1.current.setAuthenticated(true);
        result1.current.setSessionToken('isolated-token');
      });

      // Second hook should see the same state (same store instance)
      expect(result2.current.isAuthenticated).toBe(true);
      expect(result2.current.sessionToken).toBe('isolated-token');
    });
  });
});
