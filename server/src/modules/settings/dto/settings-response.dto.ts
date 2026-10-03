import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../../generated/prisma/enums.js';

export class KitchenHolidayResponseDto {
  @ApiProperty({ example: 'clx123abc456' })
  id!: string;

  @ApiProperty({ example: '2026-12-25' })
  date!: string;

  @ApiProperty({ example: 'Christmas Day' })
  name!: string;

  @ApiPropertyOptional({ example: 'Kitchen closed for Christmas' })
  description!: string | null;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class KitchenSettingsResponseDto {
  @ApiProperty({
    enum: DayOfWeek,
    isArray: true,
    example: [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
    ],
  })
  workingDays!: DayOfWeek[];

  @ApiProperty({ example: '16:00' })
  cutOffTime!: string;

  @ApiProperty({ example: 2 })
  cutOffWorkingDays!: number;

  @ApiProperty({ example: 'Europe/London' })
  timezone!: string;

  @ApiProperty({ type: [KitchenHolidayResponseDto] })
  holidays!: KitchenHolidayResponseDto[];

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class DeleteHolidayResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Kitchen holiday deleted successfully' })
  message!: string;
}
