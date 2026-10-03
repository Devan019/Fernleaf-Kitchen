import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CategoryDishOrderItemDto {
  @ApiProperty({
    description: 'Dish ID',
    example: 'cm1234dish',
  })
  @IsString()
  @IsNotEmpty()
  dishId: string;

  @ApiProperty({
    description: '1-indexed display order',
    example: 1,
  })
  @IsInt()
  @Min(1)
  displayOrder: number;
}

export class ReorderCategoryDishesDto {
  @ApiProperty({
    description: 'Array of category dish reorder assignments',
    type: [CategoryDishOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CategoryDishOrderItemDto)
  items: CategoryDishOrderItemDto[];
}
