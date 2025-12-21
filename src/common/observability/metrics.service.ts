import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from './logger.service';
import { MetricPoint } from './constants';

/**
 * Metric Types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMING = 'timing',
}

/**
 * Histogram buckets for response times (ms)
 */
const DEFAULT_TIMING_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * MetricsService
 *
 * In-memory metrics collection service.
 * Can be extended to push to external systems (Prometheus, DataDog, etc.)
 *
 * Features:
 * - Counter: Monotonically increasing values (requests, errors)
 * - Gauge: Point-in-time values (active connections, queue size)
 * - Histogram: Distribution of values (response times)
 * - Timing: Measure execution duration
 *
 * Reference: 03-modelo-registro-db.md
 */
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();
  private readonly env: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.env = this.config.get<string>('NODE_ENV', 'development');
  }

  // ===========================================
  // COUNTERS
  // ===========================================

  /**
   * Increment a counter
   */
  increment(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Get counter value
   */
  getCounter(name: string, tags?: Record<string, string>): number {
    const key = this.buildKey(name, tags);
    return this.counters.get(key) || 0;
  }

  // ===========================================
  // GAUGES
  // ===========================================

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    this.gauges.set(key, value);
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, tags?: Record<string, string>): number | undefined {
    const key = this.buildKey(name, tags);
    return this.gauges.get(key);
  }

  /**
   * Increment gauge
   */
  gaugeIncrement(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const current = this.gauges.get(key) || 0;
    this.gauges.set(key, current + value);
  }

  /**
   * Decrement gauge
   */
  gaugeDecrement(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const current = this.gauges.get(key) || 0;
    this.gauges.set(key, Math.max(0, current - value));
  }

  // ===========================================
  // HISTOGRAMS
  // ===========================================

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    
    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(key, values);
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, tags?: Record<string, string>): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const key = this.buildKey(name, tags);
    const values = this.histograms.get(key);
    
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / count,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  // ===========================================
  // TIMING
  // ===========================================

  /**
   * Start a timer, returns a function to stop it
   */
  startTimer(name: string, tags?: Record<string, string>): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.histogram(name, duration, tags);
      return duration;
    };
  }

  /**
   * Record execution time directly
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.histogram(name, durationMs, tags);
  }

  /**
   * Execute a function and record its duration
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>,
  ): Promise<T> {
    const stop = this.startTimer(name, tags);
    try {
      return await fn();
    } finally {
      stop();
    }
  }

  /**
   * Execute sync function and record duration
   */
  timeSync<T>(name: string, fn: () => T, tags?: Record<string, string>): T {
    const stop = this.startTimer(name, tags);
    try {
      return fn();
    } finally {
      stop();
    }
  }

  // ===========================================
  // PREDEFINED METRICS
  // ===========================================

  /**
   * Record HTTP request metric
   */
  recordRequest(method: string, path: string, status: number, durationMs: number): void {
    const tags = { method, path: this.normalizePath(path), status: String(status) };
    
    this.increment('http_requests_total', 1, tags);
    this.histogram('http_request_duration_ms', durationMs, tags);

    if (status >= 400) {
      this.increment('http_errors_total', 1, tags);
    }
  }

  /**
   * Record business event metric
   */
  recordBusinessEvent(eventType: string, result: 'success' | 'failure'): void {
    this.increment('business_events_total', 1, { eventType, result });
  }

  /**
   * Record database query metric
   */
  recordDbQuery(operation: string, table: string, durationMs: number): void {
    this.histogram('db_query_duration_ms', durationMs, { operation, table });
  }

  /**
   * Record cache operation metric
   */
  recordCacheOp(operation: string, hit: boolean, durationMs: number): void {
    this.increment('cache_operations_total', 1, { operation, hit: String(hit) });
    this.histogram('cache_operation_duration_ms', durationMs, { operation });
  }

  /**
   * Record external service call
   */
  recordExternalCall(service: string, operation: string, success: boolean, durationMs: number): void {
    this.increment('external_calls_total', 1, { service, operation, success: String(success) });
    this.histogram('external_call_duration_ms', durationMs, { service, operation });
  }

  // ===========================================
  // EXPORT
  // ===========================================

  /**
   * Get all metrics as snapshot
   */
  getSnapshot(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, ReturnType<typeof this.getHistogramStats>>;
  } {
    const counters: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const histograms: Record<string, ReturnType<typeof this.getHistogramStats>> = {};

    this.counters.forEach((value, key) => {
      counters[key] = value;
    });

    this.gauges.forEach((value, key) => {
      gauges[key] = value;
    });

    this.histograms.forEach((_, key) => {
      histograms[key] = this.getHistogramStats(key);
    });

    return { counters, gauges, histograms };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  // ===========================================
  // HELPERS
  // ===========================================

  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${tagStr}}`;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private normalizePath(path: string): string {
    // Replace UUIDs with :id
    return path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  }
}
