import request = require('supertest');
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';

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

  /**
   * PT-131 — Crea un usuario listo para operar.
   *
   * `saldo` existe porque **pujar retiene fondos**: `BidsService.placeBid` llama a
   * `walletService.holdFunds`, y sin monedero eso devuelve `Wallet not found` (404). Los specs
   * e2e se escribieron antes de que la puja tocara el monedero, y por eso empezaron a fallar sin
   * que nadie lo viera: el job de CI que los habria ejecutado no podia terminar (H-015).
   *
   * El monedero se crea y se acredita **directamente en la base**, a proposito. La via publica es
   * `POST /wallet/deposit`, que exige una referencia de pago verificada contra la pasarela real —
   * no es algo que un test de integracion deba hacer, y ademas hoy devuelve 500 con una referencia
   * inventada (H-018).
   */
  async createAuthenticatedUser(
    options: { isSeller?: boolean; saldo?: number } = {},
  ): Promise<TestUser> {
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

    // 3.5 Monedero con saldo, si el escenario lo necesita.
    //
    // Directamente en la base y no por `POST /wallet/deposit`: la via publica exige una referencia
    // de pago verificada contra la pasarela real. Un test de integracion no debe depender de eso —
    // y hoy, ademas, con una referencia inventada devuelve 500 (H-018).
    if (options.saldo && options.saldo > 0) {
      const usuario = await this.prisma.user.findUnique({ where: { email } });
      if (usuario) {
        await this.prisma.wallet.upsert({
          where: { userId: usuario.id },
          create: { userId: usuario.id, balance: options.saldo, currency: 'MXN', isActive: true },
          update: { balance: options.saldo, isActive: true },
        });
      }
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
