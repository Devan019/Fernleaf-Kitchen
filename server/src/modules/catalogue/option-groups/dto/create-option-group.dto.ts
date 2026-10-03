import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOptionGroupDto {
  @ApiProperty({
    description:
      'Name of the option group (e.g. Choose your protein, Choose rice base)',
    example: 'Choose your protein',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description:
      'Whether choosing from this option group is required to order the dish',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Display order of the option group for UI presentation (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayOrder?: number;

  @ApiPropertyOptional({
    description:
      'Whether this option group uses portion sizes (Regular, Large)',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  usesPortions?: boolean = false;
}
