import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { usePermissions } from '../contexts/PermissionsContext';

const SettingsScreen: React.FC = () => {
  const { permissions, requestMicrophonePermission, requestNotificationPermission } = usePermissions();
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handlePermissionRequest = async (permissionType: 'microphone' | 'notifications') => {
    try {
      let granted = false;
      if (permissionType === 'microphone') {
        granted = await requestMicrophonePermission();
      } else if (permissionType === 'notifications') {
        granted = await requestNotificationPermission();
      }

      if (!granted) {
        Alert.alert(
          'Permission Required',
          `Please enable ${permissionType} permission in your device settings to use this feature.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {} }, // In a real app, open settings
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permission');
    }
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    rightComponent: React.ReactNode
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color="#667eea" style={styles.settingIcon} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {rightComponent}
    </View>
  );

  const renderPermissionItem = (
    icon: string,
    title: string,
    subtitle: string,
    permission: boolean,
    onRequest: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onRequest}
    >
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color={permission ? '#2ECC71' : '#E74C3C'} style={styles.settingIcon} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={[styles.permissionIndicator, { backgroundColor: permission ? '#2ECC71' : '#E74C3C' }]}>
        <Icon name={permission ? 'check' : 'close'} size={16} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Permissions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          {renderPermissionItem(
            'mic',
            'Microphone',
            'Required for voice recognition',
            permissions.microphone,
            () => handlePermissionRequest('microphone')
          )}
          {renderPermissionItem(
            'notifications',
            'Notifications',
            'Receive voice assistant alerts',
            permissions.notifications,
            () => handlePermissionRequest('notifications')
          )}
        </View>

        {/* Voice Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Settings</Text>
          {renderSettingItem(
            'volume-up',
            'Auto Speak',
            'Automatically speak responses',
            <Switch
              value={autoSpeak}
              onValueChange={setAutoSpeak}
              trackColor={{ false: '#E9ECEF', true: '#667eea' }}
              thumbColor="#FFFFFF"
            />
          )}
          {renderSettingItem(
            'wifi-off',
            'Offline Mode',
            'Use local processing when possible',
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: '#E9ECEF', true: '#667eea' }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          {renderSettingItem(
            'dark-mode',
            'Dark Mode',
            'Use dark theme',
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E9ECEF', true: '#667eea' }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="info" size={24} color="#667eea" style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Version</Text>
                <Text style={styles.settingSubtitle}>1.0.0</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#95A5A6" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="help" size={24} color="#667eea" style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Help & Support</Text>
                <Text style={styles.settingSubtitle}>Get help and contact support</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#95A5A6" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="privacy-tip" size={24} color="#667eea" style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingSubtitle}>Read our privacy policy</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#95A5A6" />
          </TouchableOpacity>
        </View>

        {/* Reset Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              Alert.alert(
                'Reset App',
                'Are you sure you want to reset all settings and clear data?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: () => {} },
                ]
              );
            }}
          >
            <Icon name="refresh" size={20} color="#E74C3C" />
            <Text style={styles.resetButtonText}>Reset App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#95A5A6',
  },
  permissionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E74C3C',
    marginLeft: 8,
  },
});

export default SettingsScreen;
