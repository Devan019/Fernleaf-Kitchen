import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateEmployeeAllergiesDto {
  @ApiProperty({
    description: 'Array of valid catalogue Allergen IDs',
    example: ['cm444555666'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  allergenIds!: string[];
}
