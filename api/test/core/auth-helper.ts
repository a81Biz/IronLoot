import request = require('supertest');
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../api/src/database/prisma.service';

export interface TestUser {
  id: string;
  email: string;
  token: string;
  isSeller?: boolean;
}

export class AuthHelper {
  constructor(
    private readonly app: INestApplication,
    private readonly prisma: PrismaService,
  ) {}

  async createAuthenticatedUser(options: { isSeller?: boolean } = {}): Promise<TestUser> {
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `test-${uniqueId}@test.com`;
    const password = 'TestPassword123!';
    const username = `user${uniqueId}`;

    // 1. Register
    await request(this.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, username, displayName: 'Test User' })
      .expect(201);

    // 2. Verify email manualy (db hack)
    await this.prisma.user.update({
      where: { email },
      data: {
        emailVerifiedAt: new Date(),
        state: 'ACTIVE',
      },
    });

    // 3. Enable seller if requested
    if (options.isSeller) {
      await this.prisma.user.update({
        where: { email },
        data: {
          isSeller: true,
          sellerEnabledAt: new Date(),
          profile: {
            create: {
              address: '123 Test St',
              city: 'Test City',
              country: 'Test Country',
              postalCode: '12345',
            },
          },
        },
      });
    }

    // 4. Login
    const response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      id: response.body.user.id,
      email,
      token: response.body.tokens.accessToken,
      isSeller: options.isSeller,
    };
  }

  async cleanup(emailSubstring: string = '@test.com'): Promise<void> {
    // Delete test users (cascade deletes profile, auctions, etc)
    // Be careful not to delete real users if running on dev db
    // Ideally we run on test db
    try {
      await this.prisma.user.deleteMany({
        where: { email: { contains: emailSubstring } },
      });
    } catch (e) {
      console.error('Cleanup failed', e);
    }
  }
}
