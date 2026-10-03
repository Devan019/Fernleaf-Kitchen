import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  KitchenBoardResponse,
  KitchenStationGroup,
  KitchenUnitResponse,
} from './types/kitchen-board.types.js';
import { KitchenBoardQueryDto } from './dto/kitchen-board-query.dto.js';
import { KitchenUnitService } from './kitchen-unit.service.js';
import { DEFAULT_AT_RISK_THRESHOLD_MINUTES } from './utils/kitchen-time.utils.js';
import { SettingsService } from '../settings/settings.service.js';

@Injectable()
export class KitchenBoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitService: KitchenUnitService,
    @Optional() private readonly settingsService?: SettingsService,
  ) {}

  /**
   * Retrieves the dynamic kitchen settings for timezone and at-risk threshold.
   */
  private async getKitchenSettings(): Promise<{
    timeZone: string;
    atRiskThresholdMinutes: number;
  }> {
    if (this.settingsService) {
      const timeZone = await this.settingsService.getKitchenTimezone();
      const atRiskThresholdMinutes =
        await this.settingsService.getAtRiskThresholdMinutes();
      return { timeZone, atRiskThresholdMinutes };
    }

    const settings = await this.prisma.kitchenSetting.findMany({
      where: {
        key: {
          in: ['KITCHEN_TIMEZONE', 'AT_RISK_THRESHOLD_MINUTES'],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));
    const timeZone =
      map.get('KITCHEN_TIMEZONE') || process.env.KITCHEN_TIMEZONE || 'UTC';
    const atRiskThresholdMinutes = map.get('AT_RISK_THRESHOLD_MINUTES')
      ? parseInt(map.get('AT_RISK_THRESHOLD_MINUTES')!, 10)
      : DEFAULT_AT_RISK_THRESHOLD_MINUTES;

    return { timeZone, atRiskThresholdMinutes };
  }

  /**
   * Retrieves the kitchen board for a delivery date, grouped by station.
   * Only CONFIRMED orders are included.
   */
  async getBoard(query: KitchenBoardQueryDto): Promise<KitchenBoardResponse> {
    const dateStr = query.deliveryDate.substring(0, 10);
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    // 1. Ensure units exist for any confirmed orders on this date that might be uninitialized
    const confirmedOrders = await this.prisma.order.findMany({
      where: {
        deliveryDate: targetDate,
        status: OrderStatus.CONFIRMED,
      },
      select: { id: true },
    });

    if (confirmedOrders.length > 0) {
      await this.unitService.ensureUnitsForOrders(
        confirmedOrders.map((o) => o.id),
      );
    }

    const { atRiskThresholdMinutes } = await this.getKitchenSettings();
    const now = new Date();

    // 2. Build Prisma Where clause
    const where: Prisma.KitchenUnitWhereInput = {
      order: {
        deliveryDate: targetDate,
        status: OrderStatus.CONFIRMED,
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.stationId !== undefined) {
      const trimmedStation = query.stationId.trim().toLowerCase();
      if (
        trimmedStation === '' ||
        trimmedStation === 'null' ||
        trimmedStation === 'unassigned'
      ) {
        where.kitchenStationId = null;
      } else {
        where.kitchenStationId = query.stationId;
      }
    }

    // 3. Efficient query loading required relations in one query (no N+1)
    const units = await this.prisma.kitchenUnit.findMany({
      where,
      include: {
        order: {
          include: {
            Company: { select: { id: true, name: true } },
            Employee: { select: { id: true, name: true } },
          },
        },
        orderLine: {
          include: {
            Dish: { select: { id: true, name: true, sku: true } },
          },
        },
        combination: {
          include: {
            OrderCombinationOption: {
              include: {
                Option: { select: { id: true, name: true } },
              },
            },
          },
        },
        kitchenStation: { select: { id: true, name: true } },
        startedByUser: { select: { id: true, name: true } },
        completedByUser: { select: { id: true, name: true } },
      },
      orderBy: [
        { order: { plannedKitchenReadyAt: 'asc' } },
        { order: { orderNumber: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    // 4. Map records to response objects
    const mappedUnits: KitchenUnitResponse[] = units.map((u) =>
      this.unitService.mapToResponse(u, atRiskThresholdMinutes, now),
    );

    // 5. Group by station
    const stationsMap = new Map<string, KitchenStationGroup>();

    // If a specific station was queried, initialize it
    if (query.stationId !== undefined) {
      const trimmed = query.stationId.trim().toLowerCase();
      const isUnassignedQuery =
        trimmed === '' || trimmed === 'null' || trimmed === 'unassigned';

      if (isUnassignedQuery) {
        stationsMap.set('unassigned', {
          id: null,
          name: 'Unassigned',
          unitsCount: 0,
          units: [],
        });
      } else {
        const stationRecord = await this.prisma.kitchenStation.findUnique({
          where: { id: query.stationId },
          select: { id: true, name: true },
        });

        stationsMap.set(query.stationId, {
          id: query.stationId,
          name: stationRecord?.name ?? 'Unknown Station',
          unitsCount: 0,
          units: [],
        });
      }
    } else {
      // Initialize all active kitchen stations so they appear on the board
      const activeStations = await this.prisma.kitchenStation.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      for (const st of activeStations) {
        stationsMap.set(st.id, {
          id: st.id,
          name: st.name,
          unitsCount: 0,
          units: [],
        });
      }

      // Add unassigned category placeholder
      stationsMap.set('unassigned', {
        id: null,
        name: 'Unassigned',
        unitsCount: 0,
        units: [],
      });
    }

    // Place units into groups
    for (const unit of mappedUnits) {
      const key = unit.station.id ?? 'unassigned';
      let group = stationsMap.get(key);

      if (!group) {
        group = {
          id: unit.station.id,
          name: unit.station.name,
          unitsCount: 0,
          units: [],
        };
        stationsMap.set(key, group);
      }

      group.units.push(unit);
      group.unitsCount = group.units.length;
    }

    // Convert map to array. Filter out empty groups if a stationId filter was applied,
    // or preserve all stations if viewing the whole board.
    const stations = Array.from(stationsMap.values());

    return {
      deliveryDate: dateStr,
      stations,
      totalUnits: mappedUnits.length,
    };
  }
}
