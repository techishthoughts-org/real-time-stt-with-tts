import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: 'voice_chunk' | 'text_message' | 'start_listening' | 'stop_listening' | 'ping' | 'pong';
  data?: any;
  userId?: string;
  conversationId?: string;
  timestamp?: number;
}

interface WebSocketResponse {
  type: 'voice_response' | 'text_response' | 'status' | 'error' | 'pong';
  data?: any;
  conversationId?: string;
  timestamp: number;
}

interface WebSocketState {
  isConnected: boolean;
  isListening: boolean;
  connectionId?: string;
  error: string | null;
}

export const useWebSocketChat = () => {
  const { user } = useAuth();
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isListening: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Message handlers
  const onTextResponse = useRef<(response: any) => void>(() => {});
  const onVoiceResponse = useRef<(response: any) => void>(() => {});
  const onStatusUpdate = useRef<(status: any) => void>(() => {});
  const onError = useRef<(error: any) => void>(() => {});

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        console.log('WebSocket connected');

        // Set up ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const response: WebSocketResponse = JSON.parse(event.data);
          handleMessage(response);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setState(prev => ({ ...prev, isConnected: false }));
        console.log('WebSocket disconnected:', event.code, event.reason);

        // Clear intervals
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
        onError.current({ message: 'WebSocket connection error' });
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setState(prev => ({ ...prev, error: 'Failed to connect' }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }

    setState(prev => ({ ...prev, isConnected: false, isListening: false }));
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  const startListening = useCallback((conversationId?: string) => {
    sendMessage({
      type: 'start_listening',
      userId: user?.id || 'anonymous',
      conversationId,
      timestamp: Date.now(),
    });
  }, [sendMessage, user?.id]);

  const stopListening = useCallback(() => {
    sendMessage({
      type: 'stop_listening',
      userId: user?.id || 'anonymous',
      timestamp: Date.now(),
    });
  }, [sendMessage, user?.id]);

  const sendVoiceChunk = useCallback((audioData: any) => {
    sendMessage({
      type: 'voice_chunk',
      data: audioData,
      userId: user?.id || 'anonymous',
      timestamp: Date.now(),
    });
  }, [sendMessage, user?.id]);

  const sendTextMessage = useCallback((text: string, conversationId?: string) => {
    sendMessage({
      type: 'text_message',
      data: { text },
      userId: user?.id || 'anonymous',
      conversationId,
      timestamp: Date.now(),
    });
  }, [sendMessage, user?.id]);

  const handleMessage = useCallback((response: WebSocketResponse) => {
    switch (response.type) {
      case 'text_response':
        onTextResponse.current(response.data);
        break;

      case 'voice_response':
        onVoiceResponse.current(response.data);
        break;

      case 'status':
        if (response.data?.isListening !== undefined) {
          setState(prev => ({ ...prev, isListening: response.data.isListening }));
        }
        if (response.data?.connectionId) {
          setState(prev => ({ ...prev, connectionId: response.data.connectionId }));
        }
        onStatusUpdate.current(response.data);
        break;

      case 'error':
        setState(prev => ({ ...prev, error: response.data?.message || 'Unknown error' }));
        onError.current(response.data);
        break;

      case 'pong':
        // Keep connection alive
        break;

      default:
        console.warn('Unknown WebSocket response type:', response.type);
    }
  }, []);

  // Set up message handlers
  const setTextResponseHandler = useCallback((handler: (response: any) => void) => {
    onTextResponse.current = handler;
  }, []);

  const setVoiceResponseHandler = useCallback((handler: (response: any) => void) => {
    onVoiceResponse.current = handler;
  }, []);

  const setStatusUpdateHandler = useCallback((handler: (status: any) => void) => {
    onStatusUpdate.current = handler;
  }, []);

  const setErrorHandler = useCallback((handler: (error: any) => void) => {
    onError.current = handler;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    // State
    isConnected: state.isConnected,
    isListening: state.isListening,
    connectionId: state.connectionId,
    error: state.error,

    // Actions
    connect,
    disconnect,
    startListening,
    stopListening,
    sendVoiceChunk,
    sendTextMessage,

    // Event handlers
    setTextResponseHandler,
    setVoiceResponseHandler,
    setStatusUpdateHandler,
    setErrorHandler,
  };
};
