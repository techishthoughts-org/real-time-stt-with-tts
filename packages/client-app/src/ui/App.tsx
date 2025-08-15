import { AudioFrame } from '@voice/schemas';
import { useEffect, useRef, useState } from 'react';
import { config } from '../config';
import { AudioCaptureService } from '../services/audioCapture';
import { RealTimeSTTService } from '../services/realTimeSttService';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { PWAUpdateNotification } from '../components/PWAUpdateNotification';

type Flags = {
  gpuEnabled: boolean;
  openRouterEnabled: boolean;
  cloudTtsEnabled: boolean;
  externalSfuEnabled: boolean;
  telemetryEnabled: boolean;
};

type Stats = {
  stt_partial_latency_ms?: {
    count: number;
    min: number;
    max: number;
    avg: number;
  };
  stt_final_latency_ms?: {
    count: number;
    min: number;
    max: number;
    avg: number;
  };
  webrtc?: {
    totalFramesReceived: number;
    speechFramesReceived: number;
    speechRatio: number;
  };
};

type TranscriptResult = {
  type: 'partial' | 'final';
  text: string;
  confidence: number;
  timestamp: number;
};

export function App() {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptResult[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [debugInfo, setDebugInfo] = useState<{
    framesSent: number;
    speechFramesSent: number;
    lastFrameTime: number;
  }>({ framesSent: 0, speechFramesSent: 0, lastFrameTime: 0 });
  const [connectionStatus, setConnectionStatus] = useState<
    'checking' | 'connected' | 'error'
  >('checking');
  const [sttMode, setSttMode] = useState<'simulated' | 'real'>('real');
  const [llmEnabled, setLlmEnabled] = useState(true);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [llmHealth, setLlmHealth] = useState<any>(null);

  const audioService = useRef<AudioCaptureService | null>(null);
  const sttService = useRef<RealTimeSTTService | null>(null);
  const frameBuffer = useRef<AudioFrame[]>([]);

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
    } catch (error) {
      console.warn('LLM health check failed:', error);
      setLlmHealth({ status: 'error' });
    }
  };

  const testLLMChat = async (message: string) => {
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
      } else {
        setAiResponse('Error: ' + response.statusText);
      }
    } catch (error) {
      setAiResponse('Error: ' + (error as Error).message);
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
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      setFlags(data.flags);
      setConnectionStatus('connected');
      setError(null);
      console.log('✅ Server connection successful:', data);
    } catch (e) {
      console.error('❌ Server connection failed:', e);
      setError(`Cannot connect to server (${config.serverUrl}): ${e}`);
      setConnectionStatus('error');
    }
  };

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
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
      throw new Error(
        `API call failed: ${response.status} ${response.statusText}`
      );
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
      const frame: AudioFrame = {
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
    } catch (e) {
      console.error('❌ Test failed:', e);
      setError(String(e));
    } finally {
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
        sttService.current.startListening(
          (text, confidence) => {
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
          },
          (text, confidence) => {
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
          }
        );
      } else {
        // Fallback to simulated mode
        await audioService.current.startCapture(handleAudioFrame);
      }

      // Start audio level monitoring
      const levelInterval = setInterval(() => {
        if (audioService.current && isListening) {
          setAudioLevel(audioService.current.getAudioLevel());
        } else {
          clearInterval(levelInterval);
        }
      }, 100);

      console.log('✅ Started 10-second listening session');
    } catch (e) {
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

  const handleAudioFrame = async (frame: AudioFrame) => {
    frameBuffer.current.push(frame);

    // Update debug info
    setDebugInfo((prev) => ({
      framesSent: prev.framesSent + 1,
      speechFramesSent:
        prev.speechFramesSent + (frame.vad === 'speech' ? 1 : 0),
      lastFrameTime: frame.timestamp,
    }));

    // Only process speech frames in simulated mode
    if (frame.vad === 'speech') {
      try {
        console.log(
          `📤 CLIENT: Sending speech frame ${frame.seq} to server...`
        );

        const result = await apiCall('/webrtc/audio-frame', {
          method: 'POST',
          body: JSON.stringify(frame),
        });

        console.log(`📥 CLIENT: Server response:`, result);

        if (result.type === 'partial' && result.data) {
          console.log(
            `✨ CLIENT: Got partial transcription: "${result.data.text}"`
          );
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
      } catch (e) {
        console.error('❌ CLIENT: Error processing audio frame:', e);
      }
    }
  };

  if (connectionStatus === 'checking') {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1>Voice Client (Local by default)</h1>
        <p>🔍 Checking server connection...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        maxWidth: 900,
      }}
    >
      <PWAUpdateNotification />
      <PWAInstallPrompt />
      <h1>Voice Client (Local by default)</h1>

      {connectionStatus === 'error' && (
        <div
          style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          <strong>❌ Connection Error:</strong> {error}
          <br />
          <button
            onClick={checkServerConnection}
            style={{ marginTop: '8px', padding: '4px 8px', fontSize: '14px' }}
          >
            🔄 Retry Connection
          </button>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <div
          style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          <strong>✅ Connected to server:</strong> {config.serverUrl}
        </div>
      )}

      {error && connectionStatus === 'connected' && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}

      {flags && (
        <div>
          <h2>Feature Flags</h2>
          <ul>
            <li>GPU enabled: {String(flags.gpuEnabled)}</li>
            <li>OpenRouter enabled: {String(flags.openRouterEnabled)}</li>
            <li>Cloud TTS enabled: {String(flags.cloudTtsEnabled)}</li>
            <li>External SFU enabled: {String(flags.externalSfuEnabled)}</li>
            <li>Telemetry enabled: {String(flags.telemetryEnabled)}</li>
          </ul>
          <p>Defaults are all off (local CPU-only, no cloud).</p>

          <h2>STT Mode Selection</h2>
          <div
            style={{
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
            }}
          >
            <label style={{ marginRight: '20px' }}>
              <input
                type="radio"
                value="real"
                checked={sttMode === 'real'}
                onChange={(e) => setSttMode(e.target.value as 'real')}
                disabled={isListening}
              />
              🎯 Real STT (Browser Speech Recognition)
            </label>
            <label>
              <input
                type="radio"
                value="simulated"
                checked={sttMode === 'simulated'}
                onChange={(e) => setSttMode(e.target.value as 'simulated')}
                disabled={isListening}
              />
              🧪 Simulated STT (Server Mock)
            </label>
            {sttMode === 'real' && !sttService.current?.isSupported() && (
              <p
                style={{
                  color: '#dc3545',
                  margin: '8px 0 0 0',
                  fontSize: '14px',
                }}
              >
                ⚠️ Browser speech recognition not supported. Using simulated
                mode.
              </p>
            )}
          </div>

          <h2>Audio Pipeline Testing</h2>

          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || connectionStatus !== 'connected'}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: isListening ? '#dc3545' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  isProcessing || connectionStatus !== 'connected'
                    ? 'not-allowed'
                    : 'pointer',
                marginRight: '10px',
              }}
            >
              {isListening
                ? `🛑 Stop Listening (${countdown}s)`
                : `🎙️ Start 10s ${sttMode.toUpperCase()} Test`}
            </button>

            <button
              onClick={testAudioProcessing}
              disabled={
                isProcessing || isListening || connectionStatus !== 'connected'
              }
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: isProcessing ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  isProcessing ||
                  isListening ||
                  connectionStatus !== 'connected'
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {isProcessing ? 'Processing...' : '🧪 Test Simulated Audio'}
            </button>
          </div>

          {/* Debug Information - only show in simulated mode */}
          {isListening && sttMode === 'simulated' && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
              }}
            >
              <h3>🔍 Real-time Debug Info (Simulated Mode)</h3>
              <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                <div>📊 Frames sent: {debugInfo.framesSent}</div>
                <div>��️ Speech frames: {debugInfo.speechFramesSent}</div>
                <div>📈 Audio level: {(audioLevel * 100).toFixed(1)}%</div>
                <div>
                  ⏰ Last frame:{' '}
                  {new Date(debugInfo.lastFrameTime).toLocaleTimeString()}
                </div>
                <div>
                  📡 Speech ratio:{' '}
                  {debugInfo.framesSent > 0
                    ? (
                        (debugInfo.speechFramesSent / debugInfo.framesSent) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </div>
              </div>
            </div>
          )}

          {/* Audio Level Visualization */}
          {isListening && (
            <div style={{ marginBottom: '20px' }}>
              <h3>🎵 Audio Level Monitor</h3>
              <div
                style={{
                  width: '100%',
                  height: '30px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '15px',
                  overflow: 'hidden',
                  border: '2px solid #ddd',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(audioLevel * 1000, 100)}%`, // Amplify for visualization
                    height: '100%',
                    backgroundColor:
                      audioLevel > 0.02
                        ? '#28a745'
                        : audioLevel > 0.005
                          ? '#ffc107'
                          : '#6c757d',
                    transition: 'width 0.1s ease, background-color 0.1s ease',
                  }}
                ></div>
              </div>
              <div
                style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}
              >
                {sttMode === 'real'
                  ? audioLevel > 0.02
                    ? '🎯 Real STT Active'
                    : '🎤 Listening...'
                  : audioLevel > 0.02
                    ? '🗣️ SPEECH DETECTED'
                    : audioLevel > 0.005
                      ? '🔊 Audio detected'
                      : '🔇 Silence'}
              </div>
            </div>
          )}

          {/* Live Transcriptions */}
          {transcripts.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>📝 Live Transcriptions ({sttMode.toUpperCase()} STT)</h3>
              <div
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                {transcripts.map((transcript, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '8px',
                      padding: '12px',
                      backgroundColor:
                        transcript.type === 'final' ? '#d4edda' : '#fff3cd',
                      borderRadius: '4px',
                      borderLeft: `4px solid ${transcript.type === 'final' ? '#28a745' : '#ffc107'}`,
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {transcript.type === 'final' ? '🎯 FINAL' : '⚡ PARTIAL'}:{' '}
                      {transcript.text}
                    </div>
                    <small style={{ color: '#666' }}>
                      Confidence: {(transcript.confidence * 100).toFixed(1)}% |
                      Time:{' '}
                      {new Date(transcript.timestamp).toLocaleTimeString()} |
                      Mode: {sttMode.toUpperCase()}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Stats - only show for simulated mode */}
          {stats && sttMode === 'simulated' && (
            <div style={{ marginTop: '20px' }}>
              <h3>📊 Pipeline Performance (Simulated Mode)</h3>
              <div
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                }}
              >
                {stats.webrtc && (
                  <div style={{ marginBottom: '12px' }}>
                    <strong>🌐 WebRTC Stats:</strong>
                    <br />
                    Total frames received: {stats.webrtc.totalFramesReceived}
                    <br />
                    Speech frames received: {stats.webrtc.speechFramesReceived}
                    <br />
                    Speech ratio: {(stats.webrtc.speechRatio * 100).toFixed(1)}%
                  </div>
                )}
                <strong>⚡ STT Performance:</strong>
                <br />
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(stats, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* LLM Testing Section */}
          <div
            style={{
              marginTop: '30px',
              padding: '20px',
              border: '2px solid #007bff',
              borderRadius: '8px',
            }}
          >
            <h3 style={{ margin: '0 0 15px 0', color: '#007bff' }}>
              🧠 Personal Assistant (LLM)
            </h3>

            {/* LLM Health Status */}
            <div
              style={{
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
              }}
            >
              <strong>Health Status:</strong>
              {llmHealth ? (
                <div style={{ marginTop: '8px' }}>
                  <div>
                    Status: {llmHealth.status === 'ok' ? '✅ OK' : '❌ Error'}
                  </div>
                  {llmHealth.local && (
                    <div>
                      Local (Ollama):{' '}
                      {llmHealth.local.available
                        ? '🟢 Available'
                        : '🔴 Unavailable'}
                    </div>
                  )}
                  {llmHealth.cloud && (
                    <div>
                      Cloud (OpenRouter):{' '}
                      {llmHealth.cloud.available
                        ? '🟢 Available'
                        : '🔴 Unavailable'}
                    </div>
                  )}
                </div>
              ) : (
                <span> Loading...</span>
              )}
            </div>

            {/* LLM Chat Testing */}
            <div style={{ marginBottom: '15px' }}>
              <strong>Test Personal Assistant:</strong>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={() => testLLMChat('What time is it?')}
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  🕐 Ask Time
                </button>
                <button
                  onClick={() => testLLMChat('Tell me a joke')}
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  😄 Tell Joke
                </button>
                <button
                  onClick={() => testLLMChat('How can you help me?')}
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  ❓ Ask Capabilities
                </button>
                <button
                  onClick={() => testLLMChat("What's the weather like?")}
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  🌤️ Ask Weather
                </button>
              </div>
            </div>

            {/* Chat History */}
            {(lastUserMessage || aiResponse) && (
              <div
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6',
                }}
              >
                {lastUserMessage && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong>👤 You:</strong> {lastUserMessage}
                  </div>
                )}
                {aiResponse && (
                  <div>
                    <strong>🤖 Assistant:</strong> {aiResponse}
                  </div>
                )}
              </div>
            )}

            {/* Voice + LLM Integration Notice */}
            <div
              style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: '#e7f3ff',
                borderRadius: '4px',
                border: '1px solid #b3d7ff',
              }}
            >
              <strong>🎯 Voice + AI Integration:</strong>
              <br />
              In personal assistant mode, spoken questions will be automatically
              processed by the LLM and spoken back via TTS. This creates a
              complete voice-to-voice conversation experience.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
