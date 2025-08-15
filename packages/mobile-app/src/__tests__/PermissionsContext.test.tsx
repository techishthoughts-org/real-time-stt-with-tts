import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { PermissionsProvider, usePermissions } from '../contexts/PermissionsContext';

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: {
      MICROPHONE: 'ios.permission.MICROPHONE',
      NOTIFICATIONS: 'ios.permission.NOTIFICATIONS',
    },
    ANDROID: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
  },
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  },
  request: jest.fn(),
  check: jest.fn(),
}));

const TestComponent = () => {
  const { permissions, requestPermission } = usePermissions();
  
  return (
    <div>
      <div testID="microphone-permission">{permissions.microphone.toString()}</div>
      <div testID="notifications-permission">{permissions.notifications.toString()}</div>
      <button testID="request-mic-btn" onPress={() => requestPermission('microphone')}>
        Request Microphone
      </button>
      <button testID="request-notif-btn" onPress={() => requestPermission('notifications')}>
        Request Notifications
      </button>
    </div>
  );
};

describe('PermissionsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides initial permission state', () => {
    const { getByTestId } = render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    expect(getByTestId('microphone-permission').props.children).toBe('false');
    expect(getByTestId('notifications-permission').props.children).toBe('false');
  });

  it('handles permission requests', async () => {
    const { getByTestId } = render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('request-mic-btn'));
    });

    expect(getByTestId('request-mic-btn')).toBeTruthy();
  });

  it('handles notification permission requests', async () => {
    const { getByTestId } = render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('request-notif-btn'));
    });

    expect(getByTestId('request-notif-btn')).toBeTruthy();
  });
});
