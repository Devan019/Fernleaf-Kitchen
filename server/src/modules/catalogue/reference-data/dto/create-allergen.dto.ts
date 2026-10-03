import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAllergenDto {
  @ApiProperty({
    description: 'Unique name of the allergen (e.g. Peanuts, Milk, Gluten)',
    example: 'Peanuts',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
