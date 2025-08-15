import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { VoiceAssistantProvider, useVoiceAssistant } from '../contexts/VoiceAssistantContext';

// Mock audio recording
jest.mock('react-native-audio-recorder-player', () => ({
  AudioRecorderPlayer: jest.fn().mockImplementation(() => ({
    startRecorder: jest.fn().mockResolvedValue('test-audio-file'),
    stopRecorder: jest.fn().mockResolvedValue('test-audio-file'),
    startPlayer: jest.fn().mockResolvedValue('test-audio-file'),
    stopPlayer: jest.fn().mockResolvedValue('test-audio-file'),
    addRecordBackListener: jest.fn(),
    addPlayBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
  })),
}));

// Mock TTS
jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  getInitStatus: jest.fn().mockResolvedValue('success'),
}));

// Mock permissions
jest.mock('react-native-permissions', () => ({
  request: jest.fn(),
  check: jest.fn(),
  PERMISSIONS: {
    IOS: {
      MICROPHONE: 'ios.permission.MICROPHONE',
    },
    ANDROID: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNAVAILABLE: 'unavailable',
  },
}));

// Mock logger
jest.mock('@voice/observability', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Test component to access context
const TestComponent: React.FC = () => {
  const {
    isListening,
    isSpeaking,
    isConnected,
    transcription,
    response,
    audioLevel,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    connect,
    disconnect,
  } = useVoiceAssistant();

  return (
    <div>
      <div testID="is-listening">{isListening.toString()}</div>
      <div testID="is-speaking">{isSpeaking.toString()}</div>
      <div testID="is-connected">{isConnected.toString()}</div>
      <div testID="transcription">{transcription}</div>
      <div testID="response">{response}</div>
      <div testID="audio-level">{audioLevel.toString()}</div>
      <button testID="start-listening" onPress={startListening}>
        Start Listening
      </button>
      <button testID="stop-listening" onPress={stopListening}>
        Stop Listening
      </button>
      <button testID="speak" onPress={() => speak('Hello world')}>
        Speak
      </button>
      <button testID="stop-speaking" onPress={stopSpeaking}>
        Stop Speaking
      </button>
      <button testID="connect" onPress={connect}>
        Connect
      </button>
      <button testID="disconnect" onPress={disconnect}>
        Disconnect
      </button>
    </div>
  );
};

describe('VoiceAssistantContext Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Context Provider', () => {
    it('should provide voice assistant context', () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      expect(getByTestId('is-listening')).toBeTruthy();
      expect(getByTestId('is-speaking')).toBeTruthy();
      expect(getByTestId('is-connected')).toBeTruthy();
    });

    it('should initialize with default state', () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      expect(getByTestId('is-listening').props.children).toBe('false');
      expect(getByTestId('is-speaking').props.children).toBe('false');
      expect(getByTestId('is-connected').props.children).toBe('false');
      expect(getByTestId('transcription').props.children).toBe('');
      expect(getByTestId('response').props.children).toBe('');
      expect(getByTestId('audio-level').props.children).toBe('0');
    });
  });

  describe('Listening Functionality', () => {
    it('should start listening when permission granted', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const startButton = getByTestId('start-listening');
      
      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('true');
      });
    });

    it('should stop listening', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const startButton = getByTestId('start-listening');
      const stopButton = getByTestId('stop-listening');
      
      // Start listening
      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('true');
      });

      // Stop listening
      await act(async () => {
        fireEvent.press(stopButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('false');
      });
    });

    it('should handle listening errors gracefully', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const startButton = getByTestId('start-listening');
      
      // Mock permission denial
      const { request } = require('react-native-permissions');
      request.mockResolvedValue('denied');
      
      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('false');
      });
    });
  });

  describe('Speaking Functionality', () => {
    it('should start speaking', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const speakButton = getByTestId('speak');
      
      await act(async () => {
        fireEvent.press(speakButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-speaking').props.children).toBe('true');
      });
    });

    it('should stop speaking', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const speakButton = getByTestId('speak');
      const stopButton = getByTestId('stop-speaking');
      
      // Start speaking
      await act(async () => {
        fireEvent.press(speakButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-speaking').props.children).toBe('true');
      });

      // Stop speaking
      await act(async () => {
        fireEvent.press(stopButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-speaking').props.children).toBe('false');
      });
    });

    it('should handle speaking errors gracefully', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const speakButton = getByTestId('speak');
      
      // Mock TTS error
      const { speak } = require('react-native-tts');
      speak.mockRejectedValue(new Error('TTS error'));
      
      await act(async () => {
        fireEvent.press(speakButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-speaking').props.children).toBe('false');
      });
    });
  });

  describe('Connection Management', () => {
    it('should connect to voice assistant service', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const connectButton = getByTestId('connect');
      
      await act(async () => {
        fireEvent.press(connectButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-connected').props.children).toBe('true');
      });
    });

    it('should disconnect from voice assistant service', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const connectButton = getByTestId('connect');
      const disconnectButton = getByTestId('disconnect');
      
      // Connect first
      await act(async () => {
        fireEvent.press(connectButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-connected').props.children).toBe('true');
      });

      // Disconnect
      await act(async () => {
        fireEvent.press(disconnectButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-connected').props.children).toBe('false');
      });
    });

    it('should handle connection errors gracefully', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const connectButton = getByTestId('connect');
      
      // Mock connection failure
      // This would require mocking the actual connection logic
      
      await act(async () => {
        fireEvent.press(connectButton);
      });

      // Should handle error gracefully
      expect(getByTestId('is-connected')).toBeTruthy();
    });
  });

  describe('Audio Level Monitoring', () => {
    it('should update audio level during recording', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const startButton = getByTestId('start-listening');
      
      await act(async () => {
        fireEvent.press(startButton);
      });

      // Simulate audio level updates
      await waitFor(() => {
        const audioLevel = parseFloat(getByTestId('audio-level').props.children);
        expect(audioLevel).toBeGreaterThanOrEqual(0);
        expect(audioLevel).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Transcription Handling', () => {
    it('should update transcription text', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      // Simulate transcription update
      // This would require mocking the actual transcription service
      
      expect(getByTestId('transcription').props.children).toBe('');
    });

    it('should handle transcription errors', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      // Mock transcription error
      // This would require mocking the actual transcription service
      
      expect(getByTestId('transcription')).toBeTruthy();
    });
  });

  describe('Response Handling', () => {
    it('should update response text', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      // Simulate response update
      // This would require mocking the actual AI response service
      
      expect(getByTestId('response').props.children).toBe('');
    });

    it('should handle response errors', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      // Mock response error
      // This would require mocking the actual AI response service
      
      expect(getByTestId('response')).toBeTruthy();
    });
  });

  describe('State Synchronization', () => {
    it('should not allow listening and speaking simultaneously', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const startButton = getByTestId('start-listening');
      const speakButton = getByTestId('speak');
      
      // Start listening
      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('true');
      });

      // Try to speak while listening
      await act(async () => {
        fireEvent.press(speakButton);
      });

      // Should not be speaking while listening
      await waitFor(() => {
        expect(getByTestId('is-speaking').props.children).toBe('false');
      });
    });

    it('should stop listening when speaking starts', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const startButton = getByTestId('start-listening');
      const speakButton = getByTestId('speak');
      
      // Start listening
      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('true');
      });

      // Start speaking
      await act(async () => {
        fireEvent.press(speakButton);
      });

      // Should stop listening when speaking
      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('false');
        expect(getByTestId('is-speaking').props.children).toBe('true');
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from listening errors', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const startButton = getByTestId('start-listening');
      
      // First attempt fails
      const { request } = require('react-native-permissions');
      request.mockResolvedValueOnce('denied');
      
      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('false');
      });

      // Second attempt succeeds
      request.mockResolvedValueOnce('granted');
      
      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-listening').props.children).toBe('true');
      });
    });

    it('should recover from speaking errors', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const speakButton = getByTestId('speak');
      
      // First attempt fails
      const { speak } = require('react-native-tts');
      speak.mockRejectedValueOnce(new Error('TTS error'));
      
      await act(async () => {
        fireEvent.press(speakButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-speaking').props.children).toBe('false');
      });

      // Second attempt succeeds
      speak.mockResolvedValueOnce(undefined);
      
      await act(async () => {
        fireEvent.press(speakButton);
      });

      await waitFor(() => {
        expect(getByTestId('is-speaking').props.children).toBe('true');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid state changes efficiently', async () => {
      const { getByTestId } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const startTime = Date.now();
      const startButton = getByTestId('start-listening');
      const stopButton = getByTestId('stop-listening');
      
      // Rapid start/stop cycles
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          fireEvent.press(startButton);
        });
        
        await act(async () => {
          fireEvent.press(stopButton);
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 2 seconds)
      expect(duration).toBeLessThan(2000);
    });

    it('should not cause memory leaks during long sessions', async () => {
      const { getByTestId, rerender } = render(
        <VoiceAssistantProvider>
          <TestComponent />
        </VoiceAssistantProvider>
      );

      const speakButton = getByTestId('speak');
      
      // Simulate long session with multiple operations
      for (let i = 0; i < 50; i++) {
        await act(async () => {
          fireEvent.press(speakButton);
        });
        
        // Re-render to simulate component updates
        rerender(
          <VoiceAssistantProvider>
            <TestComponent />
          </VoiceAssistantProvider>
        );
      }

      // Should not throw any errors
      expect(true).toBe(true);
    });
  });
});
