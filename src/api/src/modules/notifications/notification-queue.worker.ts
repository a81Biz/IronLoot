import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from './email.service';
import {
  NOTIFICATION_QUEUE,
  NotificationEmailJob,
  NotificationCampaignJob,
} from './notification-queue.producer';

@Processor(NOTIFICATION_QUEUE)
export class NotificationQueueWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationQueueWorker.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-email':
        return this.processEmail(job as Job<NotificationEmailJob>);
      case 'campaign-inapp':
        return this.processCampaignInApp(job as Job<NotificationCampaignJob>);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async processEmail(job: Job<NotificationEmailJob>): Promise<void> {
    const { to, subject, context } = job.data;
    this.logger.debug(`Processing email job ${job.id} to ${to} (attempt ${job.attemptsMade + 1})`);

    try {
      if (job.data.template === 'verification') {
        await this.emailService.sendVerificationEmail(to, context['token'] as string);
      } else if (job.data.template === 'reset-password') {
        await this.emailService.sendPasswordResetEmail(to, context['token'] as string);
      } else {
        this.logger.warn(
          `No handler for email template: ${job.data.template} (subject: ${subject})`,
        );
      }
    } catch (err) {
      this.logger.error(`Email job ${job.id} failed (attempt ${job.attemptsMade + 1})`, err);
      throw err;
    }
  }

  private async processCampaignInApp(job: Job<NotificationCampaignJob>): Promise<void> {
    const { userId, title, body } = job.data;
    this.logger.debug(`Processing campaign inApp job ${job.id} for user ${userId}`);

    try {
      await this.prisma.notification.create({
        data: { userId, type: 'SYSTEM', title, message: body },
      });
    } catch (err) {
      this.logger.error(`Campaign inApp job ${job.id} failed for user ${userId}`, err);
      throw err;
    }
  }
}
