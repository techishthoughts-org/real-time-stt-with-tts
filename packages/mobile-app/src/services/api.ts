import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '@voice/observability';
import { securityService } from './security';
import { useAppStore } from '../store';

// API Configuration
const API_BASE_URL = __DEV__ ? 'http://localhost:3030' : 'https://api.gonvoice.com';
const API_TIMEOUT = 30000; // 30 seconds

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  SSO_GOOGLE: '/auth/sso/google',
  SSO_AZURE: '/auth/sso/azure',
  SSO_OKTA: '/auth/sso/okta',
  
  // Voice Assistant
  CHAT: '/chat',
  STT: '/stt',
  TTS: '/tts',
  VOICE_BIOMETRICS: '/voice/biometrics',
  
  // User Management
  USER_PROFILE: '/user/profile',
  USER_SETTINGS: '/user/settings',
  USER_CONVERSATIONS: '/user/conversations',
  
  // Health & Monitoring
  HEALTH: '/health',
  HEALTH_LIVE: '/health/live',
  HEALTH_READY: '/health/ready',
  METRICS: '/metrics',
  
  // Enterprise
  TENANTS: '/tenants',
  USERS: '/users',
  AUDIT_LOGS: '/audit/logs',
} as const;

// Request/Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
  requestId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface ChatRequest {
  message: string;
  context?: string;
  language?: string;
  voiceId?: string;
}

export interface ChatResponse {
  response: string;
  confidence: number;
  language: string;
  processingTime: number;
  model: string;
}

export interface STTRequest {
  audio: string; // Base64 encoded audio
  language?: string;
  model?: string;
}

export interface STTResponse {
  text: string;
  confidence: number;
  language: string;
  processingTime: number;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  language?: string;
}

export interface TTSResponse {
  audio: string; // Base64 encoded audio
  duration: number;
  processingTime: number;
}

// Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API Client Class
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = useAppStore.getState().sessionToken;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': `GonVoiceApp/${Platform.OS}/${Platform.Version}`,
      'X-Platform': Platform.OS,
      'X-App-Version': '1.0.0',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new ApiError('No internet connection', 0, 'NETWORK_ERROR');
      }

      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getAuthHeaders();

      const requestOptions: RequestInit = {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.timeout),
      };

      logger.info('API Request', {
        method: options.method || 'GET',
        url,
        headers: Object.keys(headers),
      });

      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      // Validate security headers
      if (!securityService.validateApiResponse({ headers: response.headers, data: responseData })) {
        logger.warn('API response security validation failed');
      }

      if (!response.ok) {
        throw new ApiError(
          responseData.message || `HTTP ${response.status}`,
          response.status,
          responseData.code,
          responseData.details
        );
      }

      logger.info('API Response', {
        status: response.status,
        endpoint,
        success: responseData.success,
      });

      return responseData;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }

      logger.error('API request failed', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload file
   */
  async upload<T>(endpoint: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = await this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set content-type for FormData

    const url = `${this.baseURL}${endpoint}`;
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new ApiError('Invalid JSON response', xhr.status));
          }
        } else {
          reject(new ApiError(`HTTP ${xhr.status}`, xhr.status));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new ApiError('Upload failed', 0, 'UPLOAD_ERROR'));
      });

      xhr.open('POST', url);
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  }
}

// Create API client instance
const apiClient = new ApiClient();

// React Query Hooks

/**
 * Use authentication
 */
export const useAuth = () => {
  const queryClient = useQueryClient();
  const { setUser, setAuthenticated, setSessionToken } = useAppStore();

  const loginMutation = useMutation(
    async (credentials: LoginRequest) => {
      const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.LOGIN, credentials);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setUser(data.user);
        setAuthenticated(true);
        setSessionToken(data.token);
        
        // Store refresh token securely
        securityService.storeSecureData('refreshToken', data.refreshToken);
        
        // Invalidate and refetch user-related queries
        queryClient.invalidateQueries(['user']);
        queryClient.invalidateQueries(['conversations']);
      },
      onError: (error) => {
        logger.error('Login failed', error);
        setAuthenticated(false);
        setSessionToken(null);
      },
    }
  );

  const logoutMutation = useMutation(
    async () => {
      await apiClient.post(API_ENDPOINTS.LOGOUT);
    },
    {
      onSuccess: () => {
        setUser(null);
        setAuthenticated(false);
        setSessionToken(null);
        
        // Remove stored tokens
        securityService.removeSecureData('refreshToken');
        
        // Clear all queries
        queryClient.clear();
      },
    }
  );

  return {
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoading: loginMutation.isLoading || logoutMutation.isLoading,
    error: loginMutation.error || logoutMutation.error,
  };
};

/**
 * Use chat
 */
export const useChat = () => {
  const queryClient = useQueryClient();
  const { addConversation } = useAppStore();

  const chatMutation = useMutation(
    async (request: ChatRequest) => {
      const response = await apiClient.post<ChatResponse>(API_ENDPOINTS.CHAT, request);
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        // Add conversation to store
        const conversation = {
          id: Date.now().toString(),
          userMessage: variables.message,
          assistantResponse: data.response,
          timestamp: new Date(),
          confidence: data.confidence,
          language: data.language,
        };
        
        addConversation(conversation);
        
        // Invalidate conversations query
        queryClient.invalidateQueries(['conversations']);
      },
    }
  );

  return {
    sendMessage: chatMutation.mutate,
    isLoading: chatMutation.isLoading,
    error: chatMutation.error,
    data: chatMutation.data,
  };
};

/**
 * Use STT (Speech-to-Text)
 */
export const useSTT = () => {
  const sttMutation = useMutation(
    async (request: STTRequest) => {
      const response = await apiClient.post<STTResponse>(API_ENDPOINTS.STT, request);
      return response.data;
    }
  );

  return {
    transcribe: sttMutation.mutate,
    isLoading: sttMutation.isLoading,
    error: sttMutation.error,
    data: sttMutation.data,
  };
};

/**
 * Use TTS (Text-to-Speech)
 */
export const useTTS = () => {
  const ttsMutation = useMutation(
    async (request: TTSRequest) => {
      const response = await apiClient.post<TTSResponse>(API_ENDPOINTS.TTS, request);
      return response.data;
    }
  );

  return {
    synthesize: ttsMutation.mutate,
    isLoading: ttsMutation.isLoading,
    error: ttsMutation.error,
    data: ttsMutation.data,
  };
};

/**
 * Use user profile
 */
export const useUserProfile = () => {
  return useQuery(
    ['user', 'profile'],
    async () => {
      const response = await apiClient.get(API_ENDPOINTS.USER_PROFILE);
      return response.data;
    },
    {
      enabled: useAppStore.getState().isAuthenticated,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

/**
 * Use conversations
 */
export const useConversations = () => {
  return useQuery(
    ['conversations'],
    async () => {
      const response = await apiClient.get(API_ENDPOINTS.USER_CONVERSATIONS);
      return response.data;
    },
    {
      enabled: useAppStore.getState().isAuthenticated,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

/**
 * Use health check
 */
export const useHealthCheck = () => {
  return useQuery(
    ['health'],
    async () => {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH);
      return response.data;
    },
    {
      refetchInterval: 30 * 1000, // 30 seconds
      refetchIntervalInBackground: true,
      retry: 3,
      retryDelay: 1000,
    }
  );
};

// Export API client for direct use
export { apiClient };
