import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, AuthenticatedUser } from '@/modules/auth/decorators';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  EnableSellerDto,
  UserResponseDto,
  PublicUserResponseDto,
  EnableSellerResponseDto,
  VerificationStatusDto,
  UserStatsDto,
} from './dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user's full profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get own profile',
    description: "Returns the authenticated user's complete profile including private data",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOwnProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    const profile = await this.usersService.getOwnProfile(user.id);
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName ?? undefined,
      avatarUrl: profile.avatarUrl ?? undefined,
      state: profile.state,
      emailVerified: profile.emailVerified,
      isSeller: profile.isSeller,
      sellerEnabledAt: profile.sellerEnabledAt ?? undefined,
      profile: profile.profile
        ? {
            phone: profile.profile.phone ?? undefined,
            address: profile.profile.address ?? undefined,
            city: profile.profile.city ?? undefined,
            country: profile.profile.country ?? undefined,
            postalCode: profile.profile.postalCode ?? undefined,
          }
        : undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Update current user's profile
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update own profile',
    description: "Update the authenticated user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not active' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const profile = await this.usersService.updateProfile(user.id, dto);
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName ?? undefined,
      avatarUrl: profile.avatarUrl ?? undefined,
      state: profile.state,
      emailVerified: profile.emailVerified,
      isSeller: profile.isSeller,
      sellerEnabledAt: profile.sellerEnabledAt ?? undefined,
      profile: profile.profile
        ? {
            phone: profile.profile.phone ?? undefined,
            address: profile.profile.address ?? undefined,
            city: profile.profile.city ?? undefined,
            country: profile.profile.country ?? undefined,
            postalCode: profile.profile.postalCode ?? undefined,
          }
        : undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Get user's statistics
   */
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get user statistics',
    description: "Returns statistics about the user's activity on the platform",
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: UserStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(@CurrentUser() user: AuthenticatedUser): Promise<UserStatsDto> {
    const stats = await this.usersService.getUserStats(user.id);
    return stats;
  }

  /**
   * Get verification status
   */
  @Get('me/verification-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get verification status',
    description: "Check the user's verification status and seller eligibility",
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved',
    type: VerificationStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getVerificationStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VerificationStatusDto> {
    return this.usersService.getVerificationStatus(user.id);
  }

  /**
   * Resend verification email
   */
  @Post('me/resend-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Request a new verification email to be sent',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Verification email sent. Please check your inbox.' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Email already verified' })
  async resendVerification(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    return this.usersService.resendVerificationEmail(user.id);
  }

  /**
   * Enable seller status
   */
  @Post('me/enable-seller')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable seller status',
    description: 'Request to become a seller on the platform',
  })
  @ApiResponse({
    status: 200,
    description: 'Seller status enabled successfully',
    type: EnableSellerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Requirements not met or terms not accepted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Already a seller' })
  async enableSeller(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EnableSellerDto,
  ): Promise<EnableSellerResponseDto> {
    const result = await this.usersService.enableSeller(user.id, dto);
    return {
      success: true,
      isSeller: result.isSeller,
      sellerEnabledAt: result.sellerEnabledAt,
      message: result.message,
    };
  }

  /**
   * Get public profile of another user
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get public profile',
    description: 'Returns the public profile of a user (limited information)',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Public profile retrieved successfully',
    type: PublicUserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPublicProfile(@Param('id', ParseUUIDPipe) id: string): Promise<PublicUserResponseDto> {
    const profile = await this.usersService.getPublicProfile(id);
    return {
      id: profile.id,
      displayName: profile.displayName ?? undefined,
      avatarUrl: profile.avatarUrl ?? undefined,
      isSeller: profile.isSeller,
      memberSince: profile.memberSince,
      stats: profile.stats,
    };
  }
}
