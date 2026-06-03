import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CmsContentType } from '@prisma/client';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  async getContent(key: string): Promise<string | null> {
    const record = await this.prisma.cmsContent.findUnique({ where: { key } });
    return record?.value ?? null;
  }

  async getAllContent() {
    return this.prisma.cmsContent.findMany({ orderBy: { key: 'asc' } });
  }

  async setContent(key: string, value: string, type: CmsContentType, updatedBy: string) {
    return this.prisma.cmsContent.upsert({
      where: { key },
      create: { key, value, type, updatedBy },
      update: { value, type, updatedBy },
    });
  }
}
