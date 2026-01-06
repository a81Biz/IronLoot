/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UserState } from '@prisma/client';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    state: UserState.ACTIVE,
  };

  const mockUserProfile = {
    id: mockUser.id,
    email: mockUser.email,
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    state: UserState.ACTIVE,
    emailVerified: true,
    isSeller: false,
    sellerEnabledAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    profile: {
      phone: '+1234567890',
      address: '123 Main St',
      city: 'New York',
      country: 'USA',
      postalCode: '10001',
    },
  };

  const mockPublicProfile = {
    id: mockUser.id,
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    isSeller: false,
    memberSince: new Date('2024-01-01'),
    stats: {
      totalAuctionsSold: 5,
      totalAuctionsWon: 3,
      averageRating: 4.5,
      totalRatings: 8,
      memberSince: new Date('2024-01-01'),
    },
  };

  const mockUsersService = {
    getOwnProfile: jest.fn(),
    updateProfile: jest.fn(),
    getPublicProfile: jest.fn(),
    enableSeller: jest.fn(),
    resendVerificationEmail: jest.fn(),
    getVerificationStatus: jest.fn(),
    getUserStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('getOwnProfile', () => {
    it('should return current user profile', async () => {
      mockUsersService.getOwnProfile.mockResolvedValue(mockUserProfile);

      const result = await controller.getOwnProfile(mockUser);

      expect(result.id).toBe(mockUserProfile.id);
      expect(result.email).toBe(mockUserProfile.email);
      expect(result.displayName).toBe(mockUserProfile.displayName);
      expect(result.profile).toBeDefined();
      expect(usersService.getOwnProfile).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle null profile gracefully', async () => {
      mockUsersService.getOwnProfile.mockResolvedValue({
        ...mockUserProfile,
        profile: null,
      });

      const result = await controller.getOwnProfile(mockUser);

      expect(result.profile).toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('should update and return user profile', async () => {
      const updateDto = { displayName: 'New Name' };
      mockUsersService.updateProfile.mockResolvedValue({
        ...mockUserProfile,
        displayName: 'New Name',
      });

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(result.displayName).toBe('New Name');
      expect(usersService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateDto);
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalAuctionsSold: 5,
        totalAuctionsWon: 3,
        averageRating: 4.5,
        totalRatings: 8,
        memberSince: new Date('2024-01-01'),
      };
      mockUsersService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual(mockStats);
      expect(usersService.getUserStats).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status', async () => {
      const mockStatus = {
        emailVerified: true,
        state: UserState.ACTIVE,
        canEnableSeller: true,
        missingRequirements: [],
      };
      mockUsersService.getVerificationStatus.mockResolvedValue(mockStatus);

      const result = await controller.getVerificationStatus(mockUser);

      expect(result).toEqual(mockStatus);
      expect(usersService.getVerificationStatus).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email', async () => {
      mockUsersService.resendVerificationEmail.mockResolvedValue({
        message: 'Verification email sent',
      });

      const result = await controller.resendVerification(mockUser);

      expect(result.message).toBe('Verification email sent');
      expect(usersService.resendVerificationEmail).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('enableSeller', () => {
    it('should enable seller status', async () => {
      const enableDto = { acceptTerms: true };
      const now = new Date();
      mockUsersService.enableSeller.mockResolvedValue({
        isSeller: true,
        sellerEnabledAt: now,
        message: 'Seller status enabled',
      });

      const result = await controller.enableSeller(mockUser, enableDto);

      expect(result.success).toBe(true);
      expect(result.isSeller).toBe(true);
      expect(result.sellerEnabledAt).toBe(now);
      expect(usersService.enableSeller).toHaveBeenCalledWith(mockUser.id, enableDto);
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile', async () => {
      mockUsersService.getPublicProfile.mockResolvedValue(mockPublicProfile);

      const result = await controller.getPublicProfile(mockUser.id);

      expect(result.id).toBe(mockPublicProfile.id);
      expect(result.displayName).toBe(mockPublicProfile.displayName);
      expect(result.stats).toBeDefined();
      // Should not include email
      expect((result as any).email).toBeUndefined();
      expect(usersService.getPublicProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
