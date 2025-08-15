import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { config } from '../config';
import { AudioCaptureService } from '../services/audioCapture';
import { RealTimeSTTService } from '../services/realTimeSttService';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { PWAUpdateNotification } from '../components/PWAUpdateNotification';
export function App() {
    const [flags, setFlags] = useState(null);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [transcripts, setTranscripts] = useState([]);
    const [countdown, setCountdown] = useState(0);
    const [debugInfo, setDebugInfo] = useState({ framesSent: 0, speechFramesSent: 0, lastFrameTime: 0 });
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [sttMode, setSttMode] = useState('real');
    const [llmEnabled, setLlmEnabled] = useState(true);
    const [lastUserMessage, setLastUserMessage] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [llmHealth, setLlmHealth] = useState(null);
    const audioService = useRef(null);
    const sttService = useRef(null);
    const frameBuffer = useRef([]);
    useEffect(() => {
        checkServerConnection();
        checkLLMHealth();
        // Initialize real STT service
        sttService.current = new RealTimeSTTService();
        if (!sttService.current.isSupported()) {
            console.warn('Real STT not supported, falling back to simulated mode');
            setSttMode('simulated');
        }
    }, []);
    const checkLLMHealth = async () => {
        try {
            const response = await fetch(`${config.serverUrl}/llm/health`);
            if (response.ok) {
                const health = await response.json();
                setLlmHealth(health);
                console.log('🧠 LLM Health:', health);
            }
        }
        catch (error) {
            console.warn('LLM health check failed:', error);
            setLlmHealth({ status: 'error' });
        }
    };
    const testLLMChat = async (message) => {
        try {
            setLastUserMessage(message);
            setAiResponse('Thinking...');
            const response = await fetch(`${config.serverUrl}/llm/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });
            if (response.ok) {
                const data = await response.json();
                setAiResponse(data.response);
                console.log('🤖 AI Response:', data.response);
            }
            else {
                setAiResponse('Error: ' + response.statusText);
            }
        }
        catch (error) {
            setAiResponse('Error: ' + error.message);
            console.error('LLM chat error:', error);
        }
    };
    const checkServerConnection = async () => {
        try {
            console.log(`🔍 Checking server connection: ${config.serverUrl}/health`);
            const response = await fetch(`${config.serverUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
            });
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            setFlags(data.flags);
            setConnectionStatus('connected');
            setError(null);
            console.log('✅ Server connection successful:', data);
        }
        catch (e) {
            console.error('❌ Server connection failed:', e);
            setError(`Cannot connect to server (${config.serverUrl}): ${e}`);
            setConnectionStatus('error');
        }
    };
    const apiCall = async (endpoint, options = {}) => {
        const url = `${config.serverUrl}${endpoint}`;
        console.log(`📡 API call: ${options.method || 'GET'} ${url}`);
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            mode: 'cors',
        });
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    };
    const testAudioProcessing = async () => {
        setIsProcessing(true);
        console.log('🧪 Testing simulated audio processing...');
        try {
            // Reset stats first
            await apiCall('/webrtc/reset-stats', { method: 'POST' });
            // Simulate audio frame
            const frame = {
                seq: 1,
                timestamp: Date.now(),
                format: { sampleRate: 16000, channels: 1, encoding: 'pcm16' },
                vad: 'speech',
                rms: 0.5,
            };
            console.log('📤 Sending test frame:', frame);
            const result = await apiCall('/webrtc/audio-frame', {
                method: 'POST',
                body: JSON.stringify(frame),
            });
            console.log('📥 Test result:', result);
            // Get final transcription
            const finalResult = await apiCall('/webrtc/finalize', { method: 'POST' });
            console.log('🏁 Final result:', finalResult);
            // Update stats
            const statsData = await apiCall('/webrtc/stats');
            setStats(statsData);
            console.log('📊 Stats:', statsData);
        }
        catch (e) {
            console.error('❌ Test failed:', e);
            setError(String(e));
        }
        finally {
            setIsProcessing(false);
        }
    };
    const startListening = async () => {
        try {
            console.log(`🎙️ Starting listening session with ${sttMode} STT...`);
            setError(null);
            setTranscripts([]);
            frameBuffer.current = [];
            setDebugInfo({ framesSent: 0, speechFramesSent: 0, lastFrameTime: 0 });
            // Initialize audio service for audio level monitoring
            audioService.current = new AudioCaptureService();
            await audioService.current.initialize();
            setIsListening(true);
            setCountdown(10);
            // Start countdown
            const countdownInterval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        stopListening();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            if (sttMode === 'real' && sttService.current) {
                // Use real STT service
                sttService.current.startListening((text, confidence) => {
                    console.log('⚡ REAL STT PARTIAL:', text);
                    setTranscripts((prev) => {
                        const newTranscripts = prev.filter((t) => t.type !== 'partial');
                        return [
                            ...newTranscripts,
                            {
                                type: 'partial',
                                text,
                                confidence,
                                timestamp: Date.now(),
                            },
                        ];
                    });
                }, (text, confidence) => {
                    console.log('🎯 REAL STT FINAL:', text);
                    setTranscripts((prev) => [
                        ...prev,
                        {
                            type: 'final',
                            text,
                            confidence,
                            timestamp: Date.now(),
                        },
                    ]);
                });
            }
            else {
                // Fallback to simulated mode
                await audioService.current.startCapture(handleAudioFrame);
            }
            // Start audio level monitoring
            const levelInterval = setInterval(() => {
                if (audioService.current && isListening) {
                    setAudioLevel(audioService.current.getAudioLevel());
                }
                else {
                    clearInterval(levelInterval);
                }
            }, 100);
            console.log('✅ Started 10-second listening session');
        }
        catch (e) {
            console.error('❌ Failed to start listening:', e);
            setError(`Failed to start listening: ${e}`);
            setIsListening(false);
        }
    };
    const stopListening = async () => {
        console.log('🛑 Stopping listening session...');
        setIsListening(false);
        setCountdown(0);
        if (audioService.current) {
            audioService.current.cleanup();
            audioService.current = null;
        }
        if (sttService.current) {
            sttService.current.stopListening();
        }
        console.log('✅ Listening session completed');
    };
    const handleAudioFrame = async (frame) => {
        frameBuffer.current.push(frame);
        // Update debug info
        setDebugInfo((prev) => ({
            framesSent: prev.framesSent + 1,
            speechFramesSent: prev.speechFramesSent + (frame.vad === 'speech' ? 1 : 0),
            lastFrameTime: frame.timestamp,
        }));
        // Only process speech frames in simulated mode
        if (frame.vad === 'speech') {
            try {
                console.log(`📤 CLIENT: Sending speech frame ${frame.seq} to server...`);
                const result = await apiCall('/webrtc/audio-frame', {
                    method: 'POST',
                    body: JSON.stringify(frame),
                });
                console.log(`📥 CLIENT: Server response:`, result);
                if (result.type === 'partial' && result.data) {
                    console.log(`✨ CLIENT: Got partial transcription: "${result.data.text}"`);
                    setTranscripts((prev) => {
                        // Replace last partial or add new one
                        const newTranscripts = prev.filter((t) => t.type !== 'partial');
                        return [
                            ...newTranscripts,
                            {
                                type: 'partial',
                                text: result.data.text,
                                confidence: result.data.confidence,
                                timestamp: Date.now(),
                            },
                        ];
                    });
                }
            }
            catch (e) {
                console.error('❌ CLIENT: Error processing audio frame:', e);
            }
        }
    };
    if (connectionStatus === 'checking') {
        return (_jsxs("div", { style: { fontFamily: 'system-ui, sans-serif', padding: 24 }, children: [_jsx("h1", { children: "Voice Client (Local by default)" }), _jsx("p", { children: "\uD83D\uDD0D Checking server connection..." })] }));
    }
    return (_jsxs("div", { style: {
            fontFamily: 'system-ui, sans-serif',
            padding: 24,
            maxWidth: 900,
        }, children: [_jsx(PWAUpdateNotification, {}), _jsx(PWAInstallPrompt, {}), _jsx("h1", { children: "Voice Client (Local by default)" }), connectionStatus === 'error' && (_jsxs("div", { style: {
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                }, children: [_jsx("strong", { children: "\u274C Connection Error:" }), " ", error, _jsx("br", {}), _jsx("button", { onClick: checkServerConnection, style: { marginTop: '8px', padding: '4px 8px', fontSize: '14px' }, children: "\uD83D\uDD04 Retry Connection" })] })), connectionStatus === 'connected' && (_jsxs("div", { style: {
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                }, children: [_jsx("strong", { children: "\u2705 Connected to server:" }), " ", config.serverUrl] })), error && connectionStatus === 'connected' && (_jsxs("p", { style: { color: 'red' }, children: ["Error: ", error] })), flags && (_jsxs("div", { children: [_jsx("h2", { children: "Feature Flags" }), _jsxs("ul", { children: [_jsxs("li", { children: ["GPU enabled: ", String(flags.gpuEnabled)] }), _jsxs("li", { children: ["OpenRouter enabled: ", String(flags.openRouterEnabled)] }), _jsxs("li", { children: ["Cloud TTS enabled: ", String(flags.cloudTtsEnabled)] }), _jsxs("li", { children: ["External SFU enabled: ", String(flags.externalSfuEnabled)] }), _jsxs("li", { children: ["Telemetry enabled: ", String(flags.telemetryEnabled)] })] }), _jsx("p", { children: "Defaults are all off (local CPU-only, no cloud)." }), _jsx("h2", { children: "STT Mode Selection" }), _jsxs("div", { style: {
                            marginBottom: '20px',
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                        }, children: [_jsxs("label", { style: { marginRight: '20px' }, children: [_jsx("input", { type: "radio", value: "real", checked: sttMode === 'real', onChange: (e) => setSttMode(e.target.value), disabled: isListening }), "\uD83C\uDFAF Real STT (Browser Speech Recognition)"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", value: "simulated", checked: sttMode === 'simulated', onChange: (e) => setSttMode(e.target.value), disabled: isListening }), "\uD83E\uDDEA Simulated STT (Server Mock)"] }), sttMode === 'real' && !sttService.current?.isSupported() && (_jsx("p", { style: {
                                    color: '#dc3545',
                                    margin: '8px 0 0 0',
                                    fontSize: '14px',
                                }, children: "\u26A0\uFE0F Browser speech recognition not supported. Using simulated mode." }))] }), _jsx("h2", { children: "Audio Pipeline Testing" }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("button", { onClick: isListening ? stopListening : startListening, disabled: isProcessing || connectionStatus !== 'connected', style: {
                                    padding: '12px 24px',
                                    fontSize: '16px',
                                    backgroundColor: isListening ? '#dc3545' : '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isProcessing || connectionStatus !== 'connected'
                                        ? 'not-allowed'
                                        : 'pointer',
                                    marginRight: '10px',
                                }, children: isListening
                                    ? `🛑 Stop Listening (${countdown}s)`
                                    : `🎙️ Start 10s ${sttMode.toUpperCase()} Test` }), _jsx("button", { onClick: testAudioProcessing, disabled: isProcessing || isListening || connectionStatus !== 'connected', style: {
                                    padding: '12px 24px',
                                    fontSize: '16px',
                                    backgroundColor: isProcessing ? '#ccc' : '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isProcessing ||
                                        isListening ||
                                        connectionStatus !== 'connected'
                                        ? 'not-allowed'
                                        : 'pointer',
                                }, children: isProcessing ? 'Processing...' : '🧪 Test Simulated Audio' })] }), isListening && sttMode === 'simulated' && (_jsxs("div", { style: {
                            marginBottom: '20px',
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                        }, children: [_jsx("h3", { children: "\uD83D\uDD0D Real-time Debug Info (Simulated Mode)" }), _jsxs("div", { style: { fontFamily: 'monospace', fontSize: '14px' }, children: [_jsxs("div", { children: ["\uD83D\uDCCA Frames sent: ", debugInfo.framesSent] }), _jsxs("div", { children: ["\uFFFD\uFFFD\uFE0F Speech frames: ", debugInfo.speechFramesSent] }), _jsxs("div", { children: ["\uD83D\uDCC8 Audio level: ", (audioLevel * 100).toFixed(1), "%"] }), _jsxs("div", { children: ["\u23F0 Last frame:", ' ', new Date(debugInfo.lastFrameTime).toLocaleTimeString()] }), _jsxs("div", { children: ["\uD83D\uDCE1 Speech ratio:", ' ', debugInfo.framesSent > 0
                                                ? ((debugInfo.speechFramesSent / debugInfo.framesSent) *
                                                    100).toFixed(1)
                                                : 0, "%"] })] })] })), isListening && (_jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("h3", { children: "\uD83C\uDFB5 Audio Level Monitor" }), _jsx("div", { style: {
                                    width: '100%',
                                    height: '30px',
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '15px',
                                    overflow: 'hidden',
                                    border: '2px solid #ddd',
                                }, children: _jsx("div", { style: {
                                        width: `${Math.min(audioLevel * 1000, 100)}%`, // Amplify for visualization
                                        height: '100%',
                                        backgroundColor: audioLevel > 0.02
                                            ? '#28a745'
                                            : audioLevel > 0.005
                                                ? '#ffc107'
                                                : '#6c757d',
                                        transition: 'width 0.1s ease, background-color 0.1s ease',
                                    } }) }), _jsx("div", { style: { fontSize: '12px', color: '#666', marginTop: '4px' }, children: sttMode === 'real'
                                    ? audioLevel > 0.02
                                        ? '🎯 Real STT Active'
                                        : '🎤 Listening...'
                                    : audioLevel > 0.02
                                        ? '🗣️ SPEECH DETECTED'
                                        : audioLevel > 0.005
                                            ? '🔊 Audio detected'
                                            : '🔇 Silence' })] })), transcripts.length > 0 && (_jsxs("div", { style: { marginBottom: '20px' }, children: [_jsxs("h3", { children: ["\uD83D\uDCDD Live Transcriptions (", sttMode.toUpperCase(), " STT)"] }), _jsx("div", { style: {
                                    backgroundColor: '#f8f9fa',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                }, children: transcripts.map((transcript, index) => (_jsxs("div", { style: {
                                        marginBottom: '8px',
                                        padding: '12px',
                                        backgroundColor: transcript.type === 'final' ? '#d4edda' : '#fff3cd',
                                        borderRadius: '4px',
                                        borderLeft: `4px solid ${transcript.type === 'final' ? '#28a745' : '#ffc107'}`,
                                    }, children: [_jsxs("div", { style: { fontWeight: 'bold', marginBottom: '4px' }, children: [transcript.type === 'final' ? '🎯 FINAL' : '⚡ PARTIAL', ":", ' ', transcript.text] }), _jsxs("small", { style: { color: '#666' }, children: ["Confidence: ", (transcript.confidence * 100).toFixed(1), "% | Time:", ' ', new Date(transcript.timestamp).toLocaleTimeString(), " | Mode: ", sttMode.toUpperCase()] })] }, index))) })] })), stats && sttMode === 'simulated' && (_jsxs("div", { style: { marginTop: '20px' }, children: [_jsx("h3", { children: "\uD83D\uDCCA Pipeline Performance (Simulated Mode)" }), _jsxs("div", { style: {
                                    backgroundColor: '#f5f5f5',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                }, children: [stats.webrtc && (_jsxs("div", { style: { marginBottom: '12px' }, children: [_jsx("strong", { children: "\uD83C\uDF10 WebRTC Stats:" }), _jsx("br", {}), "Total frames received: ", stats.webrtc.totalFramesReceived, _jsx("br", {}), "Speech frames received: ", stats.webrtc.speechFramesReceived, _jsx("br", {}), "Speech ratio: ", (stats.webrtc.speechRatio * 100).toFixed(1), "%"] })), _jsx("strong", { children: "\u26A1 STT Performance:" }), _jsx("br", {}), _jsx("pre", { style: { margin: 0 }, children: JSON.stringify(stats, null, 2) })] })] })), _jsxs("div", { style: {
                            marginTop: '30px',
                            padding: '20px',
                            border: '2px solid #007bff',
                            borderRadius: '8px',
                        }, children: [_jsx("h3", { style: { margin: '0 0 15px 0', color: '#007bff' }, children: "\uD83E\uDDE0 Personal Assistant (LLM)" }), _jsxs("div", { style: {
                                    marginBottom: '15px',
                                    padding: '10px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '4px',
                                }, children: [_jsx("strong", { children: "Health Status:" }), llmHealth ? (_jsxs("div", { style: { marginTop: '8px' }, children: [_jsxs("div", { children: ["Status: ", llmHealth.status === 'ok' ? '✅ OK' : '❌ Error'] }), llmHealth.local && (_jsxs("div", { children: ["Local (Ollama):", ' ', llmHealth.local.available
                                                        ? '🟢 Available'
                                                        : '🔴 Unavailable'] })), llmHealth.cloud && (_jsxs("div", { children: ["Cloud (OpenRouter):", ' ', llmHealth.cloud.available
                                                        ? '🟢 Available'
                                                        : '🔴 Unavailable'] }))] })) : (_jsx("span", { children: " Loading..." }))] }), _jsxs("div", { style: { marginBottom: '15px' }, children: [_jsx("strong", { children: "Test Personal Assistant:" }), _jsxs("div", { style: { display: 'flex', gap: '10px', marginTop: '8px' }, children: [_jsx("button", { onClick: () => testLLMChat('What time is it?'), style: { padding: '8px 12px', fontSize: '14px' }, children: "\uD83D\uDD50 Ask Time" }), _jsx("button", { onClick: () => testLLMChat('Tell me a joke'), style: { padding: '8px 12px', fontSize: '14px' }, children: "\uD83D\uDE04 Tell Joke" }), _jsx("button", { onClick: () => testLLMChat('How can you help me?'), style: { padding: '8px 12px', fontSize: '14px' }, children: "\u2753 Ask Capabilities" }), _jsx("button", { onClick: () => testLLMChat("What's the weather like?"), style: { padding: '8px 12px', fontSize: '14px' }, children: "\uD83C\uDF24\uFE0F Ask Weather" })] })] }), (lastUserMessage || aiResponse) && (_jsxs("div", { style: {
                                    backgroundColor: '#f8f9fa',
                                    padding: '15px',
                                    borderRadius: '4px',
                                    border: '1px solid #dee2e6',
                                }, children: [lastUserMessage && (_jsxs("div", { style: { marginBottom: '10px' }, children: [_jsx("strong", { children: "\uD83D\uDC64 You:" }), " ", lastUserMessage] })), aiResponse && (_jsxs("div", { children: [_jsx("strong", { children: "\uD83E\uDD16 Assistant:" }), " ", aiResponse] }))] })), _jsxs("div", { style: {
                                    marginTop: '15px',
                                    padding: '12px',
                                    backgroundColor: '#e7f3ff',
                                    borderRadius: '4px',
                                    border: '1px solid #b3d7ff',
                                }, children: [_jsx("strong", { children: "\uD83C\uDFAF Voice + AI Integration:" }), _jsx("br", {}), "In personal assistant mode, spoken questions will be automatically processed by the LLM and spoken back via TTS. This creates a complete voice-to-voice conversation experience."] })] })] }))] }));
}
