import { FastifyInstance } from 'fastify';
import { EngineManager } from './engines';
import { logger } from '@voice/observability';
import { AudioFrame } from '@voice/schemas';

export class WebRTCManager {
  private engineManager: EngineManager;
  private connections = new Map<string, any>();
  private totalFramesReceived = 0;
  private speechFramesReceived = 0;

  constructor(engineManager: EngineManager) {
    this.engineManager = engineManager;
  }

  setupRoutes(fastify: FastifyInstance) {
    fastify.get('/webrtc/health', async () => ({
      status: 'webrtc_ready',
      stats: {
        totalFrames: this.totalFramesReceived,
        speechFrames: this.speechFramesReceived,
      },
    }));

    fastify.post('/webrtc/audio-frame', async (request, reply) => {
      const frame = request.body as AudioFrame;
      this.totalFramesReceived++;

      if (frame.vad === 'speech') {
        this.speechFramesReceived++;
        console.log(
          `🎤 SERVER: Received SPEECH frame ${frame.seq}, RMS: ${frame.rms?.toFixed(4)}, Timestamp: ${frame.timestamp}`
        );
      }

      // Log every 100 frames for monitoring
      if (this.totalFramesReceived % 100 === 0) {
        console.log(
          `📊 SERVER: Processed ${this.totalFramesReceived} total frames, ${this.speechFramesReceived} speech frames`
        );
      }

      try {
        const partial = await this.engineManager.processAudioFrame(frame);

        if (partial) {
          console.log(
            `✨ SERVER: Generated partial transcription: "${partial.text}" (confidence: ${partial.confidence})`
          );
          return { type: 'partial', data: partial };
        }

        return { type: 'no_partial' };
      } catch (error) {
        logger.error('Audio frame processing error', error);
        console.error('❌ SERVER: Audio processing failed:', error);
        return reply.status(500).send({ error: 'Processing failed' });
      }
    });

    fastify.post('/webrtc/finalize', async (request, reply) => {
      console.log('🏁 SERVER: Finalizing transcription...');

      try {
        const final = await this.engineManager.processFinalTranscription();

        if (final) {
          console.log(
            `🎯 SERVER: Generated FINAL transcription: "${final.text}" (confidence: ${final.confidence})`
          );
          return { type: 'final', data: final };
        }

        console.log('📝 SERVER: No final transcription available');
        return { type: 'no_final' };
      } catch (error) {
        logger.error('Finalization error', error);
        console.error('❌ SERVER: Finalization failed:', error);
        return reply.status(500).send({ error: 'Finalization failed' });
      }
    });

    fastify.get('/webrtc/stats', async () => {
      const engineStats = this.engineManager.getStats();
      const webrtcStats = {
        totalFramesReceived: this.totalFramesReceived,
        speechFramesReceived: this.speechFramesReceived,
        speechRatio:
          this.totalFramesReceived > 0
            ? this.speechFramesReceived / this.totalFramesReceived
            : 0,
      };

      console.log('📈 SERVER: Stats requested:', { webrtcStats, engineStats });

      return {
        ...engineStats,
        webrtc: webrtcStats,
      };
    });

    // Add debug endpoint to reset counters
    fastify.post('/webrtc/reset-stats', async () => {
      this.totalFramesReceived = 0;
      this.speechFramesReceived = 0;
      console.log('🔄 SERVER: Stats reset');
      return { message: 'Stats reset' };
    });
  }
}
