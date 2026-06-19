import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class CfdiService {
  private readonly logger = new Logger(CfdiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async getCfdi(orderId: string): Promise<any> {
    return (this.prisma as any).cfdiRecord.findUnique({ where: { orderId } });
  }

  async list(page = 1, limit = 20, status?: string): Promise<any> {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      (this.prisma as any).cfdiRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).cfdiRecord.count({ where }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async generate(orderId: string): Promise<any> {
    const rfc = await this.systemConfig.get('CFDI_RFC_EMISOR');
    const pacUrl = await this.systemConfig.get('CFDI_PAC_URL');

    if (!rfc || !pacUrl) {
      await (this.prisma as any).cfdiRecord.upsert({
        where: { orderId },
        create: {
          orderId,
          status: 'ERROR',
          errorMessage: 'CFDI no configurado: falta RFC emisor o PAC URL',
        },
        update: {
          status: 'ERROR',
          errorMessage: 'CFDI no configurado: falta RFC emisor o PAC URL',
        },
      });
      throw new NotImplementedException(
        'CFDI generation requires PAC configuration. Set CFDI_RFC_EMISOR and CFDI_PAC_URL in platform settings.',
      );
    }

    await (this.prisma as any).cfdiRecord.upsert({
      where: { orderId },
      create: { orderId, status: 'PENDING' },
      update: { status: 'PENDING', errorMessage: null },
    });

    this.logger.warn(
      `CFDI generation for order ${orderId} — PAC integration pending implementation`,
    );
    throw new NotImplementedException(
      'CFDI PAC integration is pending. Select and install a PAC library (see PENDING_TASKS.md task 84-85).',
    );
  }

  async cancel(orderId: string): Promise<void> {
    await (this.prisma as any).cfdiRecord.update({
      where: { orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  async getConfig(): Promise<any> {
    return {
      rfcEmisor: (await this.systemConfig.get('CFDI_RFC_EMISOR')) ?? '',
      pacUrl: (await this.systemConfig.get('CFDI_PAC_URL')) ?? '',
      pacApiKey: '****',
    };
  }

  async updateConfig(
    data: { rfcEmisor?: string; pacUrl?: string; pacApiKey?: string },
    adminUser: string,
  ): Promise<void> {
    if (data.rfcEmisor !== undefined)
      await this.systemConfig.set('CFDI_RFC_EMISOR', data.rfcEmisor, adminUser);
    if (data.pacUrl !== undefined)
      await this.systemConfig.set('CFDI_PAC_URL', data.pacUrl, adminUser);
    if (data.pacApiKey !== undefined)
      await this.systemConfig.set('CFDI_PAC_API_KEY', data.pacApiKey, adminUser);
  }
}
