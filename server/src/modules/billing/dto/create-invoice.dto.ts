import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'List of confirmed order IDs to group into this invoice',
    example: ['order-id-1', 'order-id-2'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one order must be selected to create an invoice' })
  @ArrayUnique({ message: 'Duplicate order IDs are not allowed' })
  @IsString({ each: true, message: 'Each order ID must be a string' })
  orderIds!: string[];
}
