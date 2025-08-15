import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

interface PermissionsState {
  microphone: boolean;
  notifications: boolean;
  storage: boolean;
  allGranted: boolean;
}

interface PermissionsContextType {
  permissions: PermissionsState;
  requestMicrophonePermission: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<boolean>;
  requestStoragePermission: () => Promise<boolean>;
  checkAllPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionsState>({
    microphone: false,
    notifications: false,
    storage: false,
    allGranted: false,
  });

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    const micPermission = await checkMicrophonePermission();
    const notifPermission = await checkNotificationPermission();
    const storagePermission = await checkStoragePermission();

    const allGranted = micPermission && notifPermission && storagePermission;

    setPermissions({
      microphone: micPermission,
      notifications: notifPermission,
      storage: storagePermission,
      allGranted,
    });
  };

  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.MICROPHONE,
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
      });

      if (!permission) return false;

      const result = await check(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return false;
    }
  };

  const checkNotificationPermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.NOTIFICATIONS,
        android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
      });

      if (!permission) return true; // Default to true if not available

      const result = await check(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return true; // Default to true on error
    }
  };

  const checkStoragePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') return true; // iOS doesn't need explicit storage permission

      const result = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error checking storage permission:', error);
      return true; // Default to true on error
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.MICROPHONE,
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
      });

      if (!permission) return false;

      const result = await request(permission);
      const granted = result === RESULTS.GRANTED;

      setPermissions(prev => ({ ...prev, microphone: granted }));

      if (!granted) {
        Alert.alert(
          'Microphone Permission Required',
          'This app needs microphone access to hear your voice commands. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {} }, // In a real app, open settings
          ]
        );
      }

      return granted;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.NOTIFICATIONS,
        android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
      });

      if (!permission) return true; // Default to true if not available

      const result = await request(permission);
      const granted = result === RESULTS.GRANTED;

      setPermissions(prev => ({ ...prev, notifications: granted }));

      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return true; // Default to true on error
    }
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') return true; // iOS doesn't need explicit storage permission

      const result = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
      const granted = result === RESULTS.GRANTED;

      setPermissions(prev => ({ ...prev, storage: granted }));

      return granted;
    } catch (error) {
      console.error('Error requesting storage permission:', error);
      return true; // Default to true on error
    }
  };

  const value: PermissionsContextType = {
    permissions,
    requestMicrophonePermission,
    requestNotificationPermission,
    requestStoragePermission,
    checkAllPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
