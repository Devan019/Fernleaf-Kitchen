import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateOptionGroupDto {
  @ApiPropertyOptional({
    description: 'Updated name of the option group',
    example: 'Select Protein',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether choosing from this option group is required',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Display order of the option group',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this option group uses portion sizes',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  usesPortions?: boolean;
}
