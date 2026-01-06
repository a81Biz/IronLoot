import { Test, TestingModule } from '@nestjs/testing';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../../modules/auth/guards';

describe('RatingsController', () => {
  let controller: RatingsController;
  // let service: RatingsService;

  const mockRatingsService = {
    create: jest.fn(),
    findAllByTarget: jest.fn(),
  };

  const mockUser = { id: 'user-id' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingsController],
      providers: [
        {
          provide: RatingsService,
          useValue: mockRatingsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RatingsController>(RatingsController);
    // service = module.get<RatingsService>(RatingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a rating', async () => {
      const dto = { orderId: 'order-1', score: 5, comment: 'Great!' } as any;
      const result = { id: 'rating-1', ...dto };

      mockRatingsService.create.mockResolvedValue(result);

      expect(await controller.create(mockUser, dto)).toBe(result);
      expect(mockRatingsService.create).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('findAllByTarget', () => {
    it('should return ratings for user', async () => {
      const result = [{ id: 'rating-1' }];
      mockRatingsService.findAllByTarget.mockResolvedValue(result);

      expect(await controller.findAllByTarget('target-id')).toBe(result);
      expect(mockRatingsService.findAllByTarget).toHaveBeenCalledWith('target-id');
    });
  });
});
