import { Injectable } from '@nestjs/common';
import { KitchenBoardService } from './kitchen-board.service.js';
import { KitchenUnitService } from './kitchen-unit.service.js';
import { KitchenBoardQueryDto } from './dto/kitchen-board-query.dto.js';
import {
  KitchenBoardResponse,
  KitchenUnitResponse,
  OrderKitchenForceCompleteResult,
} from './types/kitchen-board.types.js';

@Injectable()
export class KitchenService {
  constructor(
    private readonly boardService: KitchenBoardService,
    private readonly unitService: KitchenUnitService,
  ) {}

  getBoard(query: KitchenBoardQueryDto): Promise<KitchenBoardResponse> {
    return this.boardService.getBoard(query);
  }

  startUnit(unitId: string, userId: string): Promise<KitchenUnitResponse> {
    return this.unitService.startUnit(unitId, userId);
  }

  completeUnit(unitId: string, userId: string): Promise<KitchenUnitResponse> {
    return this.unitService.completeUnit(unitId, userId);
  }

  forceCompleteOrder(
    orderId: string,
    adminUserId: string,
  ): Promise<OrderKitchenForceCompleteResult> {
    return this.unitService.forceCompleteOrder(orderId, adminUserId);
  }
}
