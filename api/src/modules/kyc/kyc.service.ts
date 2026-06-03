import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  async getQueue(page = 1, limit = 20, status = 'PENDING'): Promise<any> {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [submissions, total] = await Promise.all([
      (this.prisma as any).kycSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'asc' },
      }),
      (this.prisma as any).kycSubmission.count({ where }),
    ]);

    const data = await Promise.all(
      submissions.map(async (s: any) => {
        const user = await this.prisma.user.findUnique({
          where: { id: s.userId },
          select: { email: true, username: true, displayName: true },
        });
        return { ...s, user };
      }),
    );

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getSubmission(id: string): Promise<any> {
    const submission = await (this.prisma as any).kycSubmission.findUnique({ where: { id } });
    if (!submission) throw new NotFoundException('KYC submission not found');
    const user = await this.prisma.user.findUnique({
      where: { id: submission.userId },
      select: { id: true, email: true, username: true, displayName: true },
    });
    return { ...submission, user };
  }

  async approve(id: string, adminUser: string): Promise<void> {
    const submission = await (this.prisma as any).kycSubmission.findUnique({ where: { id } });
    if (!submission) throw new NotFoundException('KYC submission not found');

    await this.prisma.$transaction([
      (this.prisma as any).kycSubmission.update({
        where: { id },
        data: { status: 'APPROVED', reviewedBy: adminUser },
      }),
      this.prisma.user.update({
        where: { id: submission.userId },
        data: { isSeller: true, sellerEnabledAt: new Date() },
      }),
    ]);
  }

  async reject(id: string, reason: string, adminUser: string): Promise<void> {
    await (this.prisma as any).kycSubmission.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: adminUser, reviewNotes: reason },
    });
  }

  async requestCorrection(id: string, notes: string, adminUser: string): Promise<void> {
    await (this.prisma as any).kycSubmission.update({
      where: { id },
      data: { status: 'CORRECTION_NEEDED', reviewedBy: adminUser, reviewNotes: notes },
    });
  }

  async submit(userId: string, docs: Record<string, string>): Promise<any> {
    return (this.prisma as any).kycSubmission.create({
      data: {
        userId,
        docsJson: docs,
        status: 'PENDING',
      },
    });
  }
}
