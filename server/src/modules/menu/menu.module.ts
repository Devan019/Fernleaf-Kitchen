import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { PricingIntegrationService } from './pricing/pricing-integration.service.js';

@Module({
  controllers: [MenuController],
  providers: [MenuService, PricingIntegrationService],
  exports: [MenuService, PricingIntegrationService],
})
export class MenuModule {}
