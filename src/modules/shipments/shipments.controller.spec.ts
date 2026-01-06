import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../../modules/auth/guards';

describe('ShipmentsController', () => {
  let controller: ShipmentsController;
  // let service: ShipmentsService;

  const mockShipmentsService = {
    create: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockUser = { id: 'user-id' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShipmentsController],
      providers: [
        {
          provide: ShipmentsService,
          useValue: mockShipmentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ShipmentsController>(ShipmentsController);
    // service = module.get<ShipmentsService>(ShipmentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a shipment', async () => {
      const dto = { orderId: 'order-1', carrier: 'DHL', trackingNumber: '123' } as any;
      const result = { id: 'shipment-1', ...dto };

      mockShipmentsService.create.mockResolvedValue(result);

      expect(await controller.create(mockUser, dto)).toBe(result);
      expect(mockShipmentsService.create).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('findOne', () => {
    it('should return a shipment', async () => {
      const result = { id: 'shipment-1' };
      mockShipmentsService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(mockUser, 'shipment-1')).toBe(result);
      expect(mockShipmentsService.findOne).toHaveBeenCalledWith(mockUser.id, 'shipment-1');
    });
  });

  describe('updateStatus', () => {
    it('should update status', async () => {
      const dto = { status: 'SHIPPED' } as any;
      const result = { id: 'shipment-1', status: 'SHIPPED' };

      mockShipmentsService.updateStatus.mockResolvedValue(result);

      expect(await controller.updateStatus(mockUser, 'shipment-1', dto)).toBe(result);
      expect(mockShipmentsService.updateStatus).toHaveBeenCalledWith(
        mockUser.id,
        'shipment-1',
        dto,
      );
    });
  });
});
