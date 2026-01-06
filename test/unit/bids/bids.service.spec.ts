import { Test, TestingModule } from '@nestjs/testing';
import { BidsService } from '@/modules/bids/bids.service';
import { PrismaService } from '@/database/prisma.service';
import { StructuredLogger, RequestContextService } from '@/common/observability';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrismaService: any = {
  auction: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  bid: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};
mockPrismaService.$transaction = jest.fn((cb) => cb(mockPrismaService));

const mockLogger = {
  child: jest.fn().mockReturnThis(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockRequestContext = {
  getUserId: jest.fn(),
};

describe('BidsService', () => {
  let service: BidsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StructuredLogger, useValue: mockLogger },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<BidsService>(BidsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
