import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OptionPortionItemDto {
  @ApiProperty({
    description: 'ID of the portion size (e.g. Regular, Large)',
    example: 'clxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  portionSizeId!: string;

  @ApiProperty({
    description:
      'Extra charge for this portion size on this option (must be >= 0)',
    example: 1.5,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Extra charge must not be negative' })
  extraCharge!: number;
}

export class CreateOptionDto {
  @ApiProperty({
    description: 'Option name (e.g. Paneer, Tofu, Jeera Rice, Mint Chutney)',
    example: 'Paneer',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Cost price of the option (must be >= 0)',
    example: 1.75,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost price must not be negative' })
  costPrice!: number;

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
    description: 'Optional portion configurations for this option',
    type: [OptionPortionItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionPortionItemDto)
  portions?: OptionPortionItemDto[];
}
