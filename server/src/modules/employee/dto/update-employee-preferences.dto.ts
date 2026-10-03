import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeePreferencesDto {
  @ApiPropertyOptional({
    description: 'Catalogue Allergen IDs applicable to this employee',
    example: ['cm444555666'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergenIds?: string[];

  @ApiPropertyOptional({
    description: 'Catalogue DietaryTag IDs applicable to this employee',
    example: ['cm777888999'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryTagIds?: string[];
}
