export class AudioCaptureService {
    mediaStream = null;
    audioContext = null;
    processor = null;
    source = null;
    isCapturing = false;
    frameSeq = 0;
    currentAudioLevel = 0;
    async initialize() {
        try {
            console.log('🎤 Requesting microphone access...');
            // Request microphone access with specific constraints
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            console.log('✅ Microphone access granted');
            console.log('📊 Audio tracks:', this.mediaStream.getAudioTracks().map((track) => ({
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState,
                settings: track.getSettings(),
            })));
            // Create audio context with specific sample rate
            this.audioContext = new AudioContext({ sampleRate: 16000 });
            console.log('🔊 Audio context created:', {
                sampleRate: this.audioContext.sampleRate,
                state: this.audioContext.state,
            });
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
            console.log('✅ Audio capture initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize audio capture:', error);
            throw error;
        }
    }
    async startCapture(onAudioFrame) {
        if (!this.audioContext || !this.processor || !this.source) {
            throw new Error('Audio capture not initialized');
        }
        this.isCapturing = true;
        this.frameSeq = 0;
        let frameCount = 0;
        let speechFrameCount = 0;
        console.log('🎙️ Starting audio capture...');
        this.processor.onaudioprocess = (event) => {
            if (!this.isCapturing)
                return;
            const inputBuffer = event.inputBuffer;
            const channelData = inputBuffer.getChannelData(0);
            // Calculate RMS for VAD and audio level
            const rms = this.calculateRMS(channelData);
            this.currentAudioLevel = rms;
            // Enhanced VAD with multiple thresholds
            const isVoice = rms > 0.01; // Lower threshold for better sensitivity
            frameCount++;
            if (isVoice)
                speechFrameCount++;
            // Log audio activity every 50 frames (about every second)
            if (frameCount % 50 === 0) {
                console.log(`📈 Audio stats: ${frameCount} frames processed, ${speechFrameCount} with speech, current RMS: ${rms.toFixed(4)}`);
            }
            // Create AudioFrame with detailed info
            const frame = {
                seq: this.frameSeq++,
                timestamp: Date.now(),
                format: {
                    sampleRate: inputBuffer.sampleRate,
                    channels: 1,
                    encoding: 'pcm16',
                },
                vad: isVoice ? 'speech' : 'silence',
                rms,
            };
            // Log speech frames for debugging
            if (isVoice) {
                console.log(`🗣️ SPEECH detected - Frame ${frame.seq}, RMS: ${rms.toFixed(4)}, Timestamp: ${frame.timestamp}`);
            }
            onAudioFrame(frame);
        };
        // Connect the audio graph
        this.source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
        console.log('✅ Audio capture started - listening for speech...');
    }
    stopCapture() {
        this.isCapturing = false;
        if (this.processor) {
            this.processor.disconnect();
            this.processor.onaudioprocess = null;
        }
        console.log('🛑 Audio capture stopped');
    }
    cleanup() {
        this.stopCapture();
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => {
                track.stop();
                console.log(`🔇 Stopped audio track: ${track.label}`);
            });
            this.mediaStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.source = null;
        this.processor = null;
        console.log('🧹 Audio capture cleaned up');
    }
    calculateRMS(channelData) {
        let sum = 0;
        for (let i = 0; i < channelData.length; i++) {
            sum += channelData[i] * channelData[i];
        }
        return Math.sqrt(sum / channelData.length);
    }
    getAudioLevel() {
        return this.currentAudioLevel;
    }
}
