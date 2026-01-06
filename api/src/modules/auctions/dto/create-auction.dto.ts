import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsArray,
  Min,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuctionDto {
  @ApiProperty({ example: 'Legendary Sword of Azzinoth' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A powerful sword dropped by Illidan Stormrage.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 100.0 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  startingPrice: number;

  @ApiProperty({ example: '2023-12-25T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startsAt: string;

  @ApiProperty({ example: '2023-12-26T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endsAt: string;

  @ApiProperty({ example: ['https://example.com/image1.jpg'], required: false })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];
}
