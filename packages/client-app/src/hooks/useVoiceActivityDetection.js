import { useState, useRef, useCallback, useEffect } from 'react';
export const useVoiceActivityDetection = (config = {}, callbacks = {}) => {
    const defaultConfig = {
        threshold: 0.3,
        silenceTimeout: 1000,
        minSpeechDuration: 200,
        sampleRate: 16000,
        frameSize: 1024,
        ...config,
    };
    const [state, setState] = useState({
        isSpeaking: false,
        isActive: false,
        confidence: 0,
        volume: 0,
        silenceDuration: 0,
    });
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const microphoneRef = useRef(null);
    const streamRef = useRef(null);
    const animationFrameRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const speechStartTimeRef = useRef(0);
    // Initialize audio context and analyser
    const initializeAudio = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: defaultConfig.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            streamRef.current = stream;
            audioContextRef.current = new AudioContext({ sampleRate: defaultConfig.sampleRate });
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = defaultConfig.frameSize;
            analyserRef.current.smoothingTimeConstant = 0.8;
            microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
            microphoneRef.current.connect(analyserRef.current);
            return stream;
        }
        catch (error) {
            console.error('Error initializing VAD audio:', error);
            throw error;
        }
    }, [defaultConfig.sampleRate, defaultConfig.frameSize]);
    // Calculate voice activity features
    const calculateVADFeatures = useCallback((dataArray) => {
        // Calculate RMS (Root Mean Square) for volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += (dataArray[i] / 255) ** 2;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const volume = Math.min(1, rms * 2); // Scale to 0-1
        // Calculate spectral centroid for voice activity
        let weightedSum = 0;
        let totalSum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const frequency = (i * defaultConfig.sampleRate) / (2 * dataArray.length);
            const magnitude = dataArray[i] / 255;
            weightedSum += frequency * magnitude;
            totalSum += magnitude;
        }
        const spectralCentroid = totalSum > 0 ? weightedSum / totalSum : 0;
        // Voice activity confidence based on volume and spectral characteristics
        const volumeConfidence = Math.min(1, volume / defaultConfig.threshold);
        const spectralConfidence = Math.min(1, spectralCentroid / 2000); // Normalize to typical speech range
        const confidence = (volumeConfidence + spectralConfidence) / 2;
        // Determine if voice is active
        const isActive = confidence > defaultConfig.threshold && volume > defaultConfig.threshold * 0.5;
        return { volume, confidence, isActive };
    }, [defaultConfig.threshold, defaultConfig.sampleRate]);
    // Main VAD processing loop
    const processVAD = useCallback(() => {
        if (!analyserRef.current)
            return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const { volume, confidence, isActive } = calculateVADFeatures(dataArray);
        setState(prevState => {
            const now = Date.now();
            let newState = { ...prevState, volume, confidence };
            // Handle speech start
            if (isActive && !prevState.isActive) {
                speechStartTimeRef.current = now;
                newState.isActive = true;
                newState.silenceDuration = 0;
                callbacks.onActivityChange?.(true);
            }
            // Handle speech end
            if (!isActive && prevState.isActive) {
                const speechDuration = now - speechStartTimeRef.current;
                if (speechDuration >= defaultConfig.minSpeechDuration) {
                    newState.isSpeaking = false;
                    newState.isActive = false;
                    callbacks.onSpeechEnd?.();
                    callbacks.onActivityChange?.(false);
                }
            }
            // Handle speaking state
            if (isActive && !prevState.isSpeaking) {
                const speechDuration = now - speechStartTimeRef.current;
                if (speechDuration >= defaultConfig.minSpeechDuration) {
                    newState.isSpeaking = true;
                    callbacks.onSpeechStart?.();
                }
            }
            // Update silence duration
            if (!isActive) {
                newState.silenceDuration = prevState.silenceDuration + 16; // ~60fps
            }
            else {
                newState.silenceDuration = 0;
            }
            // Auto-stop after silence timeout
            if (newState.silenceDuration >= defaultConfig.silenceTimeout && newState.isSpeaking) {
                newState.isSpeaking = false;
                newState.isActive = false;
                callbacks.onSpeechEnd?.();
                callbacks.onActivityChange?.(false);
            }
            return newState;
        });
        callbacks.onVolumeChange?.(volume);
        animationFrameRef.current = requestAnimationFrame(processVAD);
    }, [calculateVADFeatures, callbacks, defaultConfig.minSpeechDuration, defaultConfig.silenceTimeout]);
    // Start VAD processing
    const startVAD = useCallback(async () => {
        try {
            await initializeAudio();
            processVAD();
        }
        catch (error) {
            console.error('Error starting VAD:', error);
        }
    }, [initializeAudio, processVAD]);
    // Stop VAD processing
    const stopVAD = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setState({
            isSpeaking: false,
            isActive: false,
            confidence: 0,
            volume: 0,
            silenceDuration: 0,
        });
    }, []);
    // Update configuration
    const updateConfig = useCallback((newConfig) => {
        Object.assign(defaultConfig, newConfig);
    }, []);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopVAD();
        };
    }, [stopVAD]);
    return {
        // State
        isSpeaking: state.isSpeaking,
        isActive: state.isActive,
        confidence: state.confidence,
        volume: state.volume,
        silenceDuration: state.silenceDuration,
        // Actions
        startVAD,
        stopVAD,
        updateConfig,
        // Configuration
        config: defaultConfig,
    };
};
