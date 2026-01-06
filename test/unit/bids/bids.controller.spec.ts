import { Test, TestingModule } from '@nestjs/testing';
import { BidsController } from '@/modules/bids/bids.controller';
import { BidsService } from '@/modules/bids/bids.service';
import { JwtAuthGuard } from '@/modules/auth/guards';

describe('BidsController', () => {
  let controller: BidsController;

  const mockBidsService = {
    placeBid: jest.fn(),
    getBidsForAuction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BidsController],
      providers: [{ provide: BidsService, useValue: mockBidsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BidsController>(BidsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
