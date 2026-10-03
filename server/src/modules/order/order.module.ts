import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { MenuModule } from '../menu/menu.module.js';
import { CompaniesModule } from '../company/company.module.js';
import { EmployeesModule } from '../employee/employee.module.js';
import { KitchenModule } from '../kitchen/kitchen.module.js';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { OrderCutoffService } from './services/order-cutoff.service.js';
import { OrderPricingService } from './services/order-pricing.service.js';
import { OrderStatusService } from './services/order-status.service.js';
import { OrderValidationService } from './services/order-validation.service.js';

@Module({
  imports: [
    PrismaModule,
    PricingModule,
    MenuModule,
    CompaniesModule,
    EmployeesModule,
    KitchenModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderCutoffService,
    OrderPricingService,
    OrderStatusService,
    OrderValidationService,
  ],
  exports: [OrderService, OrderCutoffService],
})
export class OrderModule {}
