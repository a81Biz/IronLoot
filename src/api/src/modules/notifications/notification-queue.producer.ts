import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const NOTIFICATION_QUEUE = 'notification-jobs';

export interface NotificationEmailJob {
  to: string;
  template: 'verification' | 'reset-password' | 'generic';
  subject: string;
  context: Record<string, unknown>;
}

export interface NotificationCampaignJob {
  campaignId: string;
  userId: string;
  title: string;
  body: string;
}

@Injectable()
export class NotificationQueueProducer {
  constructor(@InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue) {}

  async addEmailJob(data: NotificationEmailJob) {
    return this.queue.add('send-email', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    });
  }

  async addCampaignNotificationJob(data: NotificationCampaignJob) {
    return this.queue.add('campaign-inapp', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 100 },
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
    return { name: NOTIFICATION_QUEUE, waiting, active, completed, failed, delayed };
  }
}
