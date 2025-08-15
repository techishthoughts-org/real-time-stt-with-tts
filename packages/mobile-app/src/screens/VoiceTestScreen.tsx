import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useVoiceAssistant } from '../contexts/VoiceAssistantContext';
import { logger } from '@voice/observability';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  type: 'user' | 'gon';
  timestamp: Date;
}

interface Status {
  server: 'online' | 'offline' | 'connecting';
  mic: 'online' | 'offline' | 'connecting';
  ai: 'online' | 'offline' | 'connecting';
}

interface Metrics {
  responseTime: number;
  cacheHits: number;
  totalRequests: number;
  audioLevel: number;
}

export const VoiceTestScreen: React.FC = () => {
  const { state, startListening, stopListening, speak, sendMessage } = useVoiceAssistant();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>({
    server: 'offline',
    mic: 'offline',
    ai: 'offline',
  });
  const [metrics, setMetrics] = useState<Metrics>({
    responseTime: 0,
    cacheHits: 0,
    totalRequests: 0,
    audioLevel: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [autoStart, setAutoStart] = useState(false);
  const audioBarsRef = useRef<View>(null);

  // Logging function
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
    logger.info(`VoiceTest: ${message}`);
  };

  // Update metrics
  const updateMetrics = (newMetrics: Partial<Metrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
  };

  // Update status
  const updateStatus = (type: keyof Status, newStatus: Status[keyof Status], text?: string) => {
    setStatus(prev => ({ ...prev, [type]: newStatus }));
    if (text) {
      addLog(`${type.toUpperCase()}: ${text}`, newStatus === 'online' ? 'success' : newStatus === 'connecting' ? 'warning' : 'error');
    }
  };

  // Test server connection
  const testServerConnection = async () => {
    try {
      updateStatus('server', 'connecting');
      addLog('Testing server connection...', 'info');

      const response = await fetch('http://localhost:3030/health');
      if (response.ok) {
        const data = await response.json();
        updateStatus('server', 'online');
        updateStatus('ai', 'online');
        addLog('Server connected successfully', 'success');
      } else {
        updateStatus('server', 'offline');
        addLog(`Server error: ${response.status}`, 'error');
      }
    } catch (error) {
      updateStatus('server', 'offline');
      addLog(`Server connection failed: ${error}`, 'error');
    }
  };

  // Load Gon greeting
  const loadGonGreeting = async () => {
    try {
      addLog('Loading Gon greeting...', 'info');
      const response = await fetch('http://localhost:3030/persona/info');
      if (response.ok) {
        const data = await response.json();
        addMessage(data.initialGreeting, 'gon');
        addLog('Gon greeting loaded', 'success');
      }
    } catch (error) {
      addLog(`Failed to load Gon greeting: ${error}`, 'error');
    }
  };

  // Add message to conversation
  const addMessage = (text: string, type: 'user' | 'gon') => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      type,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  // Send message to Gon
  const sendToGon = async (message: string) => {
    try {
      updateMetrics({ totalRequests: metrics.totalRequests + 1 });
      const startTime = Date.now();
      addLog(`Sending to Gon: "${message}"`, 'info');

      const response = await fetch('http://localhost:3030/llm/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      updateMetrics({ responseTime });

      if (response.ok) {
        const data = await response.json();
        addMessage(data.response.response, 'gon');
        addLog(`Gon responded in ${responseTime}ms`, 'success');
      } else {
        const errorText = await response.text();
        addLog(`Gon error: ${response.status} - ${errorText}`, 'error');
      }
    } catch (error) {
      addLog(`Failed to send to Gon: ${error}`, 'error');
    }
  };

  // Test Gon response
  const testGonResponse = async () => {
    const testMessage = "Oi Gon! Como você está? Conte uma piada!";
    addMessage(testMessage, 'user');
    await sendToGon(testMessage);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    addLog('Conversation cleared', 'info');
  };

  // Clear cache
  const clearCache = async () => {
    try {
      const response = await fetch('http://localhost:3030/cache/clear', {
        method: 'POST',
      });
      if (response.ok) {
        addLog('Cache cleared', 'success');
      } else {
        addLog('Failed to clear cache', 'error');
      }
    } catch (error) {
      addLog(`Cache clear error: ${error}`, 'error');
    }
  };

  // Export logs
  const exportLogs = () => {
    const logsText = logs.join('\n');
    if (Platform.OS === 'web') {
      const blob = new Blob([logsText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gon-voice-logs-${new Date().toISOString().slice(0, 19)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
    addLog('Logs exported', 'success');
  };

  // Handle voice input
  useEffect(() => {
    if (state.transcription) {
      addMessage(state.transcription, 'user');
      sendToGon(state.transcription);
    }
  }, [state.transcription]);

  // Initialize on mount
  useEffect(() => {
    addLog('Gon Voice Assistant Test Interface loaded', 'info');
    testServerConnection();
    loadGonGreeting();
  }, []);

  // Update audio level based on voice assistant state
  useEffect(() => {
    if (state.isListening) {
      updateMetrics({ audioLevel: Math.random() * 100 }); // Simulate audio level
    } else {
      updateMetrics({ audioLevel: 0 });
    }
  }, [state.isListening]);

  const StatusIndicator: React.FC<{ status: string }> = ({ status }) => (
    <View style={[styles.statusIndicator, styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]]} />
  );

  const Button: React.FC<{ title: string; onPress: () => void; variant?: 'success' | 'danger' | 'warning' }> = ({ 
    title, 
    onPress, 
    variant = 'default' 
  }) => (
    <TouchableOpacity
      style={[styles.button, styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`]]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎭 Gon Voice Assistant</Text>
        <Text style={styles.subtitle}>WebRTC Voice Testing Interface</Text>
      </View>

      <View style={styles.content}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>🔗 Server Status</Text>
            <View style={styles.statusRow}>
              <StatusIndicator status={status.server} />
              <Text style={styles.statusText}>
                {status.server === 'online' ? 'Connected' : 
                 status.server === 'connecting' ? 'Testing...' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>🎤 Microphone Status</Text>
            <View style={styles.statusRow}>
              <StatusIndicator status={status.mic} />
              <Text style={styles.statusText}>
                {state.isListening ? 'Listening...' : 'Not connected'}
              </Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>🧠 AI Status</Text>
            <View style={styles.statusRow}>
              <StatusIndicator status={status.ai} />
              <Text style={styles.statusText}>
                {status.ai === 'online' ? 'OpenRouter: ✅' : 'Checking...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Audio Visualizer */}
        <View style={styles.audioVisualizer}>
          <View style={styles.audioBars}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.audioBar,
                  {
                    height: Math.max(2, (metrics.audioLevel / 100) * 60 * (1 - Math.abs(i - 10) / 10)),
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          <View style={styles.controlGroup}>
            <Text style={styles.controlTitle}>🎤 Voice Controls</Text>
            <Button
              title="🎙️ Start Voice"
              onPress={startListening}
              variant="success"
            />
            <Button
              title="⏹️ Stop Voice"
              onPress={stopListening}
              variant="danger"
            />
            <Button
              title="🗑️ Clear Chat"
              onPress={clearConversation}
              variant="warning"
            />
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlTitle}>🧪 Test Functions</Text>
            <Button title="🔗 Test Server" onPress={testServerConnection} />
            <Button title="🧠 Test Gon" onPress={testGonResponse} />
            <Button title="🎭 Load Greeting" onPress={loadGonGreeting} />
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlTitle}>⚙️ Settings</Text>
            <Button
              title={`🔄 Auto Start ${autoStart ? 'ON' : 'OFF'}`}
              onPress={() => setAutoStart(!autoStart)}
            />
            <Button title="🗑️ Clear Cache" onPress={clearCache} />
            <Button title="📤 Export Logs" onPress={exportLogs} />
          </View>
        </View>

        {/* Metrics Section */}
        <View style={styles.metricsSection}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.responseTime}ms</Text>
            <Text style={styles.metricLabel}>Response Time</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.cacheHits}</Text>
            <Text style={styles.metricLabel}>Cache Hits</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.totalRequests}</Text>
            <Text style={styles.metricLabel}>Total Requests</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{Math.round(metrics.audioLevel)}%</Text>
            <Text style={styles.metricLabel}>Audio Level</Text>
          </View>
        </View>

        {/* Conversation Section */}
        <View style={styles.conversationSection}>
          <View style={styles.conversationPanel}>
            <Text style={styles.panelTitle}>💬 Conversation History</Text>
            <ScrollView style={styles.messagesContainer}>
              {messages.filter(m => m.type === 'user').map(message => (
                <View key={message.id} style={[styles.message, styles.messageUser]}>
                  <Text style={styles.messageText}>{message.text}</Text>
                  <Text style={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.conversationPanel}>
            <Text style={styles.panelTitle}>🎭 Gon's Responses</Text>
            <ScrollView style={styles.messagesContainer}>
              {messages.filter(m => m.type === 'gon').map(message => (
                <View key={message.id} style={[styles.message, styles.messageGon]}>
                  <Text style={styles.messageText}>{message.text}</Text>
                  <Text style={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Log Section */}
        <View style={styles.logSection}>
          <Text style={styles.panelTitle}>📋 System Logs</Text>
          <ScrollView style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logEntry}>
                {log}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  content: {
    padding: 20,
  },
  statusSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    flex: 1,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusOnline: {
    backgroundColor: '#28a745',
  },
  statusOffline: {
    backgroundColor: '#dc3545',
  },
  statusConnecting: {
    backgroundColor: '#ffc107',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  audioVisualizer: {
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 20,
    marginVertical: 20,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 60,
  },
  audioBar: {
    width: 4,
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  controlsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  controlGroup: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    flex: 1,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonSuccess: {
    backgroundColor: '#28a745',
  },
  buttonDanger: {
    backgroundColor: '#dc3545',
  },
  buttonWarning: {
    backgroundColor: '#ffc107',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  metricsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  conversationSection: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  conversationPanel: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    flex: 1,
    height: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  messagesContainer: {
    flex: 1,
  },
  message: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  messageUser: {
    backgroundColor: '#667eea',
    alignSelf: 'flex-end',
  },
  messageGon: {
    backgroundColor: '#e9ecef',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 5,
  },
  logSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    height: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logsContainer: {
    flex: 1,
  },
  logEntry: {
    fontFamily: Platform.OS === 'web' ? 'Monaco, Menlo, monospace' : 'monospace',
    fontSize: 12,
    marginBottom: 5,
    padding: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
});
