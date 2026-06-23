import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PaymentsService } from './payments.service';
import { WEBHOOK_RETRY_QUEUE, WebhookRetryJob } from './webhook-retry.producer';

@Processor(WEBHOOK_RETRY_QUEUE)
export class WebhookRetryWorker extends WorkerHost {
  private readonly logger = new Logger(WebhookRetryWorker.name);

  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  async process(job: Job<WebhookRetryJob>): Promise<void> {
    const { provider, payload, headers, query, originalError } = job.data;
    this.logger.log(
      `Retrying webhook for ${provider} (attempt ${job.attemptsMade + 1}), original error: ${originalError}`,
    );

    try {
      await this.paymentsService.handleWebhook(
        provider,
        payload,
        headers as Record<string, string>,
        query as Record<string, string>,
      );
      this.logger.log(`Webhook retry succeeded for ${provider} job ${job.id}`);
    } catch (err) {
      this.logger.error(
        `Webhook retry attempt ${job.attemptsMade + 1} failed for ${provider}`,
        err,
      );
      throw err;
    }
  }
}
