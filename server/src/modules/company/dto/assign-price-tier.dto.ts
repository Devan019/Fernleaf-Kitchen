import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignPriceTierDto {
  @ApiPropertyOptional({
    description:
      'Price tier ID to assign to this company, or null to remove company tier and fall back to default',
    example: 'cm987654321',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  priceTierId!: string | null;
}
