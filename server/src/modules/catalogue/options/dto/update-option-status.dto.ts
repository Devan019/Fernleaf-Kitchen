import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateOptionStatusDto {
  @ApiProperty({
    description: 'Active status of the option for soft activation/deactivation',
    example: true,
  })
  @IsBoolean()
  isActive!: boolean;
}
