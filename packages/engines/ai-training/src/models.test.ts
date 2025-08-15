import { beforeEach, describe, expect, it } from 'vitest';
import { ModelManager } from './models';

describe('ModelManager', () => {
  let manager: ModelManager;

  beforeEach(() => {
    manager = new ModelManager();
  });

  describe('model management', () => {
    it('should create model successfully', async () => {
      const model = await manager.createModel({
        name: 'Test Model',
        version: '1.0.0',
        description: 'A test model',
        modelType: 'transformer',
        modelSize: 'medium',
        parameters: 100000000,
        accuracy: 0.85,
        loss: 0.15,
        status: 'ready',
        tags: ['test'],
        domain: 'general'
      });

      expect(model).toBeDefined();
      expect(model.name).toBe('Test Model');
      expect(model.id).toBeDefined();
      expect(model.createdAt).toBeInstanceOf(Date);
    });

    it('should get model successfully', async () => {
      const model = await manager.getModel('base-model');
      expect(model).toBeDefined();
      expect(model?.id).toBe('base-model');
      expect(model?.name).toBe('Gon Base Model');
    });

    it('should get all models', async () => {
      const models = await manager.getAllModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should update model successfully', async () => {
      const updatedModel = await manager.updateModel('base-model', {
        description: 'Updated description'
      });

      expect(updatedModel).toBeDefined();
      expect(updatedModel?.description).toBe('Updated description');
    });

    it('should delete model successfully', async () => {
      const deleted = await manager.deleteModel('base-model');
      expect(deleted).toBe(true);

      const model = await manager.getModel('base-model');
      expect(model).toBeNull();
    });
  });

  describe('model version management', () => {
    it('should create model version successfully', async () => {
      const version = await manager.createModelVersion('base-model', {
        version: '1.1.0',
        description: 'Updated version',
        changes: ['Improved accuracy', 'Bug fixes'],
        performance: {
          accuracy: 0.87,
          loss: 0.13,
          inferenceTime: 0.1
        },
        isActive: false,
        deploymentStatus: 'pending'
      });

      expect(version).toBeDefined();
      expect(version.modelId).toBe('base-model');
      expect(version.version).toBe('1.1.0');
      expect(version.id).toBeDefined();
    });

    it('should get model versions', async () => {
      const versions = await manager.getModelVersions('base-model');
      expect(Array.isArray(versions)).toBe(true);
    });

    it('should activate model version', async () => {
      const version = await manager.createModelVersion('base-model', {
        version: '1.2.0',
        description: 'New version',
        changes: ['New features'],
        performance: {
          accuracy: 0.89,
          loss: 0.11,
          inferenceTime: 0.09
        },
        isActive: false,
        deploymentStatus: 'pending'
      });

      await manager.activateModelVersion(version.id);

      const activatedVersion = await manager.getModelVersion(version.id);
      expect(activatedVersion?.isActive).toBe(true);
      expect(activatedVersion?.deploymentStatus).toBe('deployed');
    });
  });

  describe('A/B testing', () => {
    it('should create A/B test successfully', async () => {
      const test = await manager.createABTest({
        name: 'Test A/B Test',
        description: 'Testing model performance',
        modelA: 'base-model',
        modelB: 'specialized-model',
        trafficSplit: 50,
        metrics: {
          accuracy: 0.85,
          userSatisfaction: 0.8,
          responseTime: 0.1,
          errorRate: 0.05
        },
        status: 'running'
      });

      expect(test).toBeDefined();
      expect(test.modelA).toBe('base-model');
      expect(test.modelB).toBe('specialized-model');
      expect(test.status).toBe('running');
    });

    it('should get A/B test successfully', async () => {
      const test = await manager.createABTest({
        name: 'Test A/B Test',
        description: 'Testing model performance',
        modelA: 'base-model',
        modelB: 'specialized-model',
        trafficSplit: 50,
        metrics: {
          accuracy: 0.85,
          userSatisfaction: 0.8,
          responseTime: 0.1,
          errorRate: 0.05
        },
        status: 'running'
      });

      const retrievedTest = await manager.getABTest(test.id);
      expect(retrievedTest).toEqual(test);
    });

    it('should update A/B test metrics', async () => {
      const test = await manager.createABTest({
        name: 'Test A/B Test',
        description: 'Testing model performance',
        modelA: 'base-model',
        modelB: 'specialized-model',
        trafficSplit: 50,
        metrics: {
          accuracy: 0.85,
          userSatisfaction: 0.8,
          responseTime: 0.1,
          errorRate: 0.05
        },
        status: 'running'
      });

      await manager.updateABTestMetrics(test.id, {
        accuracy: 0.87,
        userSatisfaction: 0.85
      });

      const updatedTest = await manager.getABTest(test.id);
      expect(updatedTest?.metrics.accuracy).toBe(0.87);
      expect(updatedTest?.metrics.userSatisfaction).toBe(0.85);
    });

    it('should stop A/B test', async () => {
      const test = await manager.createABTest({
        name: 'Test A/B Test',
        description: 'Testing model performance',
        modelA: 'base-model',
        modelB: 'specialized-model',
        trafficSplit: 50,
        metrics: {
          accuracy: 0.85,
          userSatisfaction: 0.8,
          responseTime: 0.1,
          errorRate: 0.05
        },
        status: 'running'
      });

      await manager.stopABTest(test.id, 'A');

      const stoppedTest = await manager.getABTest(test.id);
      expect(stoppedTest?.status).toBe('completed');
      expect(stoppedTest?.winner).toBe('A');
      expect(stoppedTest?.endDate).toBeDefined();
    });
  });

  describe('model evaluation', () => {
    it('should add model evaluation successfully', async () => {
      const evaluation = await manager.addModelEvaluation({
        modelId: 'base-model',
        datasetId: 'test-dataset',
        metrics: {
          accuracy: 0.85,
          precision: 0.83,
          recall: 0.87,
          f1Score: 0.85,
          confusionMatrix: [
            [150, 10],
            [15, 125]
          ]
        },
        performance: {
          inferenceTime: 0.1,
          memoryUsage: 512,
          throughput: 1000
        }
      });

      expect(evaluation).toBeDefined();
      expect(evaluation.modelId).toBe('base-model');
      expect(evaluation.metrics.accuracy).toBe(0.85);
      expect(evaluation.id).toBeDefined();
    });

    it('should get model evaluations', async () => {
      const evaluations = await manager.getModelEvaluations('base-model');
      expect(Array.isArray(evaluations)).toBe(true);
    });
  });

  describe('model deployment', () => {
    it('should deploy model successfully', async () => {
      await expect(
        manager.deployModel('base-model')
      ).resolves.not.toThrow();
    });

    it('should archive model successfully', async () => {
      await manager.archiveModel('base-model');

      const model = await manager.getModel('base-model');
      expect(model?.status).toBe('archived');
    });
  });

  describe('model performance', () => {
    it('should get model performance', async () => {
      const performance = await manager.getModelPerformance('base-model');

      expect(performance).toBeDefined();
      expect(performance.accuracy).toBeGreaterThanOrEqual(0);
      expect(performance.averageInferenceTime).toBeGreaterThanOrEqual(0);
      expect(performance.totalRequests).toBeGreaterThanOrEqual(0);
      expect(performance.errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('model filtering', () => {
    it('should get active models', async () => {
      const activeModels = await manager.getActiveModels();
      expect(Array.isArray(activeModels)).toBe(true);
      activeModels.forEach(model => {
        expect(model.status).toBe('ready');
      });
    });

    it('should get models by domain', async () => {
      const generalModels = await manager.getModelsByDomain('general');
      expect(Array.isArray(generalModels)).toBe(true);
      generalModels.forEach(model => {
        expect(model.domain).toBe('general');
      });
    });

    it('should get models by tag', async () => {
      const baseModels = await manager.getModelsByTag('base');
      expect(Array.isArray(baseModels)).toBe(true);
      baseModels.forEach(model => {
        expect(model.tags).toContain('base');
      });
    });
  });
});
