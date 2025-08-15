export class RealTimeSTTService {
    recognition = null;
    isListening = false;
    onPartialCallback = null;
    onFinalCallback = null;
    constructor() {
        // Check if browser supports speech recognition
        const SpeechRecognition = window.SpeechRecognition ||
            window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.setupRecognition();
        }
        else {
            console.warn('Speech recognition not supported in this browser');
        }
    }
    setupRecognition() {
        if (!this.recognition)
            return;
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR'; // Portuguese (Brazil) for Gon
        this.recognition.maxAlternatives = 1;
        // Handle results
        this.recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                const confidence = result[0].confidence || 0.8;
                if (result.isFinal) {
                    console.log('🎯 REAL STT FINAL:', transcript, confidence);
                    this.onFinalCallback?.(transcript, confidence);
                }
                else {
                    console.log('⚡ REAL STT PARTIAL:', transcript, confidence);
                    this.onPartialCallback?.(transcript, confidence);
                }
            }
        };
        // Handle errors
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };
        // Handle end
        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            if (this.isListening) {
                // Restart if we're supposed to be listening
                setTimeout(() => {
                    if (this.isListening) {
                        this.recognition?.start();
                    }
                }, 100);
            }
        };
    }
    startListening(onPartial, onFinal) {
        if (!this.recognition) {
            throw new Error('Speech recognition not available');
        }
        this.onPartialCallback = onPartial;
        this.onFinalCallback = onFinal;
        this.isListening = true;
        try {
            this.recognition.start();
            console.log('🎤 Real STT started listening...');
        }
        catch (error) {
            console.error('Failed to start speech recognition:', error);
            throw error;
        }
    }
    stopListening() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
            console.log('🛑 Real STT stopped listening');
        }
    }
    isSupported() {
        return this.recognition !== null;
    }
}
