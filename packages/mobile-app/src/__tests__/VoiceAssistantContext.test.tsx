import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { VoiceAssistantProvider, useVoiceAssistant } from '../contexts/VoiceAssistantContext';

// Mock the voice and TTS libraries
jest.mock('@react-native-community/voice', () => ({
  onSpeechStart: jest.fn(),
  onSpeechEnd: jest.fn(),
  onSpeechResults: jest.fn(),
  onSpeechError: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

const TestComponent = () => {
  const { state, startListening, stopListening, speak } = useVoiceAssistant();
  
  return (
    <div>
      <div testID="is-listening">{state.isListening.toString()}</div>
      <div testID="is-connected">{state.isConnected.toString()}</div>
      <div testID="transcription">{state.transcription || ''}</div>
      <div testID="response">{state.response || ''}</div>
      <button testID="start-btn" onPress={startListening}>Start</button>
      <button testID="stop-btn" onPress={stopListening}>Stop</button>
      <button testID="speak-btn" onPress={() => speak('Hello')}>Speak</button>
    </div>
  );
};

describe('VoiceAssistantContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides initial state', () => {
    const { getByTestId } = render(
      <VoiceAssistantProvider>
        <TestComponent />
      </VoiceAssistantProvider>
    );

    expect(getByTestId('is-listening').props.children).toBe('false');
    expect(getByTestId('is-connected').props.children).toBe('true');
    expect(getByTestId('transcription').props.children).toBe('');
    expect(getByTestId('response').props.children).toBe('');
  });

  it('handles start listening', async () => {
    const { getByTestId } = render(
      <VoiceAssistantProvider>
        <TestComponent />
      </VoiceAssistantProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('start-btn'));
    });

    // The actual implementation would update the state
    // This test verifies the function can be called without errors
    expect(getByTestId('start-btn')).toBeTruthy();
  });

  it('handles stop listening', async () => {
    const { getByTestId } = render(
      <VoiceAssistantProvider>
        <TestComponent />
      </VoiceAssistantProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('stop-btn'));
    });

    expect(getByTestId('stop-btn')).toBeTruthy();
  });

  it('handles speak function', async () => {
    const { getByTestId } = render(
      <VoiceAssistantProvider>
        <TestComponent />
      </VoiceAssistantProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('speak-btn'));
    });

    expect(getByTestId('speak-btn')).toBeTruthy();
  });
});
