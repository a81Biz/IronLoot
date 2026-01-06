import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosticsController } from './diagnostics.controller';
import { PrismaService } from '../../database/prisma.service';
import { AuditPersistenceService } from '../audit/audit-persistence.service';
import { MetricsService, RequestContextService } from '../../common/observability';

describe('DiagnosticsController', () => {
  let controller: DiagnosticsController;

  const mockPrismaService = {
    errorEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    requestLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditService = {
    getErrorsByTrace: jest.fn(),
    getAuditHistory: jest.fn(),
  };

  const mockMetricsService = {
    getSnapshot: jest.fn(),
  };

  const mockContextService = {
    getTraceId: jest.fn().mockReturnValue('trace-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiagnosticsController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditPersistenceService, useValue: mockAuditService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: RequestContextService, useValue: mockContextService },
      ],
    }).compile();

    controller = module.get<DiagnosticsController>(DiagnosticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ping', () => {
    it('should return pong', () => {
      const result = controller.ping();
      expect(result.pong).toBe(true);
      expect(result.traceId).toBe('trace-id');
    });
  });

  describe('getErrors', () => {
    it('should return errors', async () => {
      const errors = [{ id: 'error-1' }];
      mockPrismaService.errorEvent.findMany.mockResolvedValue(errors);

      const result = await controller.getErrors();
      expect(result.errors).toBe(errors);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics', () => {
      const metrics = { cpu: 10 };
      mockMetricsService.getSnapshot.mockReturnValue(metrics);

      expect(controller.getMetrics()).toBe(metrics);
    });
  });
});
