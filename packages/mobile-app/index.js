import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './src/App';

// Register the app with a consistent name
const APP_NAME = 'GonVoiceAssistant';

// Register the app
AppRegistry.registerComponent(APP_NAME, () => App);

// For Expo
registerRootComponent(App);

// For web
if (typeof document !== 'undefined') {
  AppRegistry.runApplication(APP_NAME, {
    rootTag: document.getElementById('root') || document.getElementById('app') || document.body,
  });
}
