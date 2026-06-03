import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async getSeoConfig(page: string) {
    return this.prisma.seoConfig.findUnique({ where: { page } });
  }

  async getAllSeoConfigs() {
    return this.prisma.seoConfig.findMany({ orderBy: { page: 'asc' } });
  }

  async setSeoConfig(
    page: string,
    config: Partial<{
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogImage: string;
    }>,
    updatedBy: string,
  ) {
    return this.prisma.seoConfig.upsert({
      where: { page },
      create: { page, ...config, updatedBy },
      update: { ...config, updatedBy },
    });
  }
}
