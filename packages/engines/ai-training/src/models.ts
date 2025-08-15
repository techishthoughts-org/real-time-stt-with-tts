import {
  ModelMetadata,
  ModelVersion,
  ABTest,
  ModelEvaluation
} from './types';

export class ModelManager {
  private models: Map<string, ModelMetadata> = new Map();
  private versions: Map<string, ModelVersion> = new Map();
  private abTests: Map<string, ABTest> = new Map();
  private evaluations: Map<string, ModelEvaluation> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  private initializeDefaultModels(): void {
    const defaultModels: ModelMetadata[] = [
      {
        id: 'base-model',
        name: 'Gon Base Model',
        version: '1.0.0',
        description: 'Base voice assistant model for general conversations',
        modelType: 'transformer',
        modelSize: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        parameters: 125000000,
        accuracy: 0.85,
        loss: 0.15,
        status: 'ready',
        tags: ['base', 'general', 'voice-assistant'],
        domain: 'general'
      },
      {
        id: 'specialized-model',
        name: 'Gon Specialized Model',
        version: '1.0.0',
        description: 'Specialized model for domain-specific conversations',
        modelType: 'transformer',
        modelSize: 'large',
        createdAt: new Date(),
        updatedAt: new Date(),
        parameters: 350000000,
        accuracy: 0.92,
        loss: 0.08,
        status: 'ready',
        tags: ['specialized', 'domain-specific', 'high-accuracy'],
        domain: 'specialized'
      }
    ];

    defaultModels.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  async createModel(model: Omit<ModelMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelMetadata> {
    const newModel: ModelMetadata = {
      ...model,
      id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.models.set(newModel.id, newModel);
    return newModel;
  }

  async getModel(modelId: string): Promise<ModelMetadata | null> {
    return this.models.get(modelId) || null;
  }

  async getAllModels(): Promise<ModelMetadata[]> {
    return Array.from(this.models.values());
  }

  async updateModel(modelId: string, updates: Partial<ModelMetadata>): Promise<ModelMetadata | null> {
    const model = this.models.get(modelId);
    if (!model) return null;

    const updatedModel = {
      ...model,
      ...updates,
      updatedAt: new Date()
    };

    this.models.set(modelId, updatedModel);
    return updatedModel;
  }

  async deleteModel(modelId: string): Promise<boolean> {
    return this.models.delete(modelId);
  }

  async createModelVersion(
    modelId: string,
    version: Omit<ModelVersion, 'id' | 'modelId' | 'createdAt'>
  ): Promise<ModelVersion> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const newVersion: ModelVersion = {
      ...version,
      id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      modelId,
      createdAt: new Date()
    };

    this.versions.set(newVersion.id, newVersion);
    return newVersion;
  }

  async getModelVersions(modelId: string): Promise<ModelVersion[]> {
    return Array.from(this.versions.values()).filter(v => v.modelId === modelId);
  }

  async getModelVersion(versionId: string): Promise<ModelVersion | null> {
    return this.versions.get(versionId) || null;
  }

  async activateModelVersion(versionId: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Model version ${versionId} not found`);
    }

    // Deactivate all other versions of the same model
    const modelVersions = Array.from(this.versions.values()).filter(v => v.modelId === version.modelId);
    modelVersions.forEach(v => {
      v.isActive = false;
    });

    // Activate the specified version
    version.isActive = true;
    version.deploymentStatus = 'deployed';
  }

  async createABTest(test: Omit<ABTest, 'id' | 'startDate'>): Promise<ABTest> {
    const modelA = this.models.get(test.modelA);
    const modelB = this.models.get(test.modelB);

    if (!modelA || !modelB) {
      throw new Error('Both models must exist for A/B testing');
    }

    const newTest: ABTest = {
      ...test,
      id: `abtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startDate: new Date(),
      status: 'running'
    };

    this.abTests.set(newTest.id, newTest);
    return newTest;
  }

  async getABTest(testId: string): Promise<ABTest | null> {
    return this.abTests.get(testId) || null;
  }

  async getAllABTests(): Promise<ABTest[]> {
    return Array.from(this.abTests.values());
  }

  async updateABTestMetrics(testId: string, metrics: Partial<ABTest['metrics']>): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    test.metrics = { ...test.metrics, ...metrics };
  }

  async stopABTest(testId: string, winner?: 'A' | 'B' | 'tie'): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    test.status = 'completed';
    test.endDate = new Date();
    test.winner = winner;
  }

  async addModelEvaluation(evaluation: Omit<ModelEvaluation, 'id' | 'createdAt'>): Promise<ModelEvaluation> {
    const model = this.models.get(evaluation.modelId);
    if (!model) {
      throw new Error(`Model ${evaluation.modelId} not found`);
    }

    const newEvaluation: ModelEvaluation = {
      ...evaluation,
      id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    this.evaluations.set(newEvaluation.id, newEvaluation);
    return newEvaluation;
  }

  async getModelEvaluations(modelId: string): Promise<ModelEvaluation[]> {
    return Array.from(this.evaluations.values()).filter(e => e.modelId === modelId);
  }

  async getModelEvaluation(evaluationId: string): Promise<ModelEvaluation | null> {
    return this.evaluations.get(evaluationId) || null;
  }

  async deployModel(modelId: string, versionId?: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (versionId) {
      const version = this.versions.get(versionId);
      if (!version) {
        throw new Error(`Model version ${versionId} not found`);
      }
      version.deploymentStatus = 'deployed';
    }

    model.status = 'ready';
    model.updatedAt = new Date();

    console.log(`Model ${modelId} deployed successfully`);
  }

  async archiveModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    model.status = 'archived';
    model.updatedAt = new Date();

    // Archive all versions of this model
    const modelVersions = Array.from(this.versions.values()).filter(v => v.modelId === modelId);
    modelVersions.forEach(version => {
      version.isActive = false;
      version.deploymentStatus = 'failed';
    });
  }

  async getModelPerformance(modelId: string): Promise<{
    accuracy: number;
    averageInferenceTime: number;
    totalRequests: number;
    errorRate: number;
  }> {
    const evaluations = await this.getModelEvaluations(modelId);

    if (evaluations.length === 0) {
      return {
        accuracy: 0,
        averageInferenceTime: 0,
        totalRequests: 0,
        errorRate: 0
      };
    }

    const totalAccuracy = evaluations.reduce((sum, evaluation) => sum + evaluation.metrics.accuracy, 0);
    const totalInferenceTime = evaluations.reduce((sum, evaluation) => sum + evaluation.performance.inferenceTime, 0);
    const totalRequests = evaluations.length;
    const errorRate = 0.05; // Simulated error rate

    return {
      accuracy: totalAccuracy / totalRequests,
      averageInferenceTime: totalInferenceTime / totalRequests,
      totalRequests,
      errorRate
    };
  }

  async getActiveModels(): Promise<ModelMetadata[]> {
    return Array.from(this.models.values()).filter(model => model.status === 'ready');
  }

  async getModelsByDomain(domain: string): Promise<ModelMetadata[]> {
    return Array.from(this.models.values()).filter(model => model.domain === domain);
  }

  async getModelsByTag(tag: string): Promise<ModelMetadata[]> {
    return Array.from(this.models.values()).filter(model => model.tags.includes(tag));
  }
}
