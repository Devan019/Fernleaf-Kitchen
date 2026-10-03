import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateOrderDeliveryDto {
  @ApiPropertyOptional({
    description: 'Updated delivery address ID belonging to the company',
  })
  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @ApiPropertyOptional({
    description: 'Updated delivery time in HH:mm format',
    example: '13:00',
  })
  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @ApiPropertyOptional({
    description: 'Updated packaging type',
    example: 'ECO',
  })
  @IsOptional()
  @IsString()
  packagingType?: string;

  @ApiPropertyOptional({
    description: 'Updated delivery instructions',
    example: 'Leave at reception',
  })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;
}
