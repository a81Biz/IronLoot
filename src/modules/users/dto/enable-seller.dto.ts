import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class EnableSellerDto {
  @ApiProperty({
    description: 'User accepts seller terms and conditions',
    example: true,
  })
  @IsBoolean({ message: 'acceptTerms must be a boolean' })
  acceptTerms: boolean;

  @ApiPropertyOptional({
    description: 'Optional business name for seller profile',
    example: 'John\'s Collectibles',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Business name must not exceed 100 characters' })
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Optional tax ID for business sellers',
    example: 'XX-XXXXXXX',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Tax ID must not exceed 50 characters' })
  taxId?: string;
}
