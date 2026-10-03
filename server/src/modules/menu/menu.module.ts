import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { PricingModule } from '../pricing/pricing.module.js';

@Module({
  imports: [PricingModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
