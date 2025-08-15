// Mock React Native polyfills - using moduleNameMapper instead

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock React Native Voice
jest.mock('@react-native-community/voice', () => ({
  onSpeechStart: jest.fn(),
  onSpeechRecognized: jest.fn(),
  onSpeechEnd: jest.fn(),
  onSpeechError: jest.fn(),
  onSpeechResults: jest.fn(),
  onSpeechPartialResults: jest.fn(),
  onSpeechVolumeChanged: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  removeAllListeners: jest.fn(),
}));

// Mock React Native TTS
jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  getInitStatus: jest.fn(() => Promise.resolve('success')),
}));

// Mock React Native Permissions
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
  requestMultiple: jest.fn(),
}));

// Mock React Native Keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

// Mock React Native Biometrics
jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'TouchID' })),
  simplePrompt: jest.fn(() => Promise.resolve({ success: true })),
  createKeys: jest.fn(),
  deleteKeys: jest.fn(),
  createSignature: jest.fn(),
  sensorExists: jest.fn(),
}));

// Mock React Native Device Info
jest.mock('react-native-device-info', () => ({
  getBrand: jest.fn(() => Promise.resolve('Apple')),
  getModel: jest.fn(() => Promise.resolve('iPhone')),
  getSystemVersion: jest.fn(() => Promise.resolve('15.0')),
  getBuildNumber: jest.fn(() => Promise.resolve('1')),
  isEmulator: jest.fn(() => Promise.resolve(false)),
  isRooted: jest.fn(() => Promise.resolve(false)),
  isTablet: jest.fn(() => Promise.resolve(false)),
}));

// Mock React Native Linear Gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock Lottie React Native
jest.mock('lottie-react-native', () => 'LottieView');

// Mock React Native Splash Screen
jest.mock('react-native-splash-screen', () => ({
  hide: jest.fn(),
  show: jest.fn(),
}));

// Mock React Native Haptic Feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock React Native Sound
jest.mock('react-native-sound', () => {
  const Sound = jest.fn().mockImplementation(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    release: jest.fn(),
    setVolume: jest.fn(),
    setNumberOfLoops: jest.fn(),
  }));
  Sound.setCategory = jest.fn();
  return Sound;
});

// Mock React Native Audio Recorder Player
jest.mock('react-native-audio-recorder-player', () => ({
  AudioRecorderPlayer: jest.fn().mockImplementation(() => ({
    startRecorder: jest.fn(),
    stopRecorder: jest.fn(),
    startPlayer: jest.fn(),
    stopPlayer: jest.fn(),
    pausePlayer: jest.fn(),
    resumePlayer: jest.fn(),
    seekToPlayer: jest.fn(),
    setVolume: jest.fn(),
    addRecordBackListener: jest.fn(),
    addPlayBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
  })),
}));

// Mock React Native Push Notification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  getScheduledLocalNotifications: jest.fn(),
  getDeliveredNotifications: jest.fn(),
  removeDeliveredNotifications: jest.fn(),
  removeAllDeliveredNotifications: jest.fn(),
  requestPermissions: jest.fn(),
  abandonPermissions: jest.fn(),
  checkPermissions: jest.fn(),
  getInitialNotification: jest.fn(),
  getBadgeCount: jest.fn(),
  setBadgeCount: jest.fn(),
  clearAllNotifications: jest.fn(),
  getChannels: jest.fn(),
  channelExists: jest.fn(),
  createChannel: jest.fn(),
  channelBlocked: jest.fn(),
  deleteChannel: jest.fn(),
}));

// Mock React Native Background Timer
jest.mock('react-native-background-timer', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
}));

// Mock React Native SVG
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Line: 'Line',
  Rect: 'Rect',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Mask: 'Mask',
  Pattern: 'Pattern',
}));

// Mock React Native Elements
jest.mock('react-native-elements', () => ({
  Button: 'Button',
  Card: 'Card',
  Input: 'Input',
  Icon: 'Icon',
  ListItem: 'ListItem',
  Overlay: 'Overlay',
  Text: 'Text',
  Avatar: 'Avatar',
  Badge: 'Badge',
  CheckBox: 'CheckBox',
  Divider: 'Divider',
  Header: 'Header',
  PricingCard: 'PricingCard',
  Rating: 'Rating',
  SearchBar: 'SearchBar',
  Slider: 'Slider',
  SocialIcon: 'SocialIcon',
  Tab: 'Tab',
  TabView: 'TabView',
  Tile: 'Tile',
  Tooltip: 'Tooltip',
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

// Mock React Native Crashlytics
jest.mock('react-native-crashlytics', () => ({
  crash: jest.fn(),
  log: jest.fn(),
  recordError: jest.fn(),
  setUserIdentifier: jest.fn(),
  setUserName: jest.fn(),
  setUserEmail: jest.fn(),
  setBool: jest.fn(),
  setString: jest.fn(),
  setNumber: jest.fn(),
}));

// Mock React Native Performance
jest.mock('react-native-performance', () => ({
  PerformanceObserver: jest.fn(),
  Performance: jest.fn(),
}));

// Mock React Native Flipper
jest.mock('react-native-flipper', () => ({
  addPlugin: jest.fn(),
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
  create: jest.fn(),
}));

// Global fetch mock
global.fetch = jest.fn();

// Global console mock to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
