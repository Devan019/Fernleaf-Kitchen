import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OptionPortionItemDto } from './create-option.dto.js';

export class UpdateOptionDto {
  @ApiPropertyOptional({
    description: 'Updated option name',
    example: 'Organic Paneer',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated cost price (must be >= 0)',
    example: 2.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost price must not be negative' })
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'List of Allergen IDs associated with this option',
    type: [String],
    example: ['clxxxxxxxxxxxxxxx'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergenIds?: string[];

  @ApiPropertyOptional({
    description: 'List of Dietary Tag IDs associated with this option',
    type: [String],
    example: ['clxxxxxxxxxxxxxxx'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryTagIds?: string[];

  @ApiPropertyOptional({
    description: 'Portion extra charge configurations for this option',
    type: [OptionPortionItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionPortionItemDto)
  portions?: OptionPortionItemDto[];
}
