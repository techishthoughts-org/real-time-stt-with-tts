import { spawn } from 'child_process';
import { BrowserWindow, ipcMain } from 'electron';

class AudioProcessor {
  private isRecording = false;
  private audioProcess: any = null;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.setupIPC();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupIPC() {
    ipcMain.handle('voice:start', async () => {
      if (this.isRecording) return;

      this.isRecording = true;
      await this.startRecording();
    });

    ipcMain.handle('voice:stop', async () => {
      if (!this.isRecording) return;

      this.isRecording = false;
      await this.stopRecording();
    });

    ipcMain.handle('voice:frame', async (_, data: ArrayBuffer) => {
      await this.processAudioFrame(data);
    });

    ipcMain.handle('system:microphone', async () => {
      return await this.checkMicrophoneAccess();
    });
  }

  private async startRecording() {
    try {
      // Use macOS native audio capture with ffmpeg
      this.audioProcess = spawn('ffmpeg', [
        '-f', 'avfoundation',
        '-i', ':0', // Default microphone
        '-ar', '16000',
        '-ac', '1',
        '-f', 'wav',
        'pipe:1'
      ]);

      this.audioProcess.stdout.on('data', (data: Buffer) => {
        this.processAudioData(data);
      });

      this.audioProcess.stderr.on('data', (data: Buffer) => {
        console.log('FFmpeg stderr:', data.toString());
      });

      this.audioProcess.on('error', (error: Error) => {
        console.error('FFmpeg error:', error);
        this.isRecording = false;
      });

      console.log('Audio recording started');
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      this.isRecording = false;
    }
  }

  private async stopRecording() {
    if (this.audioProcess) {
      this.audioProcess.kill();
      this.audioProcess = null;
      console.log('Audio recording stopped');
    }
  }

  private async processAudioData(data: Buffer) {
    try {
      // Convert buffer to ArrayBuffer for processing
      const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

      // Send to STT engine
      const text = await this.transcribeAudio(arrayBuffer);
      if (text) {
        // Send to LLM
        const response = await this.getLLMResponse(text);
        // Convert to speech
        await this.synthesizeSpeech(response);
      }
    } catch (error) {
      console.error('Error processing audio data:', error);
    }
  }

  private async processAudioFrame(data: ArrayBuffer) {
    try {
      // Send to STT engine
      const text = await this.transcribeAudio(data);
      if (text) {
        // Send to LLM
        const response = await this.getLLMResponse(text);
        // Convert to speech
        await this.synthesizeSpeech(response);
      }
    } catch (error) {
      console.error('Error processing audio frame:', error);
    }
  }

  private async transcribeAudio(audioData: ArrayBuffer): Promise<string> {
    try {
      // Send to our existing STT server
      const response = await fetch('http://localhost:3030/stt/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioData: Array.from(new Uint8Array(audioData)),
          format: 'wav',
          sampleRate: 16000,
          channels: 1
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.text || '';
      }
    } catch (error) {
      console.error('STT request failed:', error);
    }
    return '';
  }

  private async getLLMResponse(text: string): Promise<string> {
    try {
      // Get auth token first
      const tokenResponse = await fetch('http://localhost:3030/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'electron-client' })
      });

      const tokenData = await tokenResponse.json();
      const token = tokenData.token;

      // Send to LLM
      const response = await fetch('http://localhost:3030/llm/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          context: 'Voice conversation'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response || '';
      }
    } catch (error) {
      console.error('LLM request failed:', error);
    }
    return '';
  }

  private async synthesizeSpeech(text: string): Promise<void> {
    try {
      // Send to our existing TTS server
      const response = await fetch('http://localhost:3030/tts/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voice: 'en_US-amy-low'
        })
      });

      if (response.ok) {
        const audioData = await response.arrayBuffer();
        // Play audio using macOS native audio
        await this.playAudio(audioData);
      }
    } catch (error) {
      console.error('TTS request failed:', error);
    }
  }

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    try {
      // Use macOS native audio playback
      const audioProcess = spawn('ffplay', [
        '-f', 'wav',
        '-autoexit',
        '-nodisp',
        '-'
      ]);

      audioProcess.stdin.write(Buffer.from(audioData));
      audioProcess.stdin.end();
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  }

  private async checkMicrophoneAccess(): Promise<boolean> {
    try {
      // Check if ffmpeg can access microphone
      const testProcess = spawn('ffmpeg', [
        '-f', 'avfoundation',
        '-list_devices', 'true',
        '-i', ''
      ]);

      return new Promise((resolve) => {
        testProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          if (output.includes('audio devices')) {
            resolve(true);
          }
        });

        testProcess.on('close', () => {
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Microphone check failed:', error);
      return false;
    }
  }
}

export const audioProcessor = new AudioProcessor();
