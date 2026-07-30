import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
import { MAIL_TIMEOUTS_MS } from './mail-timeouts';
import { EventsGateway } from './events.gateway';
import { NOTIFICATION_QUEUE } from './notification-queue.producer';
import { NotificationQueueProducer } from './notification-queue.producer';
import { NotificationQueueWorker } from './notification-queue.worker';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          port: config.get('MAIL_PORT'),
          secure: false,
          ignoreTLS: true,
          // PT-183 (H-033) — Sin estos topes nodemailer aplica los suyos: **dos minutos para conectar**. Con
          // el SMTP caído, el reenvío y el registro se quedaban colgados 121 s antes de contestar. Medido.
          ...MAIL_TIMEOUTS_MS,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: config.get('MAIL_FROM') || '"No Reply" <noreply@example.com>',
        },
        template: {
          dir: process.cwd() + '/src/modules/notifications/templates',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    EventsGateway,
    NotificationQueueProducer,
    NotificationQueueWorker,
  ],
  exports: [NotificationsService, EmailService, EventsGateway, NotificationQueueProducer],
})
export class NotificationsModule {}
