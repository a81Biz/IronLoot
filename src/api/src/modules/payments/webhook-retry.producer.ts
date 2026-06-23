import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const WEBHOOK_RETRY_QUEUE = 'webhook-retry';

export interface WebhookRetryJob {
  provider: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  query: Record<string, string>;
  failedAt: string;
  originalError: string;
}

@Injectable()
export class WebhookRetryProducer {
  constructor(@InjectQueue(WEBHOOK_RETRY_QUEUE) private readonly queue: Queue) {}

  async enqueueRetry(data: WebhookRetryJob) {
    return this.queue.add('retry-webhook', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 120_000 }, // 2min → 4min → 8min → 16min → 32min
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    });
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    return { name: WEBHOOK_RETRY_QUEUE, waiting, active, completed, failed, delayed };
  }
}
