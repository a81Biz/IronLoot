import { Injectable } from '@nestjs/common';
import { UserState } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  StructuredLogger,
  ChildLogger,
  RequestContextService,
  MetricsService,
  UserNotFoundException,
  ForbiddenException,
  ConflictException,
  ValidationException,
  AuditEventType,
  EntityType,
  AuditResult,
} from '../../common/observability';
import { AuditPersistenceService } from '../audit/audit-persistence.service';
import {
  UpdateProfileDto,
  EnableSellerDto,
  UserProfileResponseDto,
  PublicUserResponseDto,
  UserStatsDto,
  VerificationStatusDto,
  UserSettingsDto,
  UpdateSettingsDto,
} from './dto';

/**
 * UsersService
 *
 * Handles user profile management:
 * - View/update own profile
 * - View public profiles
 * - Enable seller status
 * - Verification status
 */
@Injectable()
export class UsersService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly ctx: RequestContextService,
    private readonly metrics: MetricsService,
    private readonly audit: AuditPersistenceService,
  ) {
    this.log = this.logger.child('UsersService');
  }

  // ===========================================
  // GET OWN PROFILE
  // ===========================================

  async getOwnProfile(userId: string): Promise<UserProfileResponseDto> {
    this.log.debug('Fetching own profile', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return this.mapToUserProfileResponse(user);
  }

  // ===========================================
  // UPDATE PROFILE
  // ===========================================

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileResponseDto> {
    const traceId = this.ctx.getTraceId();
    this.log.debug('Updating profile', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    if (user.state !== UserState.ACTIVE) {
      throw new ForbiddenException('Only active users can update their profile');
    }

    // Separate user fields from profile fields
    const { displayName, avatarUrl, ...profileFields } = dto;
    const hasProfileUpdates = Object.values(profileFields).some((v) => v !== undefined);

    // Update user and profile in a transaction
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      // Update user fields if provided
      if (displayName !== undefined || avatarUrl !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(displayName !== undefined && { displayName }),
            ...(avatarUrl !== undefined && { avatarUrl }),
          },
        });
      }

      // Update or create profile if there are profile fields
      if (hasProfileUpdates) {
        await tx.profile.upsert({
          where: { userId },
          create: {
            userId,
            phone: profileFields.phone,
            address: profileFields.address,
            city: profileFields.city,
            country: profileFields.country,
            postalCode: profileFields.postalCode,
          },
          update: {
            ...(profileFields.phone !== undefined && { phone: profileFields.phone }),
            ...(profileFields.address !== undefined && { address: profileFields.address }),
            ...(profileFields.city !== undefined && { city: profileFields.city }),
            ...(profileFields.country !== undefined && { country: profileFields.country }),
            ...(profileFields.postalCode !== undefined && { postalCode: profileFields.postalCode }),
          },
        });
      }

      // Fetch final state with profile
      return tx.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
    });

    if (!updatedUser) {
      throw new UserNotFoundException(userId);
    }

    this.log.info('Profile updated successfully', { userId });
    this.metrics.increment('users_profile_updated');

    // Audit event
    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_PROFILE_UPDATED,
      EntityType.USER,
      userId,
      AuditResult.SUCCESS,
      {
        actorUserId: userId,
        payload: {
          updatedFields: Object.keys(dto).filter(
            (k) => dto[k as keyof UpdateProfileDto] !== undefined,
          ),
        },
      },
    );

    return this.mapToUserProfileResponse(updatedUser);
  }

  // ===========================================
  // GET PUBLIC PROFILE
  // ===========================================

  async getPublicProfile(userId: string): Promise<PublicUserResponseDto> {
    this.log.debug('Fetching public profile', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        isSeller: true,
        createdAt: true,
        state: true,
      },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Don't expose profiles of suspended or banned users
    if (user.state === UserState.SUSPENDED || user.state === UserState.BANNED) {
      throw new UserNotFoundException(userId);
    }

    // TODO: Calculate real stats when Auctions and Ratings modules are ready
    const stats = await this.calculateUserStats(userId);

    return {
      id: user.id,
      displayName: user.displayName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      isSeller: user.isSeller,
      memberSince: user.createdAt,
      stats,
    };
  }

  // ===========================================
  // GET USER STATS
  // ===========================================

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, createdAt: true },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return this.calculateUserStats(userId);
  }

  // ===========================================
  // GET VERIFICATION STATUS
  // ===========================================

  async getVerificationStatus(userId: string): Promise<VerificationStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const missingRequirements = this.checkSellerRequirements(user);

    return {
      emailVerified: !!user.emailVerifiedAt,
      state: user.state,
      canEnableSeller: missingRequirements.length === 0,
      missingRequirements: missingRequirements.length > 0 ? missingRequirements : undefined,
    };
  }

  // ===========================================
  // RESEND VERIFICATION EMAIL
  // ===========================================

  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const traceId = this.ctx.getTraceId();
    this.log.info('Resending verification email', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    if (user.emailVerifiedAt) {
      throw new ConflictException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = this.generateSecureToken();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken,
        emailVerificationExpiresAt,
      },
    });

    this.log.info('Verification email token generated', { userId });
    this.metrics.increment('users_verification_email_resent');

    // Audit event
    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_PROFILE_UPDATED,
      EntityType.USER,
      userId,
      AuditResult.SUCCESS,
      { actorUserId: userId, payload: { action: 'resend_verification' } },
    );

    // TODO: Send actual email when NotificationsModule is ready
    // await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

    return { message: 'Verification email sent. Please check your inbox.' };
  }

  // ===========================================
  // ENABLE SELLER
  // ===========================================

  async enableSeller(
    userId: string,
    dto: EnableSellerDto,
  ): Promise<{ isSeller: boolean; sellerEnabledAt: Date; message: string }> {
    const traceId = this.ctx.getTraceId();
    this.log.debug('Enabling seller status', { userId });

    if (!dto.acceptTerms) {
      throw new ValidationException('You must accept the seller terms and conditions');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Check if already a seller
    if (user.isSeller) {
      throw new ConflictException('User is already a seller');
    }

    // Verify requirements
    const requirements = this.checkSellerRequirements(user);
    if (requirements.length > 0) {
      throw new ValidationException('Requirements not met to become a seller', {
        missingRequirements: requirements,
      });
    }

    // Enable seller status
    const now = new Date();
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSeller: true,
        sellerEnabledAt: now,
      },
    });

    this.log.info('Seller status enabled', { userId });
    this.metrics.increment('users_seller_enabled');

    // Audit event
    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_SELLER_ENABLED,
      EntityType.USER,
      userId,
      AuditResult.SUCCESS,
      {
        actorUserId: userId,
        payload: {
          businessName: dto.businessName,
          hasTaxId: !!dto.taxId,
        },
      },
    );

    return {
      isSeller: updatedUser.isSeller,
      sellerEnabledAt: updatedUser.sellerEnabledAt!,
      message: 'Seller status enabled successfully. You can now create auctions.',
    };
  }

  // ===========================================
  // HELPERS
  // ===========================================

  private checkSellerRequirements(user: {
    state: UserState;
    emailVerifiedAt: Date | null;
    displayName: string | null;
    profile: {
      address: string | null;
      city: string | null;
      country: string | null;
    } | null;
  }): string[] {
    const missing: string[] = [];

    if (user.state !== UserState.ACTIVE) {
      missing.push('Account must be in ACTIVE state');
    }

    if (!user.emailVerifiedAt) {
      missing.push('Email must be verified');
    }

    if (!user.displayName) {
      missing.push('Display name is required');
    }

    if (!user.profile?.address) {
      missing.push('Address is required');
    }

    if (!user.profile?.city) {
      missing.push('City is required');
    }

    if (!user.profile?.country) {
      missing.push('Country is required');
    }

    return missing;
  }

  private async calculateUserStats(userId: string): Promise<UserStatsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    const [sold, won, ratings] = await Promise.all([
      // Sold: Auctions where user is seller and order exists (item actually sold)
      this.prisma.order.count({
        where: { sellerId: userId, status: { not: 'CANCELLED' } },
      }),
      // Won: Auctions where user is buyer
      this.prisma.order.count({
        where: { buyerId: userId, status: { not: 'CANCELLED' } },
      }),
      // Ratings: Received by user
      this.prisma.rating.aggregate({
        where: { targetId: userId },
        _avg: { score: true },
        _count: { score: true },
      }),
    ]);

    return {
      totalAuctionsSold: sold,
      totalAuctionsWon: won,
      averageRating: ratings._avg.score ? Number(ratings._avg.score) : 0,
      totalRatings: ratings._count.score,
      memberSince: user?.createdAt || new Date(),
    };
  }

  // ===========================================
  // USER SETTINGS (Spec v0.2.3)
  // ===========================================

  async getSettings(userId: string): Promise<UserSettingsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Prisma returns JSON object. Cast to DTO.
    return user.settings as unknown as UserSettingsDto;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<UserSettingsDto> {
    const traceId = this.ctx.getTraceId();
    this.log.debug('Updating user settings', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Ensure currentSettings is a plain object
    const rawSettings = (user.settings as unknown as UserSettingsDto) || {};
    const currentSettings = JSON.parse(JSON.stringify(rawSettings));
    const newSettings = this.deepMerge(currentSettings, dto);

    await this.prisma.user.update({
      where: { id: userId },
      data: { settings: newSettings as any },
    });

    this.log.info('User settings updated', { userId });

    // Audit event
    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_SETTINGS_UPDATE,
      EntityType.USER,
      userId,
      AuditResult.SUCCESS,
      {
        actorUserId: userId,
        payload: { updatedKeys: Object.keys(dto) },
      },
    );

    return newSettings;
  }

  private deepMerge(target: any, source: any): any {
    const isObject = (obj: any) => obj && typeof obj === 'object';

    if (!isObject(target) || !isObject(source)) {
      return source;
    }

    const output = { ...target };

    Object.keys(source).forEach((key) => {
      const targetValue = output[key];
      const sourceValue = source[key];

      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        output[key] = sourceValue; // Arrays overwrite
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        output[key] = this.deepMerge(targetValue, sourceValue);
      } else {
        output[key] = sourceValue;
      }
    });

    return output;
  }

  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private mapToUserProfileResponse(user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    state: UserState;
    emailVerifiedAt: Date | null;
    isSeller: boolean;
    sellerEnabledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    profile: {
      phone: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      postalCode: string | null;
    } | null;
  }): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      state: user.state,
      emailVerified: !!user.emailVerifiedAt,
      isSeller: user.isSeller,
      sellerEnabledAt: user.sellerEnabledAt || undefined,
      profile: user.profile
        ? {
            phone: user.profile.phone || undefined,
            address: user.profile.address || undefined,
            city: user.profile.city || undefined,
            country: user.profile.country || undefined,
            postalCode: user.profile.postalCode || undefined,
          }
        : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
