import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Stop,
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Settings,
} from '@mui/icons-material';
import { useWebSocketChat } from '../hooks/useWebSocketChat';

interface VoiceRecorderProps {
  onTranscription?: (text: string, isFinal: boolean) => void;
  onAudioData?: (audioData: any) => void;
  autoStart?: boolean;
  continuous?: boolean;
  language?: string;
  sampleRate?: number;
  channels?: number;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscription,
  onAudioData,
  autoStart = false,
  continuous = false,
  language = 'pt-BR',
  sampleRate = 16000,
  channels = 1,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const {
    isConnected,
    startListening,
    stopListening,
    sendVoiceChunk,
    setTextResponseHandler,
    setErrorHandler,
  } = useWebSocketChat();

  // Set up WebSocket handlers
  useEffect(() => {
    setTextResponseHandler((response) => {
      if (onTranscription) {
        onTranscription(response.text, !response.isPartial);
      }
    });

    setErrorHandler((error) => {
      setError(error.message || 'WebSocket error');
    });
  }, [onTranscription, setTextResponseHandler, setErrorHandler]);

  // Initialize audio context and analyser
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioContextRef.current = new AudioContext({ sampleRate });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);

      // Set up audio level monitoring
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      audioLevelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
      }, 100);

      return stream;
    } catch (error) {
      console.error('Error initializing audio:', error);
      setError('Failed to access microphone');
      throw error;
    }
  }, [sampleRate, channels]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await initializeAudio();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Send audio chunk via WebSocket if connected
          if (isConnected && onAudioData) {
            onAudioData(event.data);
            sendVoiceChunk(event.data);
          }
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        if (onAudioData) {
          onAudioData(blob);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);

      // Start WebSocket listening
      if (isConnected) {
        startListening();
      }

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  }, [initializeAudio, isConnected, onAudioData, sendVoiceChunk, startListening]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      // Stop WebSocket listening
      if (isConnected) {
        stopListening();
      }

      // Clear intervals
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }

      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      console.log('Recording stopped');
    }
  }, [isRecording, isConnected, stopListening]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  }, [isPaused]);

  // Play recorded audio
  const playRecording = useCallback(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.play();
    }
  }, [audioUrl]);

  // Format recording time
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !isRecording) {
      startRecording();
    }
  }, [autoStart, isRecording, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [isRecording, stopRecording, audioUrl]);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Voice Recorder
          </Typography>
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Audio Level Visualization */}
        {isRecording && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={audioLevel}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'primary.main',
                  borderRadius: 4,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Audio Level: {Math.round(audioLevel)}%
            </Typography>
          </Box>
        )}

        {/* Recording Time */}
        {isRecording && (
          <Typography variant="h4" align="center" sx={{ mb: 2, fontFamily: 'monospace' }}>
            {formatTime(recordingTime)}
          </Typography>
        )}

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isRecording ? (
            <Button
              variant="contained"
              size="large"
              startIcon={<Mic />}
              onClick={startRecording}
              disabled={!isConnected}
            >
              Start Recording
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<Stop />}
                onClick={stopRecording}
              >
                Stop
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                startIcon={isPaused ? <PlayArrow /> : <Pause />}
                onClick={togglePause}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            </>
          )}

          {audioBlob && !isRecording && (
            <Button
              variant="outlined"
              size="large"
              startIcon={isPlaying ? <VolumeOff /> : <VolumeUp />}
              onClick={playRecording}
              disabled={isPlaying}
            >
              {isPlaying ? 'Playing...' : 'Play'}
            </Button>
          )}
        </Box>

        {/* Recording Status */}
        {isRecording && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Chip
              icon={isPaused ? <Pause /> : <Mic />}
              label={isPaused ? 'Paused' : 'Recording'}
              color={isPaused ? 'warning' : 'primary'}
              variant="outlined"
            />
          </Box>
        )}

        {/* Audio Info */}
        {audioBlob && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Recording Info:
            </Typography>
            <Typography variant="body2">
              Size: {(audioBlob.size / 1024).toFixed(1)} KB
            </Typography>
            <Typography variant="body2">
              Duration: {formatTime(recordingTime)}
            </Typography>
            <Typography variant="body2">
              Format: {audioBlob.type}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
