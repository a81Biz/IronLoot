import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/database/prisma.service';

export class TestApp {
  private app: INestApplication;
  private prismaService: PrismaService;

  async init(): Promise<void> {
    // Set env for tests
    process.env.JWT_SECRET = 'gVhWufw77SwrICrpSAXKWP4htd1G7XSVvJEK1Wm5EAF';
    process.env.JWT_EXPIRATION = '1h';
    // Ensure tests running on host connect to localhost, not 'db' container
    process.env.DATABASE_URL =
      'postgresql://ironloot:ironloot_dev@localhost:5432/ironloot_db?schema=public';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();

    this.app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    this.app.setGlobalPrefix('api');
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await this.app.init();
    this.prismaService = this.app.get(PrismaService);
  }

  getApp(): INestApplication {
    return this.app;
  }

  getPrisma(): PrismaService {
    return this.prismaService;
  }

  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }
}
