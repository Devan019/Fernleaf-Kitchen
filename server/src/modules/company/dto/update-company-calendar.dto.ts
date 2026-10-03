import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum } from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums.js';

export class UpdateCompanyCalendarDto {
  @ApiProperty({
    description:
      'List of active working days for the company (at least one day required)',
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
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @ArrayMinSize(1, { message: 'Company calendar must have at least one working day' })
  workingDays!: DayOfWeek[];
}
