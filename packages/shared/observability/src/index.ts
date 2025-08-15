import { z } from 'zod';

export const TelemetryConfig = z.object({
  enabled: z.boolean().default(false),
  endpoint: z.string().optional(),
  sampleRate: z.number().min(0).max(1).default(0.1),
});
export type TelemetryConfig = z.infer<typeof TelemetryConfig>;

export class Logger {
  private prefix: string;

  constructor(name: string) {
    this.prefix = `[${name}]`;
  }

  info(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${this.prefix} ${message}`, data || '');
    }
  }

  error(message: string, error?: any): void {
    console.error(`${this.prefix} ERROR: ${message}`, error || '');
  }

  warn(message: string, data?: any): void {
    console.warn(`${this.prefix} WARN: ${message}`, data || '');
  }
}

export class Metrics {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  increment(name: string, value = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  record(name: string, value: number): void {
    const histogram = this.histograms.get(name) || [];
    histogram.push(value);
    this.histograms.set(name, histogram);
  }

  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, count] of this.counters) {
      stats[name] = count;
    }

    for (const [name, values] of this.histograms) {
      if (values.length > 0) {
        stats[name] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
        };
      }
    }

    return stats;
  }
}

export const logger = new Logger('Voice');
export const metrics = new Metrics();
