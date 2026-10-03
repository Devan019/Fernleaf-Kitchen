import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateEmployeeDietaryTagsDto {
  @ApiProperty({
    description: 'Array of valid catalogue DietaryTag IDs',
    example: ['cm777888999'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  dietaryTagIds!: string[];
}
