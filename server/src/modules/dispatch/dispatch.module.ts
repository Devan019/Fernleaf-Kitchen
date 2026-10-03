import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { StorageModule } from '../../common/storage/storage.module.js';
import { DispatchController } from './dispatch.controller.js';
import { DriverController } from './driver.controller.js';
import { DispatchService } from './dispatch.service.js';
import { DropService } from './drop.service.js';
import { DriverService } from './driver.service.js';
import { DispatchStatusService } from './dispatch-status.service.js';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [DispatchController, DriverController],
  providers: [
    DispatchService,
    DropService,
    DriverService,
    DispatchStatusService,
  ],
  exports: [
    DispatchService,
    DropService,
    DriverService,
    DispatchStatusService,
  ],
})
export class DispatchModule {}
