import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentProvider } from '@prisma/client';

export class CreateShipmentDto {
  @ApiProperty({
    description: 'ID of the Order to ship',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'Shipping Provider',
    enum: ShipmentProvider,
    example: ShipmentProvider.DHL,
  })
  @IsEnum(ShipmentProvider)
  @IsNotEmpty()
  provider: ShipmentProvider;

  @ApiProperty({
    description: 'Tracking Number',
    example: '1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  trackingNumber?: string;
}
