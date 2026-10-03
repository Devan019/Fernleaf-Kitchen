import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BulkImportEmployeesDto {
  @ApiPropertyOptional({
    description:
      'CSV content as text string (can also be uploaded via multipart/form-data with file field)',
    example:
      'name,email,canChooseDeliveryAddress,canChangeDeliveryTime,canChangePackaging\nRahul,rahul@google.com,true,false,true\nPriya,priya@google.com,false,false,false',
  })
  @IsOptional()
  @IsString()
  csvContent?: string;
}
