export interface TrainingConfig {
  modelType: 'transformer' | 'lstm' | 'cnn' | 'custom';
  modelSize: 'small' | 'medium' | 'large' | 'xlarge';
  learningRate: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
  earlyStopping: boolean;
  checkpointing: boolean;
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  modelType: string;
  modelSize: string;
  createdAt: Date;
  updatedAt: Date;
  parameters: number;
  accuracy: number;
  loss: number;
  status: 'training' | 'ready' | 'failed' | 'archived';
  tags: string[];
  domain: string;
}

export interface TrainingData {
  id: string;
  name: string;
  description: string;
  dataType: 'text' | 'audio' | 'multimodal';
  size: number;
  samples: number;
  format: string;
  createdAt: Date;
  tags: string[];
  quality: 'low' | 'medium' | 'high';
}

export interface TrainingJob {
  id: string;
  modelId: string;
  dataId: string;
  config: TrainingConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  endTime?: Date;
  metrics: {
    loss: number[];
    accuracy: number[];
    validationLoss: number[];
    validationAccuracy: number[];
  };
  logs: string[];
  error?: string;
}

export interface ModelEvaluation {
  id: string;
  modelId: string;
  datasetId: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    confusionMatrix: number[][];
  };
  performance: {
    inferenceTime: number;
    memoryUsage: number;
    throughput: number;
  };
  createdAt: Date;
}

export interface Intent {
  id: string;
  name: string;
  description: string;
  examples: string[];
  confidence: number;
  entities: Entity[];
}

export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'location' | 'date' | 'time' | 'number' | 'custom';
  value: string;
  confidence: number;
  start: number;
  end: number;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  history: ConversationTurn[];
  currentIntent?: Intent;
  entities: Entity[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  speaker: 'user' | 'assistant';
  message: string;
  intent?: Intent;
  entities: Entity[];
  confidence: number;
  response?: string;
}

export interface NLPAnalysis {
  text: string;
  intents: Intent[];
  entities: Entity[];
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  };
  language: string;
  confidence: number;
}

export interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  description: string;
  changes: string[];
  performance: {
    accuracy: number;
    loss: number;
    inferenceTime: number;
  };
  createdAt: Date;
  isActive: boolean;
  deploymentStatus: 'pending' | 'deployed' | 'failed';
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  modelA: string;
  modelB: string;
  trafficSplit: number; // percentage to model B
  metrics: {
    accuracy: number;
    userSatisfaction: number;
    responseTime: number;
    errorRate: number;
  };
  status: 'running' | 'completed' | 'stopped';
  startDate: Date;
  endDate?: Date;
  winner?: 'A' | 'B' | 'tie';
}
