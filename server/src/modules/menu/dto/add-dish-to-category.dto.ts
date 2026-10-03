import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddDishToCategoryDto {
  @ApiProperty({
    description: 'Dish ID to assign to the category',
    example: 'cm1234dish',
  })
  @IsString()
  @IsNotEmpty()
  dishId: string;

  @ApiProperty({
    description: '1-indexed display order for the dish within this category',
    example: 1,
  })
  @IsInt()
  @Min(1)
  displayOrder: number;
}
