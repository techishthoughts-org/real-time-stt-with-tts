import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import App from '../App';

// Mock the contexts
jest.mock('../contexts/VoiceAssistantContext', () => ({
  VoiceAssistantProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../contexts/PermissionsContext', () => ({
  PermissionsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the screens
jest.mock('../screens/HomeScreen', () => {
  const React = require('react');
  return function MockHomeScreen() {
    return React.createElement('View', { testID: 'home-screen' }, 'Home Screen');
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

describe('App', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('shows home screen by default', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <App />
      </NavigationContainer>
    );

    expect(getByTestId('home-screen')).toBeTruthy();
  });
});
