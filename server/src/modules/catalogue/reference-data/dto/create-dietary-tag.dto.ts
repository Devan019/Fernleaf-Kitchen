import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDietaryTagDto {
  @ApiProperty({
    description:
      'Unique name of the dietary tag (e.g. Vegan, Vegetarian, Jain)',
    example: 'Vegan',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
