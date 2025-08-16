import { useRef, useCallback, useEffect } from 'react';
export const useNoiseCancellation = (config = {}) => {
    const defaultConfig = {
        enabled: true,
        noiseReductionLevel: 0.7,
        echoCancellation: true,
        autoGainControl: true,
        sampleRate: 16000,
        frameSize: 1024,
        ...config,
    };
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const noiseProfileRef = useRef(null);
    const isProcessingRef = useRef(false);
    // Create spectral subtraction noise reduction processor
    const createNoiseProcessor = useCallback(() => {
        let noiseProfile = null;
        let frameCount = 0;
        const process = (input) => {
            if (!defaultConfig.enabled || !noiseProfile) {
                return input;
            }
            // Apply spectral subtraction
            const output = new Float32Array(input.length);
            const alpha = defaultConfig.noiseReductionLevel;
            for (let i = 0; i < input.length; i++) {
                const signalPower = input[i] ** 2;
                const noisePower = noiseProfile[i] ** 2;
                const snr = signalPower / (noisePower + 1e-10);
                // Spectral subtraction with spectral floor
                const gain = Math.max(0.1, 1 - alpha / snr);
                output[i] = input[i] * gain;
            }
            return output;
        };
        const updateNoiseProfile = (noiseSample) => {
            if (!noiseProfile) {
                noiseProfile = new Float32Array(noiseSample.length);
            }
            // Update noise profile using exponential averaging
            const alpha = 0.95;
            for (let i = 0; i < noiseSample.length; i++) {
                noiseProfile[i] = alpha * noiseProfile[i] + (1 - alpha) * noiseSample[i];
            }
            frameCount++;
        };
        const reset = () => {
            noiseProfile = null;
            frameCount = 0;
        };
        return { process, updateNoiseProfile, reset };
    }, [defaultConfig.enabled, defaultConfig.noiseReductionLevel]);
    // Initialize audio context with noise cancellation
    const initializeAudioContext = useCallback(async (stream) => {
        if (!defaultConfig.enabled)
            return stream;
        try {
            audioContextRef.current = new AudioContext({ sampleRate: defaultConfig.sampleRate });
            processorRef.current = createNoiseProcessor();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const destination = audioContextRef.current.createMediaStreamDestination();
            // Create audio processing nodes
            const gainNode = audioContextRef.current.createGain();
            const analyserNode = audioContextRef.current.createAnalyser();
            analyserNode.fftSize = defaultConfig.frameSize;
            // Connect nodes
            source.connect(analyserNode);
            analyserNode.connect(gainNode);
            gainNode.connect(destination);
            // Process audio in real-time
            const processAudio = () => {
                if (!isProcessingRef.current)
                    return;
                const dataArray = new Float32Array(analyserNode.frequencyBinCount);
                analyserNode.getFloatFrequencyData(dataArray);
                // Apply noise cancellation
                if (processorRef.current) {
                    const processedData = processorRef.current.process(dataArray);
                    // Update gain based on processed audio
                    const rms = Math.sqrt(processedData.reduce((sum, val) => sum + val ** 2, 0) / processedData.length);
                    const targetGain = Math.max(0.1, Math.min(2.0, 1.0 / (rms + 0.1)));
                    gainNode.gain.setTargetAtTime(targetGain, audioContextRef.current.currentTime, 0.1);
                }
                requestAnimationFrame(processAudio);
            };
            isProcessingRef.current = true;
            processAudio();
            return destination.stream;
        }
        catch (error) {
            console.error('Error initializing noise cancellation:', error);
            return stream;
        }
    }, [defaultConfig.enabled, defaultConfig.sampleRate, defaultConfig.frameSize, createNoiseProcessor]);
    // Calibrate noise profile
    const calibrateNoise = useCallback(async (duration = 3000) => {
        if (!defaultConfig.enabled || !processorRef.current)
            return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: defaultConfig.sampleRate,
                    channelCount: 1,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            const audioContext = new AudioContext({ sampleRate: defaultConfig.sampleRate });
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = defaultConfig.frameSize;
            source.connect(analyser);
            const calibrate = () => {
                const dataArray = new Float32Array(analyser.frequencyBinCount);
                analyser.getFloatFrequencyData(dataArray);
                if (processorRef.current) {
                    processorRef.current.updateNoiseProfile(dataArray);
                }
            };
            // Collect noise samples for the specified duration
            const interval = setInterval(calibrate, 100);
            setTimeout(() => {
                clearInterval(interval);
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
                console.log('Noise calibration completed');
            }, duration);
        }
        catch (error) {
            console.error('Error calibrating noise:', error);
        }
    }, [defaultConfig.enabled, defaultConfig.sampleRate, defaultConfig.frameSize]);
    // Update configuration
    const updateConfig = useCallback((newConfig) => {
        Object.assign(defaultConfig, newConfig);
        if (processorRef.current) {
            processorRef.current.reset();
        }
    }, []);
    // Start noise cancellation
    const startNoiseCancellation = useCallback(async (stream) => {
        if (!defaultConfig.enabled)
            return stream;
        return await initializeAudioContext(stream);
    }, [defaultConfig.enabled, initializeAudioContext]);
    // Stop noise cancellation
    const stopNoiseCancellation = useCallback(() => {
        isProcessingRef.current = false;
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.reset();
        }
    }, []);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopNoiseCancellation();
        };
    }, [stopNoiseCancellation]);
    return {
        // Actions
        startNoiseCancellation,
        stopNoiseCancellation,
        calibrateNoise,
        updateConfig,
        // State
        isEnabled: defaultConfig.enabled,
        config: defaultConfig,
    };
};
