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

export class CategoryOrderItemDto {
  @ApiProperty({
    description: 'Category ID',
    example: 'cm1234category',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: '1-indexed display order',
    example: 1,
  })
  @IsInt()
  @Min(1)
  displayOrder: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({
    description: 'Array of category reorder assignments',
    type: [CategoryOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderItemDto)
  categories: CategoryOrderItemDto[];
}
