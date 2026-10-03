import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Bowls & Greens',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({
    description: '1-indexed display order for category sequence',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  displayOrder?: number;

  @ApiPropertyOptional({
    description:
      'Whether the category is secret (not shown in regular menu listing, but reachable directly)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;
}
