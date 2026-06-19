import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const SEEDED_KEYS: Array<{
  key: string;
  envKey: string;
  category: string;
  isSecret: boolean;
  description: string;
  defaultValue?: string;
}> = [
  // Auctions
  {
    key: 'AUCTION_SOFT_CLOSE_WINDOW_SEC',
    envKey: 'AUCTION_SOFT_CLOSE_WINDOW_SEC',
    category: 'auctions',
    isSecret: false,
    description: 'Segundos que se extiende una subasta al recibir oferta en los últimos N segundos',
    defaultValue: '120',
  },
  {
    key: 'REQUIRE_AUCTION_MODERATION',
    envKey: 'REQUIRE_AUCTION_MODERATION',
    category: 'auctions',
    isSecret: false,
    description: 'Requiere aprobación del admin antes de publicar subastas (true/false)',
    defaultValue: 'false',
  },
  {
    key: 'AUCTION_MIN_INCREMENT_AMOUNT',
    envKey: 'AUCTION_MIN_INCREMENT_AMOUNT',
    category: 'auctions',
    isSecret: false,
    description: 'Monto mínimo de incremento por oferta (MXN)',
    defaultValue: '10',
  },
  {
    key: 'AUCTION_MIN_DURATION_HOURS',
    envKey: 'AUCTION_MIN_DURATION_HOURS',
    category: 'auctions',
    isSecret: false,
    description: 'Duración mínima de una subasta en horas',
    defaultValue: '1',
  },
  {
    key: 'AUCTION_MAX_DURATION_HOURS',
    envKey: 'AUCTION_MAX_DURATION_HOURS',
    category: 'auctions',
    isSecret: false,
    description: 'Duración máxima de una subasta en horas',
    defaultValue: '720',
  },
  // Users
  {
    key: 'REQUIRE_EMAIL_VERIFICATION',
    envKey: 'REQUIRE_EMAIL_VERIFICATION',
    category: 'users',
    isSecret: false,
    description: 'Requiere verificación de email antes de activar cuenta',
    defaultValue: 'true',
  },
  {
    key: 'REQUIRE_KYC_FOR_SELLERS',
    envKey: 'REQUIRE_KYC_FOR_SELLERS',
    category: 'users',
    isSecret: false,
    description: 'Requiere KYC aprobado antes de habilitar venta',
    defaultValue: 'true',
  },
  // SMTP
  {
    key: 'SMTP_HOST',
    envKey: 'SMTP_HOST',
    category: 'smtp',
    isSecret: false,
    description: 'Servidor SMTP',
    defaultValue: 'localhost',
  },
  {
    key: 'SMTP_PORT',
    envKey: 'SMTP_PORT',
    category: 'smtp',
    isSecret: false,
    description: 'Puerto SMTP',
    defaultValue: '1025',
  },
  {
    key: 'SMTP_USER',
    envKey: 'SMTP_USER',
    category: 'smtp',
    isSecret: false,
    description: 'Usuario SMTP',
    defaultValue: '',
  },
  {
    key: 'SMTP_PASSWORD',
    envKey: 'SMTP_PASSWORD',
    category: 'smtp',
    isSecret: true,
    description: 'Contraseña SMTP',
    defaultValue: '',
  },
  {
    key: 'SMTP_FROM',
    envKey: 'SMTP_FROM',
    category: 'smtp',
    isSecret: false,
    description: 'Dirección remitente',
    defaultValue: 'noreply@ironloot.com',
  },
  // Storage
  {
    key: 'STORAGE_PROVIDER',
    envKey: 'STORAGE_PROVIDER',
    category: 'storage',
    isSecret: false,
    description: 'Proveedor de almacenamiento (LOCAL|S3|MINIO)',
    defaultValue: 'LOCAL',
  },
  {
    key: 'STORAGE_BUCKET',
    envKey: 'STORAGE_BUCKET',
    category: 'storage',
    isSecret: false,
    description: 'Nombre del bucket',
    defaultValue: '',
  },
  {
    key: 'STORAGE_REGION',
    envKey: 'STORAGE_REGION',
    category: 'storage',
    isSecret: false,
    description: 'Región del bucket',
    defaultValue: '',
  },
  {
    key: 'STORAGE_ACCESS_KEY',
    envKey: 'STORAGE_ACCESS_KEY',
    category: 'storage',
    isSecret: true,
    description: 'Access Key',
    defaultValue: '',
  },
  {
    key: 'STORAGE_SECRET_KEY',
    envKey: 'STORAGE_SECRET_KEY',
    category: 'storage',
    isSecret: true,
    description: 'Secret Key',
    defaultValue: '',
  },
  // CFDI
  {
    key: 'CFDI_RFC_EMISOR',
    envKey: 'CFDI_RFC_EMISOR',
    category: 'cfdi',
    isSecret: false,
    description: 'RFC del emisor (plataforma)',
    defaultValue: '',
  },
  {
    key: 'CFDI_PAC_URL',
    envKey: 'CFDI_PAC_URL',
    category: 'cfdi',
    isSecret: false,
    description: 'URL del PAC para timbrado',
    defaultValue: '',
  },
  {
    key: 'CFDI_PAC_API_KEY',
    envKey: 'CFDI_PAC_API_KEY',
    category: 'cfdi',
    isSecret: true,
    description: 'API Key del PAC',
    defaultValue: '',
  },
];

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed(): Promise<void> {
    for (const entry of SEEDED_KEYS) {
      const existing = await this.prisma.systemConfig.findUnique({ where: { key: entry.key } });
      if (!existing) {
        const envValue = process.env[entry.envKey];
        await (this.prisma.systemConfig as any).create({
          data: {
            key: entry.key,
            value: envValue ?? entry.defaultValue ?? '',
            isSecret: entry.isSecret,
            category: entry.category,
            description: entry.description,
          },
        });
      }
    }
  }

  async get(key: string): Promise<string | undefined> {
    try {
      const record = await this.prisma.systemConfig.findUnique({ where: { key } });
      if (record) return record.value;
    } catch {
      // Fall through to ENV
    }
    return process.env[key];
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const val = await this.get(key);
    const parsed = Number(val);
    return isNaN(parsed) ? fallback : parsed;
  }

  async set(key: string, value: string, updatedBy: string): Promise<void> {
    await (this.prisma.systemConfig as any).upsert({
      where: { key },
      create: { key, value, updatedBy, category: 'general' },
      update: { value, updatedBy },
    });
  }

  async getByCategory(category: string): Promise<
    Array<{
      key: string;
      value: string;
      isSecret: boolean;
      category: string;
      description: string | null;
    }>
  > {
    const records: any[] = await (this.prisma.systemConfig as any).findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
    return records.map((r: any) => ({
      key: r.key,
      value: r.isSecret ? '****' : r.value,
      isSecret: r.isSecret ?? false,
      category: r.category ?? category,
      description: r.description ?? null,
    }));
  }

  async updateCategory(
    category: string,
    updates: Record<string, string>,
    updatedBy: string,
  ): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      const existing: any = await (this.prisma.systemConfig as any).findUnique({ where: { key } });
      if (existing && (existing.category === category || !existing.category)) {
        await (this.prisma.systemConfig as any).update({
          where: { key },
          data: { value, updatedBy },
        });
      }
    }
  }

  async getRealValue(key: string): Promise<string> {
    const record = await this.prisma.systemConfig.findUnique({ where: { key } });
    return record?.value ?? process.env[key] ?? '';
  }
}
