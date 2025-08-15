import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PermissionsProvider } from './contexts/PermissionsContext';
import { VoiceAssistantProvider } from './contexts/VoiceAssistantContext';

import ConversationScreen from './screens/ConversationScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PermissionsProvider>
          <VoiceAssistantProvider>
            <NavigationContainer>
              <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
              <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#007AFF',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              >
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ title: 'Gon Voice Assistant' }}
                />
                <Stack.Screen
                  name="Conversation"
                  component={ConversationScreen}
                  options={{ title: 'Conversation' }}
                />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{ title: 'Settings' }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </VoiceAssistantProvider>
        </PermissionsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
