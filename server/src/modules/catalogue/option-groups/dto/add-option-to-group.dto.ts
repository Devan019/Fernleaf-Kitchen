import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddOptionToGroupDto {
  @ApiProperty({
    description: 'Option ID to attach to this group',
    example: 'clxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  optionId!: string;

  @ApiPropertyOptional({
    description: 'Display order for this option within the group (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayOrder?: number;
}
