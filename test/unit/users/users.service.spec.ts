import { Test, TestingModule } from '@nestjs/testing';
import { UserState } from '@prisma/client';
import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '@/database/prisma.service';
import { AuditPersistenceService } from '@/modules/audit/audit-persistence.service';
import {
  StructuredLogger,
  RequestContextService,
  MetricsService,
  UserNotFoundException,
  ForbiddenException,
  ValidationException,
  ConflictException,
} from '@/common/observability';

describe('UsersService', () => {
  let service: UsersService;

  let auditService: jest.Mocked<AuditPersistenceService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    state: UserState.ACTIVE,
    emailVerifiedAt: new Date('2024-01-01'),
    isSeller: false,
    sellerEnabledAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    profile: {
      id: '223e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      phone: '+1234567890',
      address: '123 Main St',
      city: 'New York',
      country: 'USA',
      postalCode: '10001',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    profile: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuditService = {
    recordAudit: jest.fn(),
  };

  const mockLoggerService = {
    child: jest.fn().mockReturnThis(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockRequestContext = {
    getTraceId: jest.fn().mockReturnValue('trace-123'),
    setUser: jest.fn(),
    getUserId: jest.fn(),
    getElapsedMs: jest.fn().mockReturnValue(100),
  };

  const mockMetrics = {
    increment: jest.fn(),
    startTimer: jest.fn().mockReturnValue(() => {}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditPersistenceService,
          useValue: mockAuditService,
        },
        {
          provide: StructuredLogger,
          useValue: mockLoggerService,
        },
        {
          provide: RequestContextService,
          useValue: mockRequestContext,
        },
        {
          provide: MetricsService,
          useValue: mockMetrics,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    auditService = module.get(AuditPersistenceService);
  });

  describe('getOwnProfile', () => {
    it('should return user profile with profile data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getOwnProfile(mockUser.id);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        displayName: mockUser.displayName,
        avatarUrl: mockUser.avatarUrl,
        state: mockUser.state,
        emailVerified: !!mockUser.emailVerifiedAt,
        isSeller: mockUser.isSeller,
        sellerEnabledAt: undefined,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        profile: {
          phone: mockUser.profile.phone,
          address: mockUser.profile.address,
          city: mockUser.profile.city,
          country: mockUser.profile.country,
          postalCode: mockUser.profile.postalCode,
        },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        include: { profile: true },
      });
    });

    it('should return user without profile if none exists', async () => {
      const userWithoutProfile = { ...mockUser, profile: null };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutProfile);

      const result = await service.getOwnProfile(mockUser.id);

      expect(result.profile).toBeUndefined();
    });

    it('should throw UserNotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getOwnProfile(mockUser.id)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile with limited data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        displayName: mockUser.displayName,
        avatarUrl: mockUser.avatarUrl,
        isSeller: mockUser.isSeller,
        createdAt: mockUser.createdAt,
        state: UserState.ACTIVE,
      });

      const result = await service.getPublicProfile(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.displayName).toBe(mockUser.displayName);
      expect(result.isSeller).toBe(mockUser.isSeller);
      expect(result.stats).toBeDefined();
      // Should not include email or other private data
      expect((result as any).email).toBeUndefined();
    });

    it('should throw UserNotFoundException for suspended users', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        state: UserState.SUSPENDED,
      });

      await expect(service.getPublicProfile(mockUser.id)).rejects.toThrow(UserNotFoundException);
    });

    it('should throw UserNotFoundException for banned users', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        state: UserState.BANNED,
      });

      await expect(service.getPublicProfile(mockUser.id)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateDto = {
        displayName: 'New Name',
        city: 'Los Angeles',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue(mockUser),
            findUnique: jest.fn().mockResolvedValue({
              ...mockUser,
              displayName: updateDto.displayName,
              profile: { ...mockUser.profile, city: updateDto.city },
            }),
          },
          profile: {
            upsert: jest.fn().mockResolvedValue(mockUser.profile),
          },
        };
        return callback(tx);
      });

      const result = await service.updateProfile(mockUser.id, updateDto);

      expect(result.displayName).toBe(updateDto.displayName);
      expect(auditService.recordAudit).toHaveBeenCalledWith(
        expect.anything(),
        'USER_PROFILE_UPDATED',
        expect.anything(),
        mockUser.id,
        expect.anything(),
        expect.objectContaining({
          actorUserId: mockUser.id,
        }),
      );
    });

    it('should throw ForbiddenException if user is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        state: UserState.SUSPENDED,
      });

      await expect(service.updateProfile(mockUser.id, { displayName: 'New Name' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw UserNotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(mockUser.id, { displayName: 'New Name' })).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('enableSeller', () => {
    it('should enable seller status when all requirements are met', async () => {
      const now = new Date();
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        isSeller: true,
        sellerEnabledAt: now,
      });

      const result = await service.enableSeller(mockUser.id, {
        acceptTerms: true,
      });

      expect(result.isSeller).toBe(true);
      expect(result.sellerEnabledAt).toBeDefined();
      expect(auditService.recordAudit).toHaveBeenCalledWith(
        expect.anything(),
        'USER_SELLER_ENABLED',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should throw ValidationException if terms not accepted', async () => {
      await expect(service.enableSeller(mockUser.id, { acceptTerms: false })).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ConflictException if already a seller', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isSeller: true,
      });

      await expect(service.enableSeller(mockUser.id, { acceptTerms: true })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ValidationException if email not verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerifiedAt: null,
      });

      await expect(service.enableSeller(mockUser.id, { acceptTerms: true })).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException if user not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        state: UserState.PENDING_VERIFICATION,
      });

      await expect(service.enableSeller(mockUser.id, { acceptTerms: true })).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException if profile incomplete', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        profile: null,
      });

      await expect(service.enableSeller(mockUser.id, { acceptTerms: true })).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status with seller eligibility', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getVerificationStatus(mockUser.id);

      expect(result.emailVerified).toBe(true);
      expect(result.state).toBe(UserState.ACTIVE);
      expect(result.canEnableSeller).toBe(true);
      expect(result.missingRequirements).toBeUndefined();
    });

    it('should return missing requirements if not eligible', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerifiedAt: null,
        displayName: null,
        profile: null,
      });

      const result = await service.getVerificationStatus(mockUser.id);

      expect(result.canEnableSeller).toBe(false);
      expect(result.missingRequirements).toContain('Email must be verified');
      expect(result.missingRequirements).toContain('Display name is required');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerifiedAt: null,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.resendVerificationEmail(mockUser.id);

      expect(result.message).toContain('Verification email sent');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(auditService.recordAudit).toHaveBeenCalledWith(
        expect.anything(),
        'USER_PROFILE_UPDATED', // Assuming it reuses this event or similar
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should throw ConflictException if email already verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.resendVerificationEmail(mockUser.id)).rejects.toThrow(ConflictException);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserStats(mockUser.id);

      expect(result).toHaveProperty('totalAuctionsSold');
      expect(result).toHaveProperty('totalAuctionsWon');
      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('totalRatings');
      expect(result).toHaveProperty('memberSince');
    });

    it('should throw UserNotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserStats(mockUser.id)).rejects.toThrow(UserNotFoundException);
    });
  });
});
