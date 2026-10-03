import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCategoryStatusDto {
  @ApiProperty({
    description: 'Active status of the category',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}
