import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { KitchenController } from './kitchen.controller.js';
import { KitchenService } from './kitchen.service.js';
import { KitchenBoardService } from './kitchen-board.service.js';
import { KitchenUnitService } from './kitchen-unit.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [KitchenController],
  providers: [KitchenService, KitchenBoardService, KitchenUnitService],
  exports: [KitchenService, KitchenBoardService, KitchenUnitService],
})
export class KitchenModule {}
