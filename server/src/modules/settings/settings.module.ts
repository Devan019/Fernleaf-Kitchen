import { Global, Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { KitchenHolidayService } from './kitchen-holiday.service.js';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, KitchenHolidayService],
  exports: [SettingsService, KitchenHolidayService],
})
export class SettingsModule {}
