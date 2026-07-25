import { KycService } from '../../../src/modules/kyc/kyc.service';

/**
 * PT-069 — KYC obligatorio. Verifica el estado más reciente y el helper de aprobación
 * usados por el gate de vendedor/retiro.
 */
describe('KycService (PT-069)', () => {
  let service: KycService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      kycSubmission: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new KycService(prisma);
  });

  it('submit crea una submission PENDING', async () => {
    prisma.kycSubmission.create.mockResolvedValue({ id: 'k1', status: 'PENDING' });
    const r = await service.submit('u1', { idType: 'INE' });
    expect(prisma.kycSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', status: 'PENDING' }),
      }),
    );
    expect(r.status).toBe('PENDING');
  });

  it('getUserKycStatus devuelve el estado de la última submission', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({ status: 'APPROVED' });
    expect(await service.getUserKycStatus('u1')).toBe('APPROVED');
  });

  it('getUserKycStatus devuelve null si no hay submissions', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue(null);
    expect(await service.getUserKycStatus('u1')).toBeNull();
  });

  it('isApproved solo es true con APPROVED', () => {
    expect(service.isApproved('APPROVED')).toBe(true);
    expect(service.isApproved('PENDING')).toBe(false);
    expect(service.isApproved(null)).toBe(false);
  });
});
