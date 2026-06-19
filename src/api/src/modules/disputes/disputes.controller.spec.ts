import { Test, TestingModule } from '@nestjs/testing';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../../modules/auth/guards';

describe('DisputesController', () => {
  let controller: DisputesController;
  // let service: DisputesService;

  const mockDisputesService = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUser = { id: 'user-id', isSeller: false } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisputesController],
      providers: [
        {
          provide: DisputesService,
          useValue: mockDisputesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DisputesController>(DisputesController);
    // service = module.get<DisputesService>(DisputesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a dispute', async () => {
      const dto = { orderId: 'order-id', reason: 'item_not_received' } as any;
      const result = { id: 'dispute-id', ...dto };

      mockDisputesService.create.mockResolvedValue(result);

      expect(await controller.create(mockUser, dto)).toBe(result);
      expect(mockDisputesService.create).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('findAll', () => {
    it('should return user disputes', async () => {
      const result = [{ id: 'dispute-1' }];
      mockDisputesService.findAllByUser.mockResolvedValue(result);

      expect(await controller.findAll(mockUser)).toBe(result);
      expect(mockDisputesService.findAllByUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findOne', () => {
    it('should return a single dispute', async () => {
      const result = { id: 'dispute-1' };
      mockDisputesService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(mockUser, 'dispute-1')).toBe(result);
      expect(mockDisputesService.findOne).toHaveBeenCalledWith(mockUser.id, 'dispute-1');
    });
  });
});
