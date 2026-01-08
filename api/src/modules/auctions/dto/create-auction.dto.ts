import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsArray,
  Min,
  IsUrl,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Custom validator: date must be in the future
@ValidatorConstraint({ name: 'isFutureDate', async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    const date = new Date(value);
    return date > new Date();
  }

  defaultMessage() {
    return 'Date must be in the future';
  }
}

// Custom validator: endsAt must be after startsAt
@ValidatorConstraint({ name: 'isAfterStartDate', async: false })
class IsAfterStartDateConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const object = args.object as CreateAuctionDto;
    const startsAt = new Date(object.startsAt);
    const endsAt = new Date(value);
    // Minimum duration: 1 hour
    const minDuration = 60 * 60 * 1000;
    return endsAt.getTime() - startsAt.getTime() >= minDuration;
  }

  defaultMessage() {
    return 'End date must be at least 1 hour after start date';
  }
}

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
  @Min(1, { message: 'Starting price must be at least $1.00' })
  startingPrice: number;

  @ApiProperty({ example: '2026-01-10T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  @Validate(IsFutureDateConstraint)
  startsAt: string;

  @ApiProperty({ example: '2026-01-11T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  @Validate(IsAfterStartDateConstraint)
  endsAt: string;

  @ApiProperty({ example: ['https://example.com/image1.jpg'], required: false })
  @IsArray()
  @ArrayMaxSize(10, { message: 'Maximum 10 images allowed' })
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  @IsOptional()
  images?: string[];
}
