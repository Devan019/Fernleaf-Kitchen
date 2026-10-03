import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { InvoiceService } from './invoice.service.js';
import { BillingAdjustmentService } from './billing-adjustment.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, InvoiceService, BillingAdjustmentService],
  exports: [BillingService, InvoiceService, BillingAdjustmentService],
})
export class BillingModule {}
