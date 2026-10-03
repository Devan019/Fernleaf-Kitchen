import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateEmployeePermissionsDto {
  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can choose their own delivery address for orders',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canChooseDeliveryAddress?: boolean;

  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can change order delivery time within window',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  canChangeDeliveryTime?: boolean;

  @ApiPropertyOptional({
    description:
      'Permission flag: Employee can customize meal packaging options',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canChangePackaging?: boolean;
}
