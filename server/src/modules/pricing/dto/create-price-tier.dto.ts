import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PriceDerivationType } from '../../../generated/prisma/enums.js';

export class CreatePriceTierDto {
  @ApiProperty({
    description: 'Unique name of the price tier',
    example: 'Enterprise',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional description of the price tier',
    example: 'Enterprise tier with 15% markup over standard pricing',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description:
      'Price derivation strategy: MANUAL, COST_MULTIPLIER, or TIER_PERCENTAGE',
    enum: PriceDerivationType,
    example: PriceDerivationType.TIER_PERCENTAGE,
  })
  @IsEnum(PriceDerivationType)
  derivationType!: PriceDerivationType;

  @ApiPropertyOptional({
    description: 'Base price tier ID when derivationType is TIER_PERCENTAGE',
    example: 'cm123456789',
  })
  @IsOptional()
  @IsString()
  baseTierId?: string;

  @ApiPropertyOptional({
    description:
      'Multiplier applied to cost when derivationType is COST_MULTIPLIER (must be > 0)',
    example: 2.4,
    minimum: 0.01,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: 'Multiplier must be greater than 0' })
  multiplier?: number;

  @ApiPropertyOptional({
    description:
      'Percentage markup applied to base tier when derivationType is TIER_PERCENTAGE',
    example: 15.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  percentage?: number;

  @ApiPropertyOptional({
    description:
      'Whether this tier should be the default tier for companies without one',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this tier is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
