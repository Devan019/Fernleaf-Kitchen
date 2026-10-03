import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDeliveryAddressDto {
  @ApiPropertyOptional({
    description: 'Human-readable label for the address',
    example: 'Headquarters - Building 43',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiProperty({
    description: 'Street address line',
    example: '1600 Amphitheatre Parkway',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street!: string;

  @ApiPropertyOptional({
    description: 'Suite, floor, or unit number',
    example: 'Floor 2, Reception',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string;

  @ApiProperty({
    description: 'City or town name',
    example: 'Mountain View',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({
    description: 'Postcode or ZIP code',
    example: 'CA 94043',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  postcode!: string;

  @ApiPropertyOptional({
    description: 'Specific driver access instructions for this address',
    example: 'Security gate code is #4321',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryInstructions?: string;

  @ApiPropertyOptional({
    description:
      'Whether this address should be the company default delivery address',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
