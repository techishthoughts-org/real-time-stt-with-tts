import * as React from 'react';
import { useEffect, useState } from 'react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Ready');
  const [systemInfo, setSystemInfo] = useState<any>(null);

  useEffect(() => {
    // Set up event listeners
    window.electronAPI.onVoiceData((data: any) => {
      setTranscript(data.text || '');
    });

    window.electronAPI.onLLMResponse((data: any) => {
      setResponse(data.response || '');
    });

    window.electronAPI.onError((error: any) => {
      console.error('Error:', error);
      setStatus('Error: ' + error.message);
    });

    window.electronAPI.onVoiceStart(() => {
      setIsRecording(true);
      setStatus('Recording...');
    });

    window.electronAPI.onVoiceStop(() => {
      setIsRecording(false);
      setStatus('Processing...');
    });

    // Get system info
    window.electronAPI.getSystemInfo().then((info: any) => {
      setSystemInfo(info);
    });

    // Check microphone access
    window.electronAPI.checkMicrophone().then((hasAccess: boolean) => {
      if (!hasAccess) {
        setStatus('Microphone access required');
      }
    });
  }, []);

  const handleStartRecording = async () => {
    try {
      setStatus('Starting recording...');
      await window.electronAPI.startVoiceRecognition();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setStatus('Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      setStatus('Stopping recording...');
      await window.electronAPI.stopVoiceRecognition();
      setIsRecording(false);
      setStatus('Processing...');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setStatus('Failed to stop recording');
    }
  };

  const handleSendMessage = async () => {
    if (!transcript.trim()) return;

    try {
      setStatus('Sending message...');
      const result = await window.electronAPI.sendMessage(transcript);
      setResponse((result as any)?.response || '');
      setStatus('Response received');
    } catch (error) {
      console.error('Failed to send message:', error);
      setStatus('Failed to send message');
    }
  };

  const handleClear = () => {
    setTranscript('');
    setResponse('');
    setStatus('Ready');
  };

  return (
    <div className="App">
      <div className="status">
        {isRecording && <span className="recording-indicator"></span>}
        {status}
      </div>

      <header className="App-header">
        <h1>🎤 Voice Assistant</h1>

        <div className="controls">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={isRecording ? 'recording' : ''}
          >
            {isRecording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
          </button>

          {transcript && (
            <button onClick={handleSendMessage} style={{ marginLeft: '1rem' }}>
              💬 Send Message
            </button>
          )}

          <button onClick={handleClear} style={{ marginLeft: '1rem' }}>
            🗑️ Clear
          </button>
        </div>

        <div className="transcript">
          <h3>📝 Transcript:</h3>
          <p>{transcript || 'No speech detected...'}</p>
        </div>

        <div className="response">
          <h3>🤖 Assistant Response:</h3>
          <p>{response || 'Waiting for response...'}</p>
        </div>

        {systemInfo && (
          <div className="system-info" style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: 'rgba(0,0,0,0.7)',
            padding: '0.5rem 1rem',
            borderRadius: '10px',
            fontSize: '0.8rem'
          }}>
            <div>Platform: {systemInfo.platform}</div>
            <div>Arch: {systemInfo.arch}</div>
            <div>Node: {systemInfo.version}</div>
            <div>Electron: {systemInfo.electronVersion}</div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
