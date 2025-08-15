import { beforeEach, describe, expect, it } from 'vitest';
import { TrainingPipeline } from './training';

describe('TrainingPipeline', () => {
  let pipeline: TrainingPipeline;

  beforeEach(() => {
    pipeline = new TrainingPipeline();
  });

  describe('createTrainingJob', () => {
    it('should create a training job successfully', async () => {
      const config = {
        modelType: 'transformer' as const,
        modelSize: 'medium' as const,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 10,
        validationSplit: 0.2,
        earlyStopping: true,
        checkpointing: true
      };

      const trainingData = await pipeline.addTrainingData({
        name: 'Test Dataset',
        description: 'Test dataset for training',
        dataType: 'text',
        size: 1024,
        samples: 1000,
        format: 'json',
        tags: ['test'],
        quality: 'high'
      });

      const job = await pipeline.createTrainingJob('default-model', trainingData.id, config);

      expect(job).toBeDefined();
      expect(job.modelId).toBe('default-model');
      expect(job.dataId).toBe(trainingData.id);
      expect(job.config).toEqual(config);
      expect(job.status).toBe('pending');
      expect(job.progress).toBe(0);
    });

    it('should throw error for non-existent model', async () => {
      const config = {
        modelType: 'transformer' as const,
        modelSize: 'medium' as const,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 10,
        validationSplit: 0.2,
        earlyStopping: true,
        checkpointing: true
      };

      await expect(
        pipeline.createTrainingJob('non-existent-model', 'data-id', config)
      ).rejects.toThrow('Model non-existent-model not found');
    });

    it('should throw error for non-existent training data', async () => {
      const config = {
        modelType: 'transformer' as const,
        modelSize: 'medium' as const,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 10,
        validationSplit: 0.2,
        earlyStopping: true,
        checkpointing: true
      };

      await expect(
        pipeline.createTrainingJob('default-model', 'non-existent-data', config)
      ).rejects.toThrow('Training data non-existent-data not found');
    });
  });

  describe('startTraining', () => {
    it('should start training successfully', async () => {
      const config = {
        modelType: 'transformer' as const,
        modelSize: 'medium' as const,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 2, // Short training for testing
        validationSplit: 0.2,
        earlyStopping: true,
        checkpointing: true
      };

      const trainingData = await pipeline.addTrainingData({
        name: 'Test Dataset',
        description: 'Test dataset for training',
        dataType: 'text',
        size: 1024,
        samples: 1000,
        format: 'json',
        tags: ['test'],
        quality: 'high'
      });

      const job = await pipeline.createTrainingJob('default-model', trainingData.id, config);

      await pipeline.startTraining(job.id);

      const updatedJob = await pipeline.getTrainingJob(job.id);
      expect(updatedJob?.status).toBe('completed');
      expect(updatedJob?.progress).toBe(100);
      expect(updatedJob?.metrics.loss.length).toBeGreaterThan(0);
      expect(updatedJob?.metrics.accuracy.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent job', async () => {
      await expect(
        pipeline.startTraining('non-existent-job')
      ).rejects.toThrow('Training job non-existent-job not found');
    });
  });

  describe('cancelTraining', () => {
    it('should cancel training successfully', async () => {
      const config = {
        modelType: 'transformer' as const,
        modelSize: 'medium' as const,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 10,
        validationSplit: 0.2,
        earlyStopping: true,
        checkpointing: true
      };

      const trainingData = await pipeline.addTrainingData({
        name: 'Test Dataset',
        description: 'Test dataset for training',
        dataType: 'text',
        size: 1024,
        samples: 1000,
        format: 'json',
        tags: ['test'],
        quality: 'high'
      });

      const job = await pipeline.createTrainingJob('default-model', trainingData.id, config);

      await pipeline.cancelTraining(job.id);

      const updatedJob = await pipeline.getTrainingJob(job.id);
      expect(updatedJob?.status).toBe('cancelled');
    });
  });

  describe('evaluateModel', () => {
    it('should evaluate model successfully', async () => {
      const evaluation = await pipeline.evaluateModel('default-model', 'test-dataset');

      expect(evaluation).toBeDefined();
      expect(evaluation.modelId).toBe('default-model');
      expect(evaluation.datasetId).toBe('test-dataset');
      expect(evaluation.metrics.accuracy).toBeGreaterThan(0);
      expect(evaluation.metrics.precision).toBeGreaterThan(0);
      expect(evaluation.metrics.recall).toBeGreaterThan(0);
      expect(evaluation.metrics.f1Score).toBeGreaterThan(0);
      expect(evaluation.performance.inferenceTime).toBeGreaterThan(0);
    });

    it('should throw error for non-existent model', async () => {
      await expect(
        pipeline.evaluateModel('non-existent-model', 'test-dataset')
      ).rejects.toThrow('Model non-existent-model not found');
    });
  });

  describe('training data management', () => {
    it('should add and retrieve training data', async () => {
      const data = await pipeline.addTrainingData({
        name: 'Test Dataset',
        description: 'Test dataset for training',
        dataType: 'text',
        size: 1024,
        samples: 1000,
        format: 'json',
        tags: ['test'],
        quality: 'high'
      });

      expect(data).toBeDefined();
      expect(data.name).toBe('Test Dataset');
      expect(data.id).toBeDefined();

      const retrievedData = await pipeline.getTrainingData(data.id);
      expect(retrievedData).toEqual(data);
    });

    it('should get all training data', async () => {
      const allData = await pipeline.getAllTrainingData();
      expect(Array.isArray(allData)).toBe(true);
    });
  });

  describe('model management', () => {
    it('should get model successfully', async () => {
      const model = await pipeline.getModel('default-model');
      expect(model).toBeDefined();
      expect(model?.id).toBe('default-model');
      expect(model?.name).toBe('Gon Base Model');
    });

    it('should get all models', async () => {
      const models = await pipeline.getAllModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should deploy model successfully', async () => {
      await expect(
        pipeline.deployModel('default-model')
      ).resolves.not.toThrow();
    });
  });
});
