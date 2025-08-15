import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useVoiceAssistant } from '../contexts/VoiceAssistantContext';

const ConversationScreen: React.FC = () => {
  const { state, speak, stopSpeaking } = useVoiceAssistant();

  const renderMessage = ({ item }: { item: any }) => (
    <View style={styles.messageContainer}>
      {/* User Message */}
      <View style={styles.userMessage}>
        <View style={styles.messageHeader}>
          <Icon name="person" size={16} color="#667eea" />
          <Text style={styles.messageTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={styles.userMessageText}>{item.userMessage}</Text>
      </View>

      {/* Assistant Message */}
      <View style={styles.assistantMessage}>
        <View style={styles.messageHeader}>
          <Icon name="smart-toy" size={16} color="#4ECDC4" />
          <Text style={styles.messageTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={styles.assistantMessageText}>{item.assistantResponse}</Text>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => speak(item.assistantResponse)}
        >
          <Icon name="play-arrow" size={20} color="#4ECDC4" />
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chat" size={64} color="#95A5A6" />
      <Text style={styles.emptyStateTitle}>No conversations yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start talking to Gon to see your conversation history here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversation History</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            Alert.alert(
              'Clear History',
              'Are you sure you want to clear all conversation history?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => {} },
              ]
            );
          }}
        >
          <Icon name="clear-all" size={24} color="#E74C3C" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={state.conversationHistory}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  clearButton: {
    padding: 8,
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 24,
  },
  userMessage: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    marginBottom: 8,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  assistantMessage: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#95A5A6',
    marginLeft: 8,
  },
  userMessageText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  assistantMessageText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 22,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    fontSize: 14,
    color: '#4ECDC4',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#95A5A6',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ConversationScreen;
