import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PriceDerivationType } from '../../../generated/prisma/enums.js';

export class UpdatePriceTierDto {
  @ApiPropertyOptional({
    description: 'Unique name of the price tier',
    example: 'Enterprise Plus',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the price tier',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Price derivation strategy: MANUAL, COST_MULTIPLIER, or TIER_PERCENTAGE',
    enum: PriceDerivationType,
  })
  @IsOptional()
  @IsEnum(PriceDerivationType)
  derivationType?: PriceDerivationType;

  @ApiPropertyOptional({
    description: 'Base price tier ID when derivationType is TIER_PERCENTAGE',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  baseTierId?: string | null;

  @ApiPropertyOptional({
    description:
      'Multiplier applied to cost when derivationType is COST_MULTIPLIER',
    example: 2.5,
    minimum: 0.01,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: 'Multiplier must be greater than 0' })
  multiplier?: number | null;

  @ApiPropertyOptional({
    description:
      'Percentage markup applied to base tier when derivationType is TIER_PERCENTAGE',
    example: 20.0,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  percentage?: number | null;

  @ApiPropertyOptional({
    description: 'Whether this tier should be the default tier',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this tier is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
