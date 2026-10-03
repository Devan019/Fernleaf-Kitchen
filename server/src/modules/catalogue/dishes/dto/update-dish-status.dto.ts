import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateDishStatusDto {
  @ApiProperty({
    description: 'Active status of the dish for soft deactivation/activation',
    example: true,
  })
  @IsBoolean()
  isActive!: boolean;
}
