import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddPortionToGroupDto {
  @ApiProperty({
    description:
      'Portion Size ID to attach to this group (e.g. Regular, Large)',
    example: 'clxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  portionSizeId!: string;

  @ApiPropertyOptional({
    description:
      'Display order for this portion size inside the group (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayOrder?: number;
}
