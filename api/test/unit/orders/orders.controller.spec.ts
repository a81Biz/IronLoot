import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from '@/modules/orders/orders.controller';
import { OrdersService } from '@/modules/orders/orders.service';
import { JwtAuthGuard } from '@/modules/auth/guards';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    createFromAuction: jest.fn(),
    findAllForUser: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
