import { TTSAudioChunk } from '@voice/schemas';
import { spawn } from 'child_process';

export interface PiperTTSEngineConfig {
  modelPath: string;
  voice: string;
  speed: number;
  quality: number;
  timeout: number;
}

export class PiperTTSEngine {
  private config: PiperTTSEngineConfig;
  private isAvailable: boolean = false;

  constructor(config: Partial<PiperTTSEngineConfig> = {}) {
    this.config = {
      modelPath: '/usr/local/share/piper/models/en_US-amy-low.onnx',
      voice: 'en_US-amy-low',
      speed: 1.0,
      quality: 1.0,
      timeout: 30000,
      ...config
    };

    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      // Check if piper binary exists
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('which piper');
      this.isAvailable = true;
      console.log('✅ Piper binary found');
    } catch (error) {
      console.warn('⚠️ Piper binary not found, using mock mode');
      this.isAvailable = false;
    }
  }

  async synthesizeSpeech(text: string): Promise<TTSAudioChunk[]> {
    if (!this.isAvailable) {
      // Fallback to mock synthesis
      return this.mockSynthesis(text);
    }

    try {
      return await this.realSynthesis(text);
    } catch (error) {
      console.error('Piper synthesis failed, falling back to mock:', error);
      return this.mockSynthesis(text);
    }
  }

  private async realSynthesis(text: string): Promise<TTSAudioChunk[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Piper synthesis timeout'));
      }, this.config.timeout);

      // Spawn piper process
      const piper = spawn('piper', [
        '--model', this.config.modelPath,
        '--output-raw',
        '--output_file', '-', // Output to stdout
        '--speed', this.config.speed.toString(),
        '--quality', this.config.quality.toString()
      ]);

      let audioData = Buffer.alloc(0);
      let errorOutput = '';

      piper.stdout.on('data', (data) => {
        audioData = Buffer.concat([audioData, data]);
      });

      piper.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      piper.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0 && audioData.length > 0) {
          // Split audio into chunks for streaming
          const chunkSize = 4096; // 4KB chunks
          const chunks: TTSAudioChunk[] = [];

          for (let i = 0; i < audioData.length; i += chunkSize) {
            const chunk = audioData.slice(i, i + chunkSize);
            chunks.push({
              data: chunk,
              timestamp: Date.now() + i,
              isLast: i + chunkSize >= audioData.length
            });
          }

          resolve(chunks);
        } else {
          reject(new Error(`Piper failed with code ${code}: ${errorOutput}`));
        }
      });

      piper.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Send text to stdin
      piper.stdin.write(text);
      piper.stdin.end();
    });
  }

  private mockSynthesis(text: string): TTSAudioChunk[] {
    // Mock audio synthesis for testing
    const mockAudioData = Buffer.alloc(4096, 0); // Silent audio
    const words = text.split(' ');
    const chunks: TTSAudioChunk[] = [];

    // Create chunks for each word
    words.forEach((word, index) => {
      chunks.push({
        data: mockAudioData,
        timestamp: Date.now() + index * 100,
        isLast: index === words.length - 1
      });
    });

    return chunks;
  }

  async getAvailableVoices(): Promise<string[]> {
    if (!this.isAvailable) {
      return ['en_US-amy-low', 'en_US-amy-medium', 'en_US-amy-high'];
    }

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('piper --list_voices');
      const lines = stdout.trim().split('\n');

      return lines
        .filter(line => line.includes('|'))
        .map(line => line.split('|')[0].trim())
        .filter(voice => voice.length > 0);
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return ['en_US-amy-low'];
    }
  }

  async setVoice(voice: string): Promise<void> {
    // Update voice configuration
    this.config.voice = voice;

    // Try to find corresponding model file
    const voices = await this.getAvailableVoices();
    if (voices.includes(voice)) {
      this.config.modelPath = `/usr/local/share/piper/models/${voice}.onnx`;
    }
  }
}
