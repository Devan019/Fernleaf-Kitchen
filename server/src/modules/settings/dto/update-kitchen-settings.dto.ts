import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums.js';

@ValidatorConstraint({ name: 'isIanaTimezone', async: false })
export class IsIanaTimezoneConstraint implements ValidatorConstraintInterface {
  validate(timezone: any, _args: ValidationArguments): boolean {
    if (!timezone || typeof timezone !== 'string') {
      return false;
    }
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid IANA timezone (e.g. 'Europe/London', 'America/New_York', 'UTC')`;
  }
}

export class UpdateKitchenSettingsDto {
  @ApiPropertyOptional({
    description: 'Kitchen operational working days',
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
  @IsOptional()
  @IsArray({ message: 'workingDays must be an array' })
  @ArrayNotEmpty({ message: 'At least one working day must be specified' })
  @ArrayUnique({ message: 'Working days cannot contain duplicates' })
  @IsEnum(DayOfWeek, {
    each: true,
    message: 'Each working day must be a valid DayOfWeek enum value',
  })
  workingDays?: DayOfWeek[];

  @ApiPropertyOptional({
    description: 'Order cut-off time in 24-hour HH:mm format',
    example: '16:00',
  })
  @IsOptional()
  @IsString({ message: 'cutOffTime must be a string' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'cutOffTime must be in HH:mm 24-hour format (00:00 to 23:59)',
  })
  cutOffTime?: string;

  @ApiPropertyOptional({
    description:
      'Number of kitchen working days prior to delivery date for cut-off',
    example: 2,
    minimum: 0,
    maximum: 30,
  })
  @IsOptional()
  @IsInt({ message: 'cutOffWorkingDays must be an integer' })
  @Min(0, { message: 'cutOffWorkingDays cannot be negative' })
  @Max(30, { message: 'cutOffWorkingDays cannot exceed 30 days' })
  cutOffWorkingDays?: number;

  @ApiPropertyOptional({
    description: 'Platform-wide kitchen timezone (valid IANA timezone)',
    example: 'Europe/London',
  })
  @IsOptional()
  @IsString({ message: 'timezone must be a string' })
  @Validate(IsIanaTimezoneConstraint)
  timezone?: string;
}
