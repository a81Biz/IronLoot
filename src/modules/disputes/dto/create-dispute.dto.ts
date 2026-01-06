import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({
    description: 'ID of the Order to dispute',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'Reason for the dispute',
    example: 'Item not received',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'I paid for the item 2 weeks ago and it has not arrived.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}
