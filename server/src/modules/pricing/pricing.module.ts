import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { PricingController } from './pricing.controller.js';
import { PricingService } from './pricing.service.js';
import { PriceResolutionService } from './price-resolution.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PricingController],
  providers: [PricingService, PriceResolutionService],
  exports: [PricingService, PriceResolutionService],
})
export class PricingModule {}
