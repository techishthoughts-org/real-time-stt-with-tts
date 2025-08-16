import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceCommand {
  id: string;
  phrases: string[];
  action: () => void;
  description: string;
  category: string;
  enabled: boolean;
}

interface VoiceCommandConfig {
  enabled: boolean;
  sensitivity: number; // 0-1
  language: string;
  wakeWord: string;
  wakeWordEnabled: boolean;
  autoExecute: boolean;
}

interface VoiceCommandState {
  isListening: boolean;
  isWakeWordDetected: boolean;
  lastCommand: string | null;
  confidence: number;
  isProcessing: boolean;
}

export const useVoiceCommands = (config: Partial<VoiceCommandConfig> = {}) => {
  const defaultConfig: VoiceCommandConfig = {
    enabled: true,
    sensitivity: 0.8,
    language: 'pt-BR',
    wakeWord: 'gon',
    wakeWordEnabled: true,
    autoExecute: true,
    ...config,
  };

  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    isWakeWordDetected: false,
    lastCommand: null,
    confidence: 0,
    isProcessing: false,
  });

  const commandsRef = useRef<Map<string, VoiceCommand>>(new Map());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (!defaultConfig.enabled || !('webkitSpeechRecognition' in window)) {
      return null;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = defaultConfig.language;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true }));
      isListeningRef.current = true;
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
      isListeningRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript.toLowerCase().trim())
        .join(' ');

      const confidence = event.results[event.results.length - 1][0].confidence;

      setState(prev => ({ ...prev, confidence }));

      // Check for wake word
      if (defaultConfig.wakeWordEnabled && !state.isWakeWordDetected) {
        if (transcript.includes(defaultConfig.wakeWord.toLowerCase())) {
          setState(prev => ({ ...prev, isWakeWordDetected: true }));
          console.log('Wake word detected!');
          return;
        }
      }

      // Process commands if wake word is detected or disabled
      if (!defaultConfig.wakeWordEnabled || state.isWakeWordDetected) {
        processCommand(transcript, confidence);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setState(prev => ({ ...prev, isListening: false }));
    };

    return recognition;
  }, [defaultConfig.enabled, defaultConfig.language, defaultConfig.wakeWordEnabled, defaultConfig.wakeWord, state.isWakeWordDetected]);

  // Process voice command
  const processCommand = useCallback((transcript: string, confidence: number) => {
    if (confidence < defaultConfig.sensitivity) return;

    setState(prev => ({ ...prev, lastCommand: transcript, isProcessing: true }));

    // Find matching command
    let bestMatch: VoiceCommand | null = null;
    let bestScore = 0;

    for (const command of commandsRef.current.values()) {
      if (!command.enabled) continue;

      for (const phrase of command.phrases) {
        const score = calculateSimilarity(transcript, phrase);
        if (score > bestScore && score >= defaultConfig.sensitivity) {
          bestScore = score;
          bestMatch = command;
        }
      }
    }

    if (bestMatch) {
      console.log(`Executing command: ${bestMatch.id} (confidence: ${bestScore.toFixed(2)})`);
      
      if (defaultConfig.autoExecute) {
        bestMatch.action();
      }
      
      // Reset wake word detection
      if (defaultConfig.wakeWordEnabled) {
        setState(prev => ({ ...prev, isWakeWordDetected: false }));
      }
    }

    setState(prev => ({ ...prev, isProcessing: false }));
  }, [defaultConfig.sensitivity, defaultConfig.autoExecute, defaultConfig.wakeWordEnabled]);

  // Calculate similarity between transcript and command phrase
  const calculateSimilarity = useCallback((transcript: string, phrase: string): number => {
    const transcriptWords = transcript.split(' ');
    const phraseWords = phrase.toLowerCase().split(' ');
    
    let matches = 0;
    for (const word of transcriptWords) {
      if (phraseWords.some(phraseWord => 
        word.includes(phraseWord) || phraseWord.includes(word)
      )) {
        matches++;
      }
    }
    
    return matches / Math.max(transcriptWords.length, phraseWords.length);
  }, []);

  // Register a voice command
  const registerCommand = useCallback((command: VoiceCommand) => {
    commandsRef.current.set(command.id, command);
    console.log(`Registered voice command: ${command.id}`);
  }, []);

  // Unregister a voice command
  const unregisterCommand = useCallback((commandId: string) => {
    commandsRef.current.delete(commandId);
    console.log(`Unregistered voice command: ${commandId}`);
  }, []);

  // Start listening for voice commands
  const startListening = useCallback(() => {
    if (!defaultConfig.enabled) return;

    recognitionRef.current = initializeRecognition();
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  }, [defaultConfig.enabled, initializeRecognition]);

  // Stop listening for voice commands
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState(prev => ({ 
      ...prev, 
      isListening: false, 
      isWakeWordDetected: false 
    }));
  }, []);

  // Execute a command manually
  const executeCommand = useCallback((commandId: string) => {
    const command = commandsRef.current.get(commandId);
    if (command && command.enabled) {
      command.action();
    }
  }, []);

  // Get all registered commands
  const getCommands = useCallback(() => {
    return Array.from(commandsRef.current.values());
  }, []);

  // Get commands by category
  const getCommandsByCategory = useCallback((category: string) => {
    return Array.from(commandsRef.current.values())
      .filter(command => command.category === category);
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<VoiceCommandConfig>) => {
    Object.assign(defaultConfig, newConfig);
    
    // Restart recognition if needed
    if (isListeningRef.current) {
      stopListening();
      startListening();
    }
  }, [defaultConfig, stopListening, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    // State
    isListening: state.isListening,
    isWakeWordDetected: state.isWakeWordDetected,
    lastCommand: state.lastCommand,
    confidence: state.confidence,
    isProcessing: state.isProcessing,

    // Actions
    startListening,
    stopListening,
    registerCommand,
    unregisterCommand,
    executeCommand,
    updateConfig,

    // Data
    getCommands,
    getCommandsByCategory,

    // Configuration
    config: defaultConfig,
  };
};
