import { Platform } from 'react-native';
import { logger } from '@voice/observability';

export interface VoiceService {
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  speak(text: string): Promise<void>;
  stopSpeaking(): Promise<void>;
  isListening(): boolean;
  isSpeaking(): boolean;
  requestPermissions(): Promise<boolean>;
}

class WebVoiceService implements VoiceService {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isListeningState = false;
  private isSpeakingState = false;
  private onTranscription?: (text: string) => void;
  private onError?: (error: string) => void;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript && this.onTranscription) {
          this.onTranscription(finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        logger.error('Speech recognition error:', event.error);
        if (this.onError) {
          this.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListeningState = false;
      };
    } else {
      logger.warn('Speech recognition not supported in this browser');
    }
  }

  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not available');
    }

    try {
      this.recognition.start();
      this.isListeningState = true;
      logger.info('Started listening on web');
    } catch (error) {
      logger.error('Failed to start listening on web:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.recognition) {
      return;
    }

    try {
      this.recognition.stop();
      this.isListeningState = false;
      logger.info('Stopped listening on web');
    } catch (error) {
      logger.error('Failed to stop listening on web:', error);
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not available');
    }

    try {
      // Stop any current speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.isSpeakingState = true;
        logger.info('Started speaking on web');
      };

      utterance.onend = () => {
        this.isSpeakingState = false;
        logger.info('Finished speaking on web');
      };

      utterance.onerror = (event) => {
        this.isSpeakingState = false;
        logger.error('Speech synthesis error on web:', event);
      };

      this.synthesis.speak(utterance);
    } catch (error) {
      logger.error('Failed to speak on web:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    if (!this.synthesis) {
      return;
    }

    try {
      this.synthesis.cancel();
      this.isSpeakingState = false;
      logger.info('Stopped speaking on web');
    } catch (error) {
      logger.error('Failed to stop speaking on web:', error);
      throw error;
    }
  }

  isListening(): boolean {
    return this.isListeningState;
  }

  isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  async requestPermissions(): Promise<boolean> {
    // Web browsers handle permissions automatically
    return true;
  }

  setTranscriptionCallback(callback: (text: string) => void) {
    this.onTranscription = callback;
  }

  setErrorCallback(callback: (error: string) => void) {
    this.onError = callback;
  }
}

class NativeVoiceService implements VoiceService {
  private isListeningState = false;
  private isSpeakingState = false;

  async startListening(): Promise<void> {
    try {
      // Import native modules dynamically to avoid web bundling issues
      const { Voice } = await import('@react-native-community/voice');
      
      Voice.onSpeechResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          logger.info('Speech recognition result:', e.value[0]);
        }
      };

      Voice.onSpeechError = (e: any) => {
        logger.error('Speech recognition error:', e);
      };

      await Voice.start('en-US');
      this.isListeningState = true;
      logger.info('Started listening on native platform');
    } catch (error) {
      logger.error('Failed to start listening on native platform:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      const { Voice } = await import('@react-native-community/voice');
      await Voice.stop();
      this.isListeningState = false;
      logger.info('Stopped listening on native platform');
    } catch (error) {
      logger.error('Failed to stop listening on native platform:', error);
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    try {
      const Tts = await import('react-native-tts');
      
      Tts.default.setDefaultLanguage('en-US');
      Tts.default.setDefaultRate(0.5);
      Tts.default.setDefaultPitch(1.0);

      Tts.default.on('tts-start', () => {
        this.isSpeakingState = true;
        logger.info('Started speaking on native platform');
      });

      Tts.default.on('tts-finish', () => {
        this.isSpeakingState = false;
        logger.info('Finished speaking on native platform');
      });

      Tts.default.on('tts-cancel', () => {
        this.isSpeakingState = false;
        logger.info('Cancelled speaking on native platform');
      });

      await Tts.default.speak(text);
    } catch (error) {
      logger.error('Failed to speak on native platform:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      const Tts = await import('react-native-tts');
      await Tts.default.stop();
      this.isSpeakingState = false;
      logger.info('Stopped speaking on native platform');
    } catch (error) {
      logger.error('Failed to stop speaking on native platform:', error);
      throw error;
    }
  }

  isListening(): boolean {
    return this.isListeningState;
  }

  isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { request, PERMISSIONS, RESULTS } = await import('react-native-permissions');
      
      const result = await request(
        Platform.OS === 'ios' 
          ? PERMISSIONS.IOS.MICROPHONE 
          : PERMISSIONS.ANDROID.RECORD_AUDIO
      );
      
      return result === RESULTS.GRANTED;
    } catch (error) {
      logger.error('Failed to request permissions:', error);
      return false;
    }
  }
}

// Factory function to create the appropriate voice service
export function createVoiceService(): VoiceService {
  if (Platform.OS === 'web') {
    return new WebVoiceService();
  } else {
    return new NativeVoiceService();
  }
}

// Export the service instance
export const voiceService = createVoiceService();
