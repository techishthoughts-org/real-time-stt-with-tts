import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Alert, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import SplashScreen from 'react-native-splash-screen';
import { logger } from '@voice/observability';

import { useAppStore, useIsAuthenticated, useAppStatus } from './store';
import { securityService } from './services/security';
import { useHealthCheck } from './services/api';

import { PermissionsProvider } from './contexts/PermissionsContext';
import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';

import ConversationScreen from './screens/ConversationScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import LoadingScreen from './screens/LoadingScreen';

const Stack = createStackNavigator();

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const AppContent: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSecurityInitialized, setIsSecurityInitialized] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const { isLoading, error } = useAppStatus();
  const { setError } = useAppStore();
  
  // Health check
  const { data: healthData, error: healthError } = useHealthCheck();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('Initializing Gon Voice Assistant mobile app');
        
        // Initialize security service
        await securityService.initialize();
        setIsSecurityInitialized(true);
        
        // Check for stored authentication
        const storedToken = await securityService.getSecureData('sessionToken');
        if (storedToken) {
          useAppStore.getState().setSessionToken(storedToken);
          useAppStore.getState().setAuthenticated(true);
        }
        
        // Hide splash screen
        SplashScreen.hide();
        
        setIsInitialized(true);
        logger.info('App initialization completed');
      } catch (error) {
        logger.error('App initialization failed', error);
        setError(error instanceof Error ? error.message : 'Initialization failed');
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [setError]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      logger.info('App state changed', { nextAppState });
      
      if (nextAppState === 'active') {
        // App became active - refresh data
        queryClient.invalidateQueries();
      } else if (nextAppState === 'background') {
        // App went to background - save state
        logger.info('App going to background - saving state');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Handle health check errors
  useEffect(() => {
    if (healthError) {
      logger.error('Health check failed', healthError);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the voice assistant server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  }, [healthError]);

  // Handle app errors
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Error',
        error,
        [
          {
            text: 'OK',
            onPress: () => setError(null),
          },
        ]
      );
    }
  }, [error, setError]);

  // Show loading screen while initializing
  if (!isInitialized || !isSecurityInitialized) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PermissionsProvider>
            <VoiceAssistantProvider>
              <NavigationContainer>
                <StatusBar 
                  barStyle="dark-content" 
                  backgroundColor="#ffffff"
                  animated={true}
                />
                <Stack.Navigator
                  initialRouteName={isAuthenticated ? "Home" : "Login"}
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: '#007AFF',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                      fontWeight: 'bold',
                    },
                    headerShadowVisible: false,
                    headerBackTitleVisible: false,
                    gestureEnabled: true,
                    animationTypeForReplace: 'push',
                  }}
                >
                  {!isAuthenticated ? (
                    <Stack.Screen
                      name="Login"
                      component={LoginScreen}
                      options={{ 
                        title: 'Gon Voice Assistant',
                        headerShown: false,
                      }}
                    />
                  ) : (
                    <>
                      <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ 
                          title: 'Gon Voice Assistant',
                          headerRight: () => (
                            <HealthIndicator 
                              isHealthy={!healthError} 
                              data={healthData}
                            />
                          ),
                        }}
                      />
                      <Stack.Screen
                        name="Conversation"
                        component={ConversationScreen}
                        options={{ 
                          title: 'Conversation History',
                          presentation: 'modal',
                        }}
                      />
                      <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{ 
                          title: 'Settings',
                          presentation: 'modal',
                        }}
                      />
                    </>
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            </VoiceAssistantProvider>
          </PermissionsProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
      {__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

// Health indicator component
const HealthIndicator: React.FC<{ 
  isHealthy: boolean; 
  data?: any; 
}> = ({ isHealthy, data }) => {
  const { MaterialIcons } = require('@expo/vector-icons');
  
  return (
    <MaterialIcons
      name={isHealthy ? 'wifi' : 'wifi-off'}
      size={24}
      color={isHealthy ? '#4CAF50' : '#F44336'}
      style={{ marginRight: 16 }}
    />
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;
