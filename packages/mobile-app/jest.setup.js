// Mock React Native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Alert: {
    alert: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  StatusBar: {
    setBarStyle: jest.fn(),
    setHidden: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Image: 'Image',
  TextInput: 'TextInput',
  Button: 'Button',
  Switch: 'Switch',
  Modal: 'Modal',
  ActivityIndicator: 'ActivityIndicator',
  SafeAreaView: 'SafeAreaView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Animated: {
    Value: jest.fn(),
    timing: jest.fn(),
    spring: jest.fn(),
    View: 'Animated.View',
  },
  Linking: {
    openURL: jest.fn(),
  },
  PermissionsAndroid: {
    request: jest.fn(),
    PERMISSIONS: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
  },
  NativeModules: {
    VoiceModule: {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
    },
    TTSModule: {
      speak: jest.fn(),
      stop: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
}));

// Mock React Native Device Info
jest.mock('react-native-device-info', () => ({
  isEmulator: jest.fn().mockResolvedValue(false),
  isRooted: jest.fn().mockResolvedValue(false),
  getBrand: jest.fn().mockResolvedValue('Apple'),
  getSystemVersion: jest.fn().mockResolvedValue('15.0'),
  getModel: jest.fn().mockResolvedValue('iPhone 13'),
  getUniqueId: jest.fn().mockResolvedValue('test-device-id'),
  getVersion: jest.fn().mockResolvedValue('1.0.0'),
  getBuildNumber: jest.fn().mockResolvedValue('1'),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock React Native Permissions
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: {
      MICROPHONE: 'ios.permission.MICROPHONE',
      SPEECH_RECOGNIZER: 'ios.permission.SPEECH_RECOGNIZER',
    },
    ANDROID: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
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

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
  PanGestureHandler: ({ children }) => children,
  TapGestureHandler: ({ children }) => children,
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
}));

// Mock React Native Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

// Mock React Native Vector Icons
jest.mock('react-native-vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
  FontAwesome: 'FontAwesome',
  FontAwesome5: 'FontAwesome5',
}));

// Mock React Native Config
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://localhost:3030',
  ENV: 'test',
}));

// Mock React Query
jest.mock('react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
  QueryClient: jest.fn(),
  QueryClientProvider: jest.fn(),
}));

// Mock React Hook Form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
  Controller: jest.fn(),
}));

// Mock Zustand
jest.mock('zustand', () => ({
  create: jest.fn(() => {
    const storeState = {
      user: null,
      isAuthenticated: false,
      sessionToken: null,
      isListening: false,
      isSpeaking: false,
      isConnected: false,
      transcription: '',
      response: '',
      audioLevel: 0,
      conversations: [],
      currentConversation: null,
      isLoading: false,
      error: null,
      settings: {},
      permissions: {},
      reset: jest.fn(),
      setUser: jest.fn(),
      setAuthenticated: jest.fn(),
      setSessionToken: jest.fn(),
      setListening: jest.fn(),
      setSpeaking: jest.fn(),
      setConnected: jest.fn(),
      setTranscription: jest.fn(),
      setResponse: jest.fn(),
      setAudioLevel: jest.fn(),
      addConversation: jest.fn(),
      clearConversations: jest.fn(),
      setCurrentConversation: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      updateSettings: jest.fn(),
      setPermission: jest.fn(),
      updatePermissions: jest.fn(),
    };
    
    return jest.fn((selector) => {
      if (selector) {
        return selector(storeState);
      }
      return storeState;
    });
  }),
}));

// Global fetch mock
global.fetch = jest.fn();

// Mock document for React Native Testing Library
global.document = {
  createElement: jest.fn(() => ({
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  })),
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  createTextNode: jest.fn(),
  head: {
    appendChild: jest.fn(),
  },
};

// Global console mock to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
