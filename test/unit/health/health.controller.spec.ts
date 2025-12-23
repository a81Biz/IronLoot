import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '@modules/health/health.controller';
import { HealthService } from '@modules/health/health.service';
import { PrismaService } from '@/database/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                NODE_ENV: 'test',
                API_VERSION: '0.1.0',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const result = await controller.getHealth();

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe('getLiveness', () => {
    it('should return liveness probe', () => {
      const result = controller.getLiveness();

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
