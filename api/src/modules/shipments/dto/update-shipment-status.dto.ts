import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';

export class UpdateShipmentStatusDto {
  @ApiProperty({
    description: 'New Status',
    enum: ShipmentStatus,
    example: ShipmentStatus.SHIPPED,
  })
  @IsEnum(ShipmentStatus)
  @IsNotEmpty()
  status: ShipmentStatus;

  @ApiProperty({
    description: 'Location or description of the update',
    example: 'Arrived at distribution center',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;
}
