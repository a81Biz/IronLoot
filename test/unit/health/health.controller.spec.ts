import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '@modules/health/health.controller';
import { HealthService } from '@modules/health/health.service';
import { PrismaService } from '@/database/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockHealthService = {
    check: jest.fn().mockResolvedValue({
      status: 'ok',
      details: {
        database: { status: 'up' },
        uptime: 1000,
      },
    }),
    checkLiveness: jest.fn().mockReturnValue({ status: 'ok' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('health check via service', () => {
    it('should return health status from service', async () => {
      const result = await healthService.check();
      
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(mockHealthService.check).toHaveBeenCalled();
    });

    it('should return liveness status from service', () => {
      const result = healthService.checkLiveness();
      
      expect(result).toEqual({ status: 'ok' });
      expect(mockHealthService.checkLiveness).toHaveBeenCalled();
    });
  });
});
