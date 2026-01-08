import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationsSettingsDto {
  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;
}

export class UserSettingsDto {
  @ApiProperty({ example: 'es' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ type: NotificationsSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsSettingsDto)
  notifications?: NotificationsSettingsDto;
}

export class UpdateSettingsDto extends UserSettingsDto {}
