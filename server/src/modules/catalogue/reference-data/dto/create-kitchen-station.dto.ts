import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateKitchenStationDto {
  @ApiProperty({
    description:
      'Unique name of the kitchen station (e.g. Indian, Grill, Bakery, Dessert)',
    example: 'Indian',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
