import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePermissions } from '../contexts/PermissionsContext';
import { useVoiceAssistant } from '../contexts/VoiceAssistantContext';

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { state, startListening, stopListening, clearError } = useVoiceAssistant();
  const { permissions, requestMicrophonePermission } = usePermissions();

  useEffect(() => {
    if (state.error) {
      Alert.alert('Error', state.error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [state.error, clearError]);

  const handleVoiceButtonPress = async () => {
    if (!permissions.microphone) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getStatusText = () => {
    if (state.isListening) return 'Listening...';
    if (state.isSpeaking) return 'Speaking...';
    if (!state.isConnected) return 'Disconnected';
    return 'Tap to speak';
  };

  const getStatusColor = () => {
    if (state.isListening) return '#FF6B6B';
    if (state.isSpeaking) return '#4ECDC4';
    if (!state.isConnected) return '#95A5A6';
    return '#2ECC71';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gon Voice Assistant</Text>
            <Text style={styles.subtitle}>Your AI companion</Text>
          </View>

          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>

          {/* Voice Button */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              state.isListening && styles.voiceButtonListening,
              state.isSpeaking && styles.voiceButtonSpeaking,
            ]}
            onPress={handleVoiceButtonPress}
            disabled={!state.isConnected}
          >
            <MaterialIcons
              name={state.isListening ? 'mic' : 'mic-none'}
              size={48}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Test Button */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => navigation.navigate('VoiceTest' as never)}
          >
            <Text style={styles.testButtonText}>🧪 Voice Test Interface</Text>
          </TouchableOpacity>

          {/* Transcription */}
          {state.transcription && (
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionLabel}>You said:</Text>
              <Text style={styles.transcriptionText}>{state.transcription}</Text>
            </View>
          )}

          {/* Response */}
          {state.response && (
            <View style={styles.responseContainer}>
              <Text style={styles.responseLabel}>Gon says:</Text>
              <Text style={styles.responseText}>{state.response}</Text>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Conversation' as never)}
            >
              <MaterialIcons name="chat" size={24} color="#667eea" />
              <Text style={styles.actionText}>Conversation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Settings' as never)}
            >
              <MaterialIcons name="settings" size={24} color="#667eea" />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Connection Status */}
          <View style={styles.connectionStatus}>
            <MaterialIcons
              name={state.isConnected ? 'wifi' : 'wifi-off'}
              size={16}
              color={state.isConnected ? '#2ECC71' : '#E74C3C'}
            />
            <Text style={[
              styles.connectionText,
              { color: state.isConnected ? '#2ECC71' : '#E74C3C' }
            ]}>
              {state.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  voiceButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  voiceButtonListening: {
    backgroundColor: '#FF6B6B',
    transform: [{ scale: 1.1 }],
  },
  voiceButtonSpeaking: {
    backgroundColor: '#4ECDC4',
  },
  transcriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  transcriptionLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  responseContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  responseLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 12,
    minWidth: 100,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  testButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default HomeScreen;
