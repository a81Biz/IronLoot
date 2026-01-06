import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserState } from '@prisma/client';

export class ProfileResponseDto {
  @ApiPropertyOptional({ description: 'Phone number' })
  @Expose()
  phone?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @Expose()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @Expose()
  city?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @Expose()
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @Expose()
  postalCode?: string;
}

export class UserStatsDto {
  @ApiProperty({ description: 'Total auctions created as seller', example: 15 })
  @Expose()
  totalAuctionsSold: number;

  @ApiProperty({ description: 'Total auctions won as buyer', example: 8 })
  @Expose()
  totalAuctionsWon: number;

  @ApiProperty({ description: 'Average rating received', example: 4.7 })
  @Expose()
  averageRating: number;

  @ApiProperty({ description: 'Total ratings received', example: 23 })
  @Expose()
  totalRatings: number;

  @ApiProperty({ description: 'Member since date' })
  @Expose()
  memberSince: Date;
}

/**
 * Full user response - only for authenticated user viewing their own profile
 */
export class UserResponseDto {
  @ApiProperty({ description: 'User ID', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Email address' })
  @Expose()
  email: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @Expose()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @Expose()
  avatarUrl?: string;

  @ApiProperty({ description: 'User state', enum: UserState })
  @Expose()
  state: UserState;

  @ApiProperty({ description: 'Email verified status' })
  @Expose()
  emailVerified: boolean;

  @ApiProperty({ description: 'Seller enabled status' })
  @Expose()
  isSeller: boolean;

  @ApiPropertyOptional({ description: 'Seller enabled date' })
  @Expose()
  sellerEnabledAt?: Date;

  @ApiPropertyOptional({ description: 'User profile data', type: ProfileResponseDto })
  @Expose()
  @Type(() => ProfileResponseDto)
  profile?: ProfileResponseDto;

  @ApiProperty({ description: 'Account creation date' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  updatedAt: Date;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiPropertyOptional({ description: 'Display name' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string;

  @ApiProperty({ description: 'User state', enum: UserState })
  state: UserState;

  @ApiProperty({ description: 'Email verified status' })
  emailVerified: boolean;

  @ApiProperty({ description: 'Seller enabled status' })
  isSeller: boolean;

  @ApiPropertyOptional({ description: 'Seller enabled date' })
  sellerEnabledAt?: Date;

  @ApiPropertyOptional({ description: 'User profile data', type: ProfileResponseDto })
  profile?: ProfileResponseDto;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

/**
 * Public user response - for viewing other users' profiles
 */
export class PublicUserResponseDto {
  @ApiProperty({ description: 'User ID', format: 'uuid' })
  @Expose()
  id: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @Expose()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @Expose()
  avatarUrl?: string;

  @ApiProperty({ description: 'Seller status' })
  @Expose()
  isSeller: boolean;

  @ApiPropertyOptional({ description: 'User statistics', type: UserStatsDto })
  @Expose()
  @Type(() => UserStatsDto)
  stats?: UserStatsDto;

  @ApiProperty({ description: 'Member since date' })
  @Expose()
  memberSince: Date;
}

/**
 * Seller enablement response
 */
export class EnableSellerResponseDto {
  @ApiProperty({ description: 'Success status' })
  @Expose()
  success: boolean;

  @ApiProperty({ description: 'Seller enabled status' })
  @Expose()
  isSeller: boolean;

  @ApiProperty({ description: 'Seller enabled date' })
  @Expose()
  sellerEnabledAt: Date;

  @ApiProperty({ description: 'Response message' })
  @Expose()
  message: string;
}

/**
 * Verification status response
 */
export class VerificationStatusDto {
  @ApiProperty({ description: 'Email verified status' })
  @Expose()
  emailVerified: boolean;

  @ApiProperty({ description: 'Current user state', enum: UserState })
  @Expose()
  state: UserState;

  @ApiProperty({ description: 'Whether user can become a seller' })
  @Expose()
  canEnableSeller: boolean;

  @ApiPropertyOptional({ description: 'Requirements missing to become seller' })
  @Expose()
  missingRequirements?: string[];
}
