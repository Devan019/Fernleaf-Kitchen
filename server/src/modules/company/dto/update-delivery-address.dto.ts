import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDeliveryAddressDto {
  @ApiPropertyOptional({
    description: 'Human-readable label for the address',
    example: 'Headquarters - Building 43 (Renovated)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    description: 'Street address line',
    example: '1600 Amphitheatre Parkway',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({
    description: 'Suite, floor, or unit number',
    example: 'Floor 3, Tech Hub',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string;

  @ApiPropertyOptional({
    description: 'City or town name',
    example: 'Mountain View',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Postcode or ZIP code',
    example: 'CA 94043',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  postcode?: string;

  @ApiPropertyOptional({
    description: 'Specific driver access instructions for this address',
    example: 'Security gate code updated to #9876',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryInstructions?: string;

  @ApiPropertyOptional({
    description:
      'Whether this address should be the company default delivery address',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
