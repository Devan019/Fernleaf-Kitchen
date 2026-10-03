import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { StorageModule } from './common/storage/storage.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogueModule } from './modules/catalogue/catalogue.module.js';
import { MenuModule } from './modules/menu/menu.module.js';
import { PricingModule } from './modules/pricing/pricing.module.js';
import { CompaniesModule } from './modules/company/company.module.js';
import { EmployeesModule } from './modules/employee/employee.module.js';
import { OrderModule } from './modules/order/order.module.js';
import { KitchenModule } from './modules/kitchen/kitchen.module.js';
import { DispatchModule } from './modules/dispatch/dispatch.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    StorageModule,
    UserModule,
    AuthModule,
    CatalogueModule,
    MenuModule,
    PricingModule,
    CompaniesModule,
    EmployeesModule,
    OrderModule,
    KitchenModule,
    DispatchModule,
    BillingModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
