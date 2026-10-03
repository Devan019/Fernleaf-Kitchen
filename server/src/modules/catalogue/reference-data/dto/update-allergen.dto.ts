import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAllergenDto {
  @ApiPropertyOptional({
    description: 'Updated name of the allergen',
    example: 'Tree Nuts',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Active status for soft deactivation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
