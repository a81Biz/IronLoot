import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '@/modules/orders/orders.service';
import { PrismaService } from '@/database/prisma.service';
import { StructuredLogger } from '@/common/observability';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrismaService: any = {
  $transaction: jest.fn((cb) => cb(mockPrismaService)),
  auction: {
    findUnique: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};
// Circular fix
mockPrismaService.$transaction = jest.fn((cb) => cb(mockPrismaService));

const mockLogger = {
  child: jest.fn().mockReturnThis(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
