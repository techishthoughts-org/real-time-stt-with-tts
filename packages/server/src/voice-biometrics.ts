import { logger } from '@voice/observability';
import { cacheService } from './cache';

export interface VoiceProfile {
  userId: string;
  features: number[];
  sampleCount: number;
  createdAt: number;
  lastUpdated: number;
  confidence: number;
}

export interface VoiceMatch {
  userId: string;
  confidence: number;
  isMatch: boolean;
}

export class VoiceBiometricsService {
  private profiles = new Map<string, VoiceProfile>();
  private readonly MIN_SAMPLES = 5;
  private readonly MATCH_THRESHOLD = 0.8;
  private readonly FEATURE_DIMENSION = 128; // Simplified feature vector

  constructor() {
    this.loadProfiles();
  }

  async createVoiceProfile(userId: string, audioSamples: Buffer[]): Promise<VoiceProfile> {
    if (audioSamples.length < this.MIN_SAMPLES) {
      throw new Error(`Need at least ${this.MIN_SAMPLES} audio samples to create a voice profile`);
    }

    // Extract features from audio samples
    const features = await this.extractFeatures(audioSamples);

    const profile: VoiceProfile = {
      userId,
      features,
      sampleCount: audioSamples.length,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      confidence: this.calculateConfidence(audioSamples.length),
    };

    this.profiles.set(userId, profile);
    await this.saveProfile(profile);

    logger.info(`🎤 Voice profile created for user: ${userId}`);
    return profile;
  }

  async identifySpeaker(audioSample: Buffer): Promise<VoiceMatch | null> {
    const sampleFeatures = await this.extractFeatures([audioSample]);

    let bestMatch: VoiceMatch | null = null;
    let highestConfidence = 0;

    for (const [userId, profile] of this.profiles.entries()) {
      const confidence = this.calculateSimilarity(sampleFeatures, profile.features);

      if (confidence > highestConfidence && confidence >= this.MATCH_THRESHOLD) {
        highestConfidence = confidence;
        bestMatch = {
          userId,
          confidence,
          isMatch: confidence >= this.MATCH_THRESHOLD,
        };
      }
    }

    if (bestMatch) {
      logger.info(`🎤 Speaker identified: ${bestMatch.userId} (confidence: ${bestMatch.confidence.toFixed(3)})`);
    } else {
      logger.info('🎤 Speaker not identified');
    }

    return bestMatch;
  }

  async authenticateUser(userId: string, audioSample: Buffer): Promise<boolean> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      logger.warn(`🎤 No voice profile found for user: ${userId}`);
      return false;
    }

    const sampleFeatures = await this.extractFeatures([audioSample]);
    const confidence = this.calculateSimilarity(sampleFeatures, profile.features);
    const isAuthenticated = confidence >= this.MATCH_THRESHOLD;

    logger.info(`🎤 Voice authentication for ${userId}: ${isAuthenticated ? 'SUCCESS' : 'FAILED'} (confidence: ${confidence.toFixed(3)})`);

    return isAuthenticated;
  }

  async updateVoiceProfile(userId: string, audioSample: Buffer): Promise<VoiceProfile | null> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      logger.warn(`🎤 No voice profile found for user: ${userId}`);
      return null;
    }

    const sampleFeatures = await this.extractFeatures([audioSample]);

    // Update profile with new sample (simple averaging)
    const newFeatures = profile.features.map((feature, index) =>
      (feature * profile.sampleCount + sampleFeatures[index]) / (profile.sampleCount + 1)
    );

    const updatedProfile: VoiceProfile = {
      ...profile,
      features: newFeatures,
      sampleCount: profile.sampleCount + 1,
      lastUpdated: Date.now(),
      confidence: this.calculateConfidence(profile.sampleCount + 1),
    };

    this.profiles.set(userId, updatedProfile);
    await this.saveProfile(updatedProfile);

    logger.info(`🎤 Voice profile updated for user: ${userId}`);
    return updatedProfile;
  }

  async deleteVoiceProfile(userId: string): Promise<boolean> {
    const deleted = this.profiles.delete(userId);
    if (deleted) {
      await this.removeProfile(userId);
      logger.info(`🎤 Voice profile deleted for user: ${userId}`);
    }
    return deleted;
  }

  getVoiceProfile(userId: string): VoiceProfile | undefined {
    return this.profiles.get(userId);
  }

  getAllProfiles(): VoiceProfile[] {
    return Array.from(this.profiles.values());
  }

  private async extractFeatures(audioSamples: Buffer[]): Promise<number[]> {
    // Simplified feature extraction
    // In a real implementation, this would use MFCC, spectral features, etc.

    const features: number[] = [];

    for (let i = 0; i < this.FEATURE_DIMENSION; i++) {
      let sum = 0;
      for (const sample of audioSamples) {
        // Simple feature extraction based on audio data
        sum += sample[i % sample.length] || 0;
      }
      features.push(sum / audioSamples.length);
    }

    return features;
  }

  private calculateSimilarity(features1: number[], features2: number[]): number {
    // Simplified cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < features1.length; i++) {
      dotProduct += features1[i] * features2[i];
      norm1 += features1[i] * features1[i];
      norm2 += features2[i] * features2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.max(0, Math.min(1, similarity)); // Clamp between 0 and 1
  }

  private calculateConfidence(sampleCount: number): number {
    // Confidence increases with more samples
    return Math.min(1, sampleCount / (this.MIN_SAMPLES * 2));
  }

  private async saveProfile(profile: VoiceProfile): Promise<void> {
    try {
      const key = `voice_profile:${profile.userId}`;
      await cacheService.set(key, JSON.stringify(profile), 86400 * 30); // 30 days
    } catch (error) {
      logger.error('Failed to save voice profile:', error);
    }
  }

  private async loadProfiles(): Promise<void> {
    try {
      // Load profiles from cache
      const keys = await cacheService.keys('voice_profile:*');

      for (const key of keys) {
        const data = await cacheService.get(key);
        if (data) {
          const profile: VoiceProfile = JSON.parse(data);
          this.profiles.set(profile.userId, profile);
        }
      }

      logger.info(`🎤 Loaded ${this.profiles.size} voice profiles`);
    } catch (error) {
      logger.error('Failed to load voice profiles:', error);
    }
  }

  private async removeProfile(userId: string): Promise<void> {
    try {
      const key = `voice_profile:${userId}`;
      await cacheService.del(key);
    } catch (error) {
      logger.error('Failed to remove voice profile:', error);
    }
  }

  getStats(): any {
    return {
      totalProfiles: this.profiles.size,
      profiles: Array.from(this.profiles.values()).map(profile => ({
        userId: profile.userId,
        sampleCount: profile.sampleCount,
        confidence: profile.confidence,
        lastUpdated: profile.lastUpdated,
      })),
    };
  }
}

export const voiceBiometricsService = new VoiceBiometricsService();
