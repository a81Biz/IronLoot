import { IsNumber, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBidDto {
  @ApiProperty({ example: 105.5, description: 'Bid amount. Must be greater than current price.' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;
}
