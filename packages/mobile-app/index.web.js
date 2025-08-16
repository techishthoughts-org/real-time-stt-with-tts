import { AppRegistry } from 'react-native';
import App from './src/App';

// Register the app for web
AppRegistry.registerComponent('GonVoiceAssistant', () => App);

// Run the app for web
if (typeof document !== 'undefined') {
  AppRegistry.runApplication('GonVoiceAssistant', {
    rootTag: document.getElementById('root') || document.getElementById('app') || document.body,
  });
}
