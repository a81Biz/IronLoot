import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { CfdiService } from '@/modules/cfdi/cfdi.service';
import { PrismaService } from '@/database/prisma.service';
import { SystemConfigService } from '@/modules/system-config/system-config.service';

// PT-047 (AUD-016): CFDI on/off toggle so the platform can operate without a PAC yet.
describe('CfdiService — CFDI_ENABLED toggle', () => {
  let service: CfdiService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = { cfdiRecord: { upsert: jest.fn(), findUnique: jest.fn() } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg: any = { get: jest.fn(), set: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        CfdiService,
        { provide: PrismaService, useValue: prisma },
        { provide: SystemConfigService, useValue: cfg },
      ],
    }).compile();
    service = mod.get(CfdiService);
  });

  it('generate() rejects with 503 when CFDI is disabled (default)', async () => {
    cfg.get.mockResolvedValue(undefined); // CFDI_ENABLED unset → disabled
    await expect(service.generate('o1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.cfdiRecord.upsert).not.toHaveBeenCalled();
  });

  it('getConfig() reflects enabled=false by default', async () => {
    cfg.get.mockResolvedValue(undefined);
    const c = await service.getConfig();
    expect(c.enabled).toBe(false);
  });

  it('updateConfig() persists the enabled flag', async () => {
    await service.updateConfig({ enabled: true }, 'admin');
    expect(cfg.set).toHaveBeenCalledWith('CFDI_ENABLED', 'true', 'admin');
  });

  it('when enabled but PAC not configured, it does not report "disabled" (falls through)', async () => {
    cfg.get.mockImplementation((k: string) =>
      Promise.resolve(k === 'CFDI_ENABLED' ? 'true' : undefined),
    );
    await expect(service.generate('o1')).rejects.not.toBeInstanceOf(ServiceUnavailableException);
  });
});
