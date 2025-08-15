import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './src/App';

// Register the app for web
AppRegistry.registerComponent('GonVoiceAssistant', () => App);

// For Expo web
registerRootComponent(App);

// For standalone web builds
if (typeof document !== 'undefined') {
  AppRegistry.runApplication('GonVoiceAssistant', {
    rootTag: document.getElementById('root') || document.getElementById('main'),
  });
}
