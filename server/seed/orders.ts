import { randomUUID } from 'node:crypto';
import {
  OrderStatus,
  KitchenUnitStatus,
  DeliveryDropStatus,
  FulfillmentStatus,
} from '../src/generated/prisma/enums.js';
import { prisma, Prisma, createDropGroupingKey } from './utils.js';

export async function seedOrders() {
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
  const kitchenUser = await prisma.user.findUnique({ where: { email: 'kitchen@test.com' } });
  const driverUser1 = await prisma.user.findUnique({ where: { email: 'driver@test.com' } });
  const driverUser2 = await prisma.user.findUnique({ where: { email: 'driver2@test.com' } });
  const driverUser3 = await prisma.user.findUnique({ where: { email: 'driver3@test.com' } });
  const driverUser4 = await prisma.user.findUnique({ where: { email: 'driver4@test.com' } });

  const googleComp = await prisma.company.findUnique({
    where: { name: 'Google' },
    include: { deliveryAddresses: true, employees: true },
  });
  const msftComp = await prisma.company.findUnique({
    where: { name: 'Microsoft' },
    include: { deliveryAddresses: true, employees: true },
  });
  const globexComp = await prisma.company.findUnique({
    where: { name: 'Globex Inc' },
    include: { deliveryAddresses: true, employees: true },
  });
  const tcsComp = await prisma.company.findUnique({
    where: { name: 'TCS' },
    include: { deliveryAddresses: true, employees: true },
  });

  const dishes = await prisma.dish.findMany({
    include: {
      optionGroups: {
        include: {
          optionGroupOptions: { include: { option: true } },
          optionGroupPortions: { include: { portionSize: true } },
        },
      },
    },
  });

  const dishMap = new Map(dishes.map((d) => [d.sku, d]));

  const pnrDish = dishMap.get('DISH-PNR-001')!;
  const tofurDish = dishMap.get('DISH-TOFU-001')!;
  const chkDish = dishMap.get('DISH-CHK-001')!;
  const vegDish = dishMap.get('DISH-VEG-001')!;
  const brwDish = dishMap.get('DISH-BRW-001')!;
  const grlDish = dishMap.get('DISH-GRL-001')!;

  const pnrProteinGroup = pnrDish.optionGroups.find((g) => g.name.includes('protein') || g.name.includes('Protein'));
  const pnrRiceGroup = pnrDish.optionGroups.find((g) => g.name.includes('rice') || g.name.includes('Rice'));
  const pnrSideGroup = pnrDish.optionGroups.find((g) => g.name.includes('side') || g.name.includes('Side'));

  const pnrPaneerOpt = pnrProteinGroup?.optionGroupOptions.find((o) => o.option.name === 'Paneer')?.option;
  const pnrTofuOpt = pnrProteinGroup?.optionGroupOptions.find((o) => o.option.name === 'Tofu')?.option;
  const pnrBrownRiceOpt = pnrRiceGroup?.optionGroupOptions.find((o) => o.option.name === 'Brown Rice')?.option;
  const pnrJeeraRiceOpt = pnrRiceGroup?.optionGroupOptions.find((o) => o.option.name === 'Jeera Rice')?.option;
  const pnrRaitaOpt = pnrSideGroup?.optionGroupOptions.find((o) => o.option.name === 'Raita')?.option;
  const pnrMintOpt = pnrSideGroup?.optionGroupOptions.find((o) => o.option.name === 'Mint Chutney')?.option;

  const regularPortion = pnrProteinGroup?.optionGroupPortions.find((p) => p.portionSize.name === 'Regular')?.portionSize;
  const largePortion = pnrProteinGroup?.optionGroupPortions.find((p) => p.portionSize.name === 'Large')?.portionSize;

  const chkProteinGroup = chkDish.optionGroups.find((g) => g.name.includes('portion') || g.name.includes('Portion'));
  const chkRiceGroup = chkDish.optionGroups.find((g) => g.name.includes('rice') || g.name.includes('Rice'));
  const chkChickenOpt = chkProteinGroup?.optionGroupOptions.find((o) => o.option.name === 'Chicken')?.option;
  const chkBrownRiceOpt = chkRiceGroup?.optionGroupOptions.find((o) => o.option.name === 'Brown Rice')?.option;
  const chkJeeraRiceOpt = chkRiceGroup?.optionGroupOptions.find((o) => o.option.name === 'Jeera Rice')?.option;

  // Helper to upsert a full order structure idempotently
  async function upsertOrderStructure(ordDef: {
    orderNumber: string;
    company: any;
    employee: any;
    deliveryDate: string;
    deliveryTime: string;
    status: OrderStatus;
    fulfillmentStatus?: FulfillmentStatus;
    packagingType: string;
    address: any;
    subtotal: string;
    total: string;
    placedAt?: Date | null;
    confirmedAt?: Date | null;
    kitchenStartedAt?: Date | null;
    kitchenReadyAt?: Date | null;
    dispatchReadyAt?: Date | null;
    outForDeliveryAt?: Date | null;
    deliveredAt?: Date | null;
    cancelledAt?: Date | null;
    rejectedAt?: Date | null;
    note?: string | null;
    lines: Array<{
      dish: any;
      unitPrice: string;
      quantity: number;
      lineTotal: string;
      combinations: Array<{
        quantity: number;
        unitPrice: string;
        combinationTotal: string;
        kitchenUnitStatus?: KitchenUnitStatus;
        startedByUserId?: string | null;
        completedByUserId?: string | null;
        startedAt?: Date | null;
        completedAt?: Date | null;
        options: Array<{
          group?: any;
          option: any;
          portion?: any;
          unitPrice: string;
          extraCharge: string;
          finalPrice: string;
        }>;
      }>;
    }>;
  }) {
    const now = new Date();
    const plannedDateStr = ordDef.deliveryDate;
    const plannedKitchenReadyAt = new Date(`${plannedDateStr}T11:00:00.000Z`);
    const plannedDispatchReadyAt = new Date(`${plannedDateStr}T11:15:00.000Z`);

    let order = await prisma.order.findUnique({
      where: { orderNumber: ordDef.orderNumber },
    });

    const orderId = order ? order.id : randomUUID();

    if (!order) {
      order = await prisma.order.create({
        data: {
          id: orderId,
          orderNumber: ordDef.orderNumber,
          employeeId: ordDef.employee.id,
          companyId: ordDef.company.id,
          deliveryDate: new Date(`${ordDef.deliveryDate}T00:00:00.000Z`),
          deliveryTime: ordDef.deliveryTime,
          status: ordDef.status,
          fulfillmentStatus: ordDef.fulfillmentStatus ?? FulfillmentStatus.KITCHEN_PENDING,
          packagingType: ordDef.packagingType,
          deliveryAddressId: ordDef.address ? ordDef.address.id : null,
          deliveryAddressLabel: ordDef.address ? ordDef.address.label : 'HQ',
          deliveryStreet: ordDef.address ? ordDef.address.street : '100 Main St',
          deliveryUnit: ordDef.address ? ordDef.address.unit : null,
          deliveryCity: ordDef.address ? ordDef.address.city : 'City',
          deliveryPostcode: ordDef.address ? ordDef.address.postcode : '00000',
          deliveryInstructions: ordDef.address ? ordDef.address.deliveryInstructions : null,
          subtotal: new Prisma.Decimal(ordDef.subtotal),
          total: new Prisma.Decimal(ordDef.total),
          createdByUserId: adminUser ? adminUser.id : null,
          placedAt: ordDef.placedAt ?? null,
          confirmedAt: ordDef.confirmedAt ?? null,
          kitchenStartedAt: ordDef.kitchenStartedAt ?? null,
          kitchenReadyAt: ordDef.kitchenReadyAt ?? null,
          dispatchReadyAt: ordDef.dispatchReadyAt ?? null,
          outForDeliveryAt: ordDef.outForDeliveryAt ?? null,
          deliveredAt: ordDef.deliveredAt ?? null,
          cancelledAt: ordDef.cancelledAt ?? null,
          rejectedAt: ordDef.rejectedAt ?? null,
          plannedKitchenReadyAt,
          plannedDispatchReadyAt,
          createdAt: now,
          updatedAt: now,
        },
      });
    } else {
      order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: ordDef.status,
          fulfillmentStatus: ordDef.fulfillmentStatus ?? FulfillmentStatus.KITCHEN_PENDING,
          deliveryDate: new Date(`${ordDef.deliveryDate}T00:00:00.000Z`),
          deliveryTime: ordDef.deliveryTime,
          packagingType: ordDef.packagingType,
          deliveryAddressId: ordDef.address ? ordDef.address.id : null,
          deliveryAddressLabel: ordDef.address ? ordDef.address.label : 'HQ',
          deliveryStreet: ordDef.address ? ordDef.address.street : '100 Main St',
          deliveryUnit: ordDef.address ? ordDef.address.unit : null,
          deliveryCity: ordDef.address ? ordDef.address.city : 'City',
          deliveryPostcode: ordDef.address ? ordDef.address.postcode : '00000',
          deliveryInstructions: ordDef.address ? ordDef.address.deliveryInstructions : null,
          subtotal: new Prisma.Decimal(ordDef.subtotal),
          total: new Prisma.Decimal(ordDef.total),
          placedAt: ordDef.placedAt ?? order.placedAt,
          confirmedAt: ordDef.confirmedAt ?? order.confirmedAt,
          kitchenStartedAt: ordDef.kitchenStartedAt ?? order.kitchenStartedAt,
          kitchenReadyAt: ordDef.kitchenReadyAt ?? order.kitchenReadyAt,
          dispatchReadyAt: ordDef.dispatchReadyAt ?? order.dispatchReadyAt,
          outForDeliveryAt: ordDef.outForDeliveryAt ?? order.outForDeliveryAt,
          deliveredAt: ordDef.deliveredAt ?? order.deliveredAt,
          cancelledAt: ordDef.cancelledAt ?? order.cancelledAt,
          rejectedAt: ordDef.rejectedAt ?? order.rejectedAt,
          plannedKitchenReadyAt,
          plannedDispatchReadyAt,
          updatedAt: now,
        },
      });
    }

    const existingLines = await prisma.orderLine.findMany({
      where: { orderId },
      include: { OrderLineCombination: true },
    });

    if (existingLines.length === 0) {
      for (const lineDef of ordDef.lines) {
        const lineId = randomUUID();
        await prisma.orderLine.create({
          data: {
            id: lineId,
            orderId,
            dishId: lineDef.dish.id,
            dishNameSnapshot: lineDef.dish.name,
            dishSkuSnapshot: lineDef.dish.sku,
            unitPrice: new Prisma.Decimal(lineDef.unitPrice),
            quantity: lineDef.quantity,
            lineTotal: new Prisma.Decimal(lineDef.lineTotal),
            createdAt: now,
            updatedAt: now,
          },
        });

        for (const combDef of lineDef.combinations) {
          const combId = randomUUID();
          await prisma.orderLineCombination.create({
            data: {
              id: combId,
              orderLineId: lineId,
              quantity: combDef.quantity,
              unitPrice: new Prisma.Decimal(combDef.unitPrice),
              combinationTotal: new Prisma.Decimal(combDef.combinationTotal),
              createdAt: now,
              updatedAt: now,
            },
          });

          for (const optDef of combDef.options) {
            if (optDef.option) {
              await prisma.orderCombinationOption.create({
                data: {
                  id: randomUUID(),
                  combinationId: combId,
                  optionGroupId: optDef.group?.id ?? null,
                  optionGroupNameSnapshot: optDef.group?.name ?? null,
                  optionId: optDef.option.id,
                  optionNameSnapshot: optDef.option.name,
                  unitPrice: new Prisma.Decimal(optDef.unitPrice),
                  portionSizeId: optDef.portion?.id ?? null,
                  portionSizeNameSnapshot: optDef.portion?.name ?? null,
                  portionExtraCharge: new Prisma.Decimal(optDef.extraCharge),
                  finalPrice: new Prisma.Decimal(optDef.finalPrice),
                  createdAt: now,
                },
              });
            }
          }

          // If order is CONFIRMED, DELIVERED, or in fulfillment, ensure KitchenUnit
          if (
            ordDef.status === OrderStatus.CONFIRMED ||
            ordDef.status === OrderStatus.DELIVERED
          ) {
            const unitStatus = combDef.kitchenUnitStatus ?? (
              ordDef.status === OrderStatus.DELIVERED
                ? KitchenUnitStatus.DONE
                : KitchenUnitStatus.PENDING
            );

            await prisma.kitchenUnit.create({
              data: {
                id: randomUUID(),
                orderId,
                orderLineId: lineId,
                combinationId: combId,
                kitchenStationId: lineDef.dish.kitchenStationId ?? null,
                status: unitStatus,
                quantity: combDef.quantity,
                startedAt: combDef.startedAt ?? (unitStatus !== KitchenUnitStatus.PENDING ? now : null),
                startedByUserId: combDef.startedByUserId ?? (unitStatus !== KitchenUnitStatus.PENDING ? kitchenUser?.id : null),
                completedAt: combDef.completedAt ?? (unitStatus === KitchenUnitStatus.DONE ? now : null),
                completedByUserId: combDef.completedByUserId ?? (unitStatus === KitchenUnitStatus.DONE ? kitchenUser?.id : null),
                createdAt: now,
                updatedAt: now,
              },
            });
          }
        }
      }
    } else {
      // Synchronize kitchen unit statuses on existing orders
      let cIdx = 0;
      const allCombDefs = ordDef.lines.flatMap((l) => l.combinations);
      for (const line of existingLines) {
        for (const comb of line.OrderLineCombination) {
          const combDef = allCombDefs[cIdx];
          if (combDef && combDef.kitchenUnitStatus) {
            await prisma.kitchenUnit.updateMany({
              where: { combinationId: comb.id },
              data: {
                status: combDef.kitchenUnitStatus,
                startedAt: combDef.startedAt ?? (combDef.kitchenUnitStatus !== KitchenUnitStatus.PENDING ? now : null),
                startedByUserId: combDef.startedByUserId ?? (combDef.kitchenUnitStatus !== KitchenUnitStatus.PENDING ? kitchenUser?.id : null),
                completedAt: combDef.completedAt ?? (combDef.kitchenUnitStatus === KitchenUnitStatus.DONE ? now : null),
                completedByUserId: combDef.completedByUserId ?? (combDef.kitchenUnitStatus === KitchenUnitStatus.DONE ? kitchenUser?.id : null),
              },
            });
          }
          cIdx++;
        }
      }
    }

    return order;
  }

  // ==========================================
  // 1. Historical Orders (Sep / Oct 2026)
  // ==========================================
  const googleHqAddr = googleComp?.deliveryAddresses.find((a) => a.isDefault) ?? googleComp?.deliveryAddresses[0];
  const tcsOlympusAddr = tcsComp?.deliveryAddresses[0];
  const msftRedmondAddr = msftComp?.deliveryAddresses[0];
  const globexTowerAddr = globexComp?.deliveryAddresses[0];
  const googleNycAddr = googleComp?.deliveryAddresses.find((a) => !a.isDefault) ?? googleHqAddr;

  if (googleComp && tcsComp && msftComp && globexComp) {
    // SEED-ORD-001 (DRAFT, 2026-10-07)
    await upsertOrderStructure({
      orderNumber: 'SEED-ORD-001',
      company: googleComp,
      employee: googleComp.employees[0],
      deliveryDate: '2026-10-07',
      deliveryTime: '12:30',
      status: OrderStatus.DRAFT,
      packagingType: 'ECO_BOX',
      address: googleHqAddr,
      subtotal: '122.50',
      total: '122.50',
      lines: [
        {
          dish: pnrDish,
          unitPrice: '12.25',
          quantity: 10,
          lineTotal: '122.50',
          combinations: [
            {
              quantity: 6,
              unitPrice: '12.25',
              combinationTotal: '73.50',
              options: [
                { group: pnrProteinGroup, option: pnrPaneerOpt, portion: regularPortion, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                { group: pnrRiceGroup, option: pnrBrownRiceOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
              ],
            },
            {
              quantity: 4,
              unitPrice: '12.25',
              combinationTotal: '49.00',
              options: [
                { group: pnrProteinGroup, option: pnrPaneerOpt, portion: regularPortion, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                { group: pnrRiceGroup, option: pnrJeeraRiceOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
              ],
            },
          ],
        },
      ],
    });

    // SEED-ORD-002 (PLACED, 2026-10-08)
    await upsertOrderStructure({
      orderNumber: 'SEED-ORD-002',
      company: googleComp,
      employee: googleComp.employees[1],
      deliveryDate: '2026-10-08',
      deliveryTime: '13:00',
      status: OrderStatus.PLACED,
      placedAt: new Date('2026-10-03T10:00:00.000Z'),
      packagingType: 'STANDARD',
      address: googleHqAddr,
      subtotal: '107.50',
      total: '107.50',
      lines: [
        {
          dish: chkDish,
          unitPrice: '14.50',
          quantity: 5,
          lineTotal: '72.50',
          combinations: [{ quantity: 5, unitPrice: '14.50', combinationTotal: '72.50', options: [] }],
        },
        {
          dish: brwDish,
          unitPrice: '7.00',
          quantity: 5,
          lineTotal: '35.00',
          combinations: [{ quantity: 5, unitPrice: '7.00', combinationTotal: '35.00', options: [] }],
        },
      ],
    });

    // SEED-ORD-003 (CONFIRMED, 2026-10-05)
    await upsertOrderStructure({
      orderNumber: 'SEED-ORD-003',
      company: tcsComp,
      employee: tcsComp.employees[0],
      deliveryDate: '2026-10-05',
      deliveryTime: '12:00',
      status: OrderStatus.CONFIRMED,
      placedAt: new Date('2026-10-01T11:00:00.000Z'),
      confirmedAt: new Date('2026-10-01T16:00:00.000Z'),
      packagingType: 'ECO_BOX',
      address: tcsOlympusAddr,
      subtotal: '150.00',
      total: '150.00',
      lines: [
        {
          dish: pnrDish,
          unitPrice: '10.00',
          quantity: 15,
          lineTotal: '150.00',
          combinations: [
            {
              quantity: 15,
              unitPrice: '10.00',
              combinationTotal: '150.00',
              kitchenUnitStatus: KitchenUnitStatus.PENDING,
              options: [],
            },
          ],
        },
      ],
    });

    // SEED-ORD-004 (DELIVERED, 2026-09-30)
    await upsertOrderStructure({
      orderNumber: 'SEED-ORD-004',
      company: msftComp,
      employee: msftComp.employees[0],
      deliveryDate: '2026-09-30',
      deliveryTime: '12:30',
      status: OrderStatus.DELIVERED,
      fulfillmentStatus: FulfillmentStatus.DELIVERED,
      placedAt: new Date('2026-09-26T09:00:00.000Z'),
      confirmedAt: new Date('2026-09-26T16:00:00.000Z'),
      deliveredAt: new Date('2026-09-30T12:45:00.000Z'),
      packagingType: 'STANDARD',
      address: msftRedmondAddr,
      subtotal: '92.00',
      total: '92.00',
      lines: [
        {
          dish: chkDish,
          unitPrice: '11.50',
          quantity: 8,
          lineTotal: '92.00',
          combinations: [
            {
              quantity: 8,
              unitPrice: '11.50',
              combinationTotal: '92.00',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              options: [],
            },
          ],
        },
      ],
    });

    // SEED-ORD-005 (CANCELLED, 2026-10-01)
    await upsertOrderStructure({
      orderNumber: 'SEED-ORD-005',
      company: googleComp,
      employee: googleComp.employees[2],
      deliveryDate: '2026-10-01',
      deliveryTime: '12:30',
      status: OrderStatus.CANCELLED,
      placedAt: new Date('2026-09-28T09:00:00.000Z'),
      cancelledAt: new Date('2026-09-29T10:00:00.000Z'),
      packagingType: 'STANDARD',
      address: googleHqAddr,
      subtotal: '73.50',
      total: '73.50',
      lines: [
        {
          dish: pnrDish,
          unitPrice: '12.25',
          quantity: 6,
          lineTotal: '73.50',
          combinations: [{ quantity: 6, unitPrice: '12.25', combinationTotal: '73.50', options: [] }],
        },
      ],
    });

    // SEED-ORD-006 (REJECTED, 2026-09-29)
    await upsertOrderStructure({
      orderNumber: 'SEED-ORD-006',
      company: tcsComp,
      employee: tcsComp.employees[1],
      deliveryDate: '2026-09-29',
      deliveryTime: '12:30',
      status: OrderStatus.REJECTED,
      placedAt: new Date('2026-09-25T14:00:00.000Z'),
      rejectedAt: new Date('2026-09-26T16:00:00.000Z'),
      packagingType: 'ECO_BOX',
      address: tcsOlympusAddr,
      subtotal: '20.00',
      total: '20.00',
      lines: [
        {
          dish: brwDish,
          unitPrice: '5.00',
          quantity: 4,
          lineTotal: '20.00',
          combinations: [{ quantity: 4, unitPrice: '5.00', combinationTotal: '20.00', options: [] }],
        },
      ],
    });

    // ==========================================
    // 2. Today's Test Orders (2026-10-04, Sunday)
    // ==========================================
    const todayStr = '2026-10-04';
    const now = new Date();

    // 2.1 Three DRAFT Orders for Today
    await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-DFT-01',
      company: googleComp,
      employee: googleComp.employees[0], // Rahul
      deliveryDate: todayStr,
      deliveryTime: '12:00',
      status: OrderStatus.DRAFT,
      packagingType: 'ECO_BOX',
      address: googleHqAddr,
      subtotal: '61.25',
      total: '61.25',
      lines: [
        {
          dish: pnrDish,
          unitPrice: '12.25',
          quantity: 5,
          lineTotal: '61.25',
          combinations: [{ quantity: 5, unitPrice: '12.25', combinationTotal: '61.25', options: [] }],
        },
      ],
    });

    await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-DFT-02',
      company: msftComp,
      employee: msftComp.employees[0], // David
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.DRAFT,
      packagingType: 'STANDARD',
      address: msftRedmondAddr,
      subtotal: '46.00',
      total: '46.00',
      lines: [
        {
          dish: chkDish,
          unitPrice: '11.50',
          quantity: 4,
          lineTotal: '46.00',
          combinations: [{ quantity: 4, unitPrice: '11.50', combinationTotal: '46.00', options: [] }],
        },
      ],
    });

    await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-DFT-03',
      company: globexComp,
      employee: globexComp.employees[1], // Emma
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.DRAFT,
      packagingType: 'ECO_BOX',
      address: globexTowerAddr,
      subtotal: '28.50',
      total: '28.50',
      lines: [
        {
          dish: tofurDish,
          unitPrice: '9.50',
          quantity: 3,
          lineTotal: '28.50',
          combinations: [{ quantity: 3, unitPrice: '9.50', combinationTotal: '28.50', options: [] }],
        },
      ],
    });

    // 2.2 Three PLACED Orders for Today
    await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-PLC-01',
      company: googleComp,
      employee: googleComp.employees[1], // Priya
      deliveryDate: todayStr,
      deliveryTime: '12:00',
      status: OrderStatus.PLACED,
      placedAt: new Date(`${todayStr}T08:30:00.000Z`),
      packagingType: 'ECO_BOX',
      address: googleHqAddr,
      subtotal: '114.00',
      total: '114.00',
      lines: [
        {
          dish: chkDish,
          unitPrice: '14.50',
          quantity: 6,
          lineTotal: '87.00',
          combinations: [{ quantity: 6, unitPrice: '14.50', combinationTotal: '87.00', options: [] }],
        },
        {
          dish: brwDish,
          unitPrice: '4.50',
          quantity: 6,
          lineTotal: '27.00',
          combinations: [{ quantity: 6, unitPrice: '4.50', combinationTotal: '27.00', options: [] }],
        },
      ],
    });

    await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-PLC-02',
      company: msftComp,
      employee: msftComp.employees[1], // Sarah
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.PLACED,
      placedAt: new Date(`${todayStr}T08:45:00.000Z`),
      packagingType: 'STANDARD',
      address: msftRedmondAddr,
      subtotal: '80.00',
      total: '80.00',
      lines: [
        {
          dish: pnrDish,
          unitPrice: '10.00',
          quantity: 8,
          lineTotal: '80.00',
          combinations: [{ quantity: 8, unitPrice: '10.00', combinationTotal: '80.00', options: [] }],
        },
      ],
    });

    await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-PLC-03',
      company: globexComp,
      employee: globexComp.employees[2], // Ryan
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.PLACED,
      placedAt: new Date(`${todayStr}T09:00:00.000Z`),
      packagingType: 'ECO_BOX',
      address: globexTowerAddr,
      subtotal: '67.50',
      total: '67.50',
      lines: [
        {
          dish: grlDish,
          unitPrice: '13.50',
          quantity: 5,
          lineTotal: '67.50',
          combinations: [{ quantity: 5, unitPrice: '13.50', combinationTotal: '67.50', options: [] }],
        },
      ],
    });

    // 2.3 Five CONFIRMED Orders for Today (Kitchen Board & Drops)
    // Order 1: Google @ 12:00 (Combo with options -> 2 kitchen prep units: 1 PENDING, 1 STARTED)
    const orderCfm1 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-CFM-01',
      company: googleComp,
      employee: googleComp.employees[0], // Rahul
      deliveryDate: todayStr,
      deliveryTime: '12:00',
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.KITCHEN_PENDING,
      placedAt: new Date(`${todayStr}T07:30:00.000Z`),
      confirmedAt: new Date(`${todayStr}T08:00:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T09:30:00.000Z`),
      packagingType: 'ECO_BOX',
      address: googleHqAddr,
      subtotal: '122.50',
      total: '122.50',
      lines: [
        {
          dish: pnrDish,
          unitPrice: '12.25',
          quantity: 10,
          lineTotal: '122.50',
          combinations: [
            {
              quantity: 6,
              unitPrice: '12.25',
              combinationTotal: '73.50',
              kitchenUnitStatus: KitchenUnitStatus.STARTED,
              startedAt: new Date(`${todayStr}T09:30:00.000Z`),
              startedByUserId: kitchenUser?.id,
              options: [
                { group: pnrProteinGroup, option: pnrPaneerOpt, portion: largePortion, unitPrice: '0.00', extraCharge: '1.50', finalPrice: '1.50' },
                { group: pnrRiceGroup, option: pnrBrownRiceOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                { group: pnrSideGroup, option: pnrRaitaOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
              ],
            },
            {
              quantity: 4,
              unitPrice: '12.25',
              combinationTotal: '49.00',
              kitchenUnitStatus: KitchenUnitStatus.PENDING,
              options: [
                { group: pnrProteinGroup, option: pnrTofuOpt, portion: regularPortion, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                { group: pnrRiceGroup, option: pnrJeeraRiceOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
                { group: pnrSideGroup, option: pnrMintOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
              ],
            },
          ],
        },
      ],
    });

    // Order 2: Google @ 12:00 (Chicken Tikka -> KitchenUnit STARTED) - Shares Drop 1 with CFM-01
    const orderCfm2 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-CFM-02',
      company: googleComp,
      employee: googleComp.employees[2], // Amit
      deliveryDate: todayStr,
      deliveryTime: '12:00',
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.KITCHEN_PENDING,
      placedAt: new Date(`${todayStr}T07:45:00.000Z`),
      confirmedAt: new Date(`${todayStr}T08:00:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T09:40:00.000Z`),
      packagingType: 'ECO_BOX',
      address: googleHqAddr,
      subtotal: '116.00',
      total: '116.00',
      lines: [
        {
          dish: chkDish,
          unitPrice: '14.50',
          quantity: 8,
          lineTotal: '116.00',
          combinations: [
            {
              quantity: 8,
              unitPrice: '14.50',
              combinationTotal: '116.00',
              kitchenUnitStatus: KitchenUnitStatus.STARTED,
              startedAt: new Date(`${todayStr}T09:40:00.000Z`),
              startedByUserId: kitchenUser?.id,
              options: [
                { group: chkProteinGroup, option: chkChickenOpt, portion: largePortion, unitPrice: '0.00', extraCharge: '2.00', finalPrice: '2.00' },
                { group: chkRiceGroup, option: chkBrownRiceOpt, portion: null, unitPrice: '0.00', extraCharge: '0.00', finalPrice: '0.00' },
              ],
            },
          ],
        },
      ],
    });

    // Order 3: Google @ 13:00 (Tofu Bowl + Brownie -> KitchenUnit DONE) - Drop 2 (Kitchen Ready)
    const orderCfm3 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-CFM-03',
      company: googleComp,
      employee: googleComp.employees[3], // Neha
      deliveryDate: todayStr,
      deliveryTime: '13:00',
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.KITCHEN_READY,
      placedAt: new Date(`${todayStr}T08:00:00.000Z`),
      confirmedAt: new Date(`${todayStr}T08:30:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T09:15:00.000Z`),
      kitchenReadyAt: new Date(`${todayStr}T10:30:00.000Z`),
      packagingType: 'ECO_BOX',
      address: googleHqAddr,
      subtotal: '70.00',
      total: '70.00',
      lines: [
        {
          dish: tofurDish,
          unitPrice: '9.50',
          quantity: 5,
          lineTotal: '47.50',
          combinations: [
            {
              quantity: 5,
              unitPrice: '9.50',
              combinationTotal: '47.50',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T09:15:00.000Z`),
              startedByUserId: kitchenUser?.id,
              completedAt: new Date(`${todayStr}T10:30:00.000Z`),
              completedByUserId: kitchenUser?.id,
              options: [],
            },
          ],
        },
        {
          dish: brwDish,
          unitPrice: '4.50',
          quantity: 5,
          lineTotal: '22.50',
          combinations: [
            {
              quantity: 5,
              unitPrice: '4.50',
              combinationTotal: '22.50',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T09:15:00.000Z`),
              startedByUserId: kitchenUser?.id,
              completedAt: new Date(`${todayStr}T10:30:00.000Z`),
              completedByUserId: kitchenUser?.id,
              options: [],
            },
          ],
        },
      ],
    });

    // Order 4: Microsoft @ 12:30 (Grilled Salmon -> KitchenUnit STARTED) - Drop 3
    const orderCfm4 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-CFM-04',
      company: msftComp,
      employee: msftComp.employees[0], // David
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.KITCHEN_PENDING,
      placedAt: new Date(`${todayStr}T08:00:00.000Z`),
      confirmedAt: new Date(`${todayStr}T08:30:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T09:45:00.000Z`),
      packagingType: 'STANDARD',
      address: msftRedmondAddr,
      subtotal: '81.00',
      total: '81.00',
      lines: [
        {
          dish: grlDish,
          unitPrice: '13.50',
          quantity: 6,
          lineTotal: '81.00',
          combinations: [
            {
              quantity: 6,
              unitPrice: '13.50',
              combinationTotal: '81.00',
              kitchenUnitStatus: KitchenUnitStatus.STARTED,
              startedAt: new Date(`${todayStr}T09:45:00.000Z`),
              startedByUserId: kitchenUser?.id,
              options: [],
            },
          ],
        },
      ],
    });

    // Order 5: Microsoft @ 12:30 (Paneer + Brownie -> KitchenUnit DONE) - Drop 3
    const orderCfm5 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-CFM-05',
      company: msftComp,
      employee: msftComp.employees[2], // John
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.KITCHEN_READY,
      placedAt: new Date(`${todayStr}T08:00:00.000Z`),
      confirmedAt: new Date(`${todayStr}T08:30:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T09:15:00.000Z`),
      kitchenReadyAt: new Date(`${todayStr}T10:30:00.000Z`),
      packagingType: 'STANDARD',
      address: msftRedmondAddr,
      subtotal: '78.00',
      total: '78.00',
      lines: [
        {
          dish: pnrDish,
          unitPrice: '10.00',
          quantity: 6,
          lineTotal: '60.00',
          combinations: [
            {
              quantity: 6,
              unitPrice: '10.00',
              combinationTotal: '60.00',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T09:15:00.000Z`),
              startedByUserId: kitchenUser?.id,
              completedAt: new Date(`${todayStr}T10:30:00.000Z`),
              completedByUserId: kitchenUser?.id,
              options: [],
            },
          ],
        },
        {
          dish: brwDish,
          unitPrice: '4.50',
          quantity: 4,
          lineTotal: '18.00',
          combinations: [
            {
              quantity: 4,
              unitPrice: '4.50',
              combinationTotal: '18.00',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T09:15:00.000Z`),
              startedByUserId: kitchenUser?.id,
              completedAt: new Date(`${todayStr}T10:30:00.000Z`),
              completedByUserId: kitchenUser?.id,
              options: [],
            },
          ],
        },
      ],
    });

    // 2.4 Two Orders Progressing Through Dispatch
    // Order DSP-1: Microsoft @ 12:30 -> DISPATCH_READY (Drop 3)
    const orderDsp1 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-DSP-01',
      company: msftComp,
      employee: msftComp.employees[3], // Lisa
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.DISPATCH_READY,
      placedAt: new Date(`${todayStr}T07:00:00.000Z`),
      confirmedAt: new Date(`${todayStr}T08:00:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T09:00:00.000Z`),
      kitchenReadyAt: new Date(`${todayStr}T10:15:00.000Z`),
      dispatchReadyAt: new Date(`${todayStr}T10:45:00.000Z`),
      packagingType: 'STANDARD',
      address: msftRedmondAddr,
      subtotal: '160.00',
      total: '160.00',
      lines: [
        {
          dish: chkDish,
          unitPrice: '11.50',
          quantity: 10,
          lineTotal: '115.00',
          combinations: [
            {
              quantity: 10,
              unitPrice: '11.50',
              combinationTotal: '115.00',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T09:00:00.000Z`),
              completedAt: new Date(`${todayStr}T10:15:00.000Z`),
              options: [],
            },
          ],
        },
        {
          dish: brwDish,
          unitPrice: '4.50',
          quantity: 10,
          lineTotal: '45.00',
          combinations: [
            {
              quantity: 10,
              unitPrice: '4.50',
              combinationTotal: '45.00',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T09:00:00.000Z`),
              completedAt: new Date(`${todayStr}T10:15:00.000Z`),
              options: [],
            },
          ],
        },
      ],
    });

    // Order DSP-2: Globex Inc @ 12:30 -> OUT_FOR_DELIVERY (Drop 4)
    const orderDsp2 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-DSP-02',
      company: globexComp,
      employee: globexComp.employees[0], // Bob
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.OUT_FOR_DELIVERY,
      placedAt: new Date(`${todayStr}T07:00:00.000Z`),
      confirmedAt: new Date(`${todayStr}T07:30:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T08:30:00.000Z`),
      kitchenReadyAt: new Date(`${todayStr}T09:45:00.000Z`),
      dispatchReadyAt: new Date(`${todayStr}T10:15:00.000Z`),
      outForDeliveryAt: new Date(`${todayStr}T11:00:00.000Z`),
      packagingType: 'ECO_BOX',
      address: globexTowerAddr,
      subtotal: '76.00',
      total: '76.00',
      lines: [
        {
          dish: tofurDish,
          unitPrice: '9.50',
          quantity: 8,
          lineTotal: '76.00',
          combinations: [
            {
              quantity: 8,
              unitPrice: '9.50',
              combinationTotal: '76.00',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T08:30:00.000Z`),
              completedAt: new Date(`${todayStr}T09:45:00.000Z`),
              options: [],
            },
          ],
        },
      ],
    });

    // 2.5 Two DELIVERED Orders for Today
    // Order DLV-1: Globex Inc @ 12:30 -> DELIVERED (Drop 4)
    const orderDlv1 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-DLV-01',
      company: globexComp,
      employee: globexComp.employees[1], // Emma
      deliveryDate: todayStr,
      deliveryTime: '12:30',
      status: OrderStatus.DELIVERED,
      fulfillmentStatus: FulfillmentStatus.DELIVERED,
      placedAt: new Date(`${todayStr}T06:30:00.000Z`),
      confirmedAt: new Date(`${todayStr}T07:00:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T08:00:00.000Z`),
      kitchenReadyAt: new Date(`${todayStr}T09:15:00.000Z`),
      dispatchReadyAt: new Date(`${todayStr}T09:45:00.000Z`),
      outForDeliveryAt: new Date(`${todayStr}T10:30:00.000Z`),
      deliveredAt: new Date(`${todayStr}T12:15:00.000Z`),
      packagingType: 'ECO_BOX',
      address: globexTowerAddr,
      subtotal: '72.50',
      total: '72.50',
      lines: [
        {
          dish: pnrDish,
          unitPrice: '10.00',
          quantity: 5,
          lineTotal: '50.00',
          combinations: [
            {
              quantity: 5,
              unitPrice: '10.00',
              combinationTotal: '50.00',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T08:00:00.000Z`),
              completedAt: new Date(`${todayStr}T09:15:00.000Z`),
              options: [],
            },
          ],
        },
        {
          dish: brwDish,
          unitPrice: '4.50',
          quantity: 5,
          lineTotal: '22.50',
          combinations: [
            {
              quantity: 5,
              unitPrice: '4.50',
              combinationTotal: '22.50',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T08:00:00.000Z`),
              completedAt: new Date(`${todayStr}T09:15:00.000Z`),
              options: [],
            },
          ],
        },
      ],
    });

    // Order DLV-2: Google NYC Office @ 13:30 -> DELIVERED (Drop 5)
    const orderDlv2 = await upsertOrderStructure({
      orderNumber: 'TEST-TODAY-DLV-02',
      company: googleComp,
      employee: googleComp.employees[4], // Rohan
      deliveryDate: todayStr,
      deliveryTime: '13:30',
      status: OrderStatus.DELIVERED,
      fulfillmentStatus: FulfillmentStatus.DELIVERED,
      placedAt: new Date(`${todayStr}T07:00:00.000Z`),
      confirmedAt: new Date(`${todayStr}T07:30:00.000Z`),
      kitchenStartedAt: new Date(`${todayStr}T08:30:00.000Z`),
      kitchenReadyAt: new Date(`${todayStr}T09:45:00.000Z`),
      dispatchReadyAt: new Date(`${todayStr}T10:30:00.000Z`),
      outForDeliveryAt: new Date(`${todayStr}T11:15:00.000Z`),
      deliveredAt: new Date(`${todayStr}T13:20:00.000Z`),
      packagingType: 'STANDARD',
      address: googleNycAddr,
      subtotal: '54.00',
      total: '54.00',
      lines: [
        {
          dish: grlDish,
          unitPrice: '13.50',
          quantity: 4,
          lineTotal: '54.00',
          combinations: [
            {
              quantity: 4,
              unitPrice: '13.50',
              combinationTotal: '54.00',
              kitchenUnitStatus: KitchenUnitStatus.DONE,
              startedAt: new Date(`${todayStr}T08:30:00.000Z`),
              completedAt: new Date(`${todayStr}T09:45:00.000Z`),
              options: [],
            },
          ],
        },
      ],
    });

    // ==========================================
    // 3. Today's Delivery Drops Reconciliation
    // ==========================================
    // Drop 1: Google HQ @ 12:00 (Orders CFM-01, CFM-02) -> Driver: driver@test.com
    const drop1Key = createDropGroupingKey(googleComp.id, todayStr, '12:00', {
      street: googleHqAddr.street,
      unit: googleHqAddr.unit,
      city: googleHqAddr.city,
      postcode: googleHqAddr.postcode,
    });
    const drop1 = await prisma.deliveryDrop.upsert({
      where: { groupingKey: drop1Key },
      update: {
        status: DeliveryDropStatus.KITCHEN_READY,
        driverId: driverUser1?.id,
      },
      create: {
        id: randomUUID(),
        companyId: googleComp.id,
        deliveryDate: new Date(`${todayStr}T00:00:00.000Z`),
        deliveryTime: '12:00',
        groupingKey: drop1Key,
        deliveryStreet: googleHqAddr.street,
        deliveryUnit: googleHqAddr.unit,
        deliveryCity: googleHqAddr.city,
        deliveryPostcode: googleHqAddr.postcode,
        deliveryInstructions: googleHqAddr.deliveryInstructions,
        status: DeliveryDropStatus.KITCHEN_READY,
        driverId: driverUser1?.id,
      },
    });
    await prisma.order.updateMany({
      where: { id: { in: [orderCfm1.id, orderCfm2.id] } },
      data: { dropId: drop1.id },
    });

    // Drop 2: Google HQ @ 13:00 (Order CFM-03) -> Driver: driver@test.com
    const drop2Key = createDropGroupingKey(googleComp.id, todayStr, '13:00', {
      street: googleHqAddr.street,
      unit: googleHqAddr.unit,
      city: googleHqAddr.city,
      postcode: googleHqAddr.postcode,
    });
    const drop2 = await prisma.deliveryDrop.upsert({
      where: { groupingKey: drop2Key },
      update: {
        status: DeliveryDropStatus.KITCHEN_READY,
        driverId: driverUser1?.id,
      },
      create: {
        id: randomUUID(),
        companyId: googleComp.id,
        deliveryDate: new Date(`${todayStr}T00:00:00.000Z`),
        deliveryTime: '13:00',
        groupingKey: drop2Key,
        deliveryStreet: googleHqAddr.street,
        deliveryUnit: googleHqAddr.unit,
        deliveryCity: googleHqAddr.city,
        deliveryPostcode: googleHqAddr.postcode,
        deliveryInstructions: googleHqAddr.deliveryInstructions,
        status: DeliveryDropStatus.KITCHEN_READY,
        driverId: driverUser1?.id,
      },
    });
    await prisma.order.updateMany({
      where: { id: orderCfm3.id },
      data: { dropId: drop2.id },
    });

    // Drop 3: Microsoft Redmond @ 12:30 (Orders CFM-04, CFM-05, DSP-01) -> Driver: driver2@test.com
    const drop3Key = createDropGroupingKey(msftComp.id, todayStr, '12:30', {
      street: msftRedmondAddr.street,
      unit: msftRedmondAddr.unit,
      city: msftRedmondAddr.city,
      postcode: msftRedmondAddr.postcode,
    });
    const drop3 = await prisma.deliveryDrop.upsert({
      where: { groupingKey: drop3Key },
      update: {
        status: DeliveryDropStatus.DISPATCH_READY,
        driverId: driverUser2?.id,
        dispatchReadyAt: new Date(`${todayStr}T10:45:00.000Z`),
      },
      create: {
        id: randomUUID(),
        companyId: msftComp.id,
        deliveryDate: new Date(`${todayStr}T00:00:00.000Z`),
        deliveryTime: '12:30',
        groupingKey: drop3Key,
        deliveryStreet: msftRedmondAddr.street,
        deliveryUnit: msftRedmondAddr.unit,
        deliveryCity: msftRedmondAddr.city,
        deliveryPostcode: msftRedmondAddr.postcode,
        deliveryInstructions: msftRedmondAddr.deliveryInstructions,
        status: DeliveryDropStatus.DISPATCH_READY,
        driverId: driverUser2?.id,
        dispatchReadyAt: new Date(`${todayStr}T10:45:00.000Z`),
      },
    });
    await prisma.order.updateMany({
      where: { id: { in: [orderCfm4.id, orderCfm5.id, orderDsp1.id] } },
      data: { dropId: drop3.id },
    });

    // Drop 4: Globex Tower @ 12:30 (Orders DSP-02, DLV-01) -> Driver: driver3@test.com
    const drop4Key = createDropGroupingKey(globexComp.id, todayStr, '12:30', {
      street: globexTowerAddr.street,
      unit: globexTowerAddr.unit,
      city: globexTowerAddr.city,
      postcode: globexTowerAddr.postcode,
    });
    const drop4 = await prisma.deliveryDrop.upsert({
      where: { groupingKey: drop4Key },
      update: {
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        driverId: driverUser3?.id,
        dispatchReadyAt: new Date(`${todayStr}T10:15:00.000Z`),
        outForDeliveryAt: new Date(`${todayStr}T11:00:00.000Z`),
      },
      create: {
        id: randomUUID(),
        companyId: globexComp.id,
        deliveryDate: new Date(`${todayStr}T00:00:00.000Z`),
        deliveryTime: '12:30',
        groupingKey: drop4Key,
        deliveryStreet: globexTowerAddr.street,
        deliveryUnit: globexTowerAddr.unit,
        deliveryCity: globexTowerAddr.city,
        deliveryPostcode: globexTowerAddr.postcode,
        deliveryInstructions: globexTowerAddr.deliveryInstructions,
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        driverId: driverUser3?.id,
        dispatchReadyAt: new Date(`${todayStr}T10:15:00.000Z`),
        outForDeliveryAt: new Date(`${todayStr}T11:00:00.000Z`),
      },
    });
    await prisma.order.updateMany({
      where: { id: { in: [orderDsp2.id, orderDlv1.id] } },
      data: { dropId: drop4.id },
    });

    // Drop 5: Google NYC Office @ 13:30 (Order DLV-02) -> Driver: driver4@test.com
    const drop5Key = createDropGroupingKey(googleComp.id, todayStr, '13:30', {
      street: googleNycAddr.street,
      unit: googleNycAddr.unit,
      city: googleNycAddr.city,
      postcode: googleNycAddr.postcode,
    });
    const drop5 = await prisma.deliveryDrop.upsert({
      where: { groupingKey: drop5Key },
      update: {
        status: DeliveryDropStatus.DELIVERED,
        driverId: driverUser4?.id,
        dispatchReadyAt: new Date(`${todayStr}T10:30:00.000Z`),
        outForDeliveryAt: new Date(`${todayStr}T11:15:00.000Z`),
        deliveredAt: new Date(`${todayStr}T13:20:00.000Z`),
        deliveredNote: 'Delivered to 4th floor loading bay security',
        isOnTime: true,
      },
      create: {
        id: randomUUID(),
        companyId: googleComp.id,
        deliveryDate: new Date(`${todayStr}T00:00:00.000Z`),
        deliveryTime: '13:30',
        groupingKey: drop5Key,
        deliveryStreet: googleNycAddr.street,
        deliveryUnit: googleNycAddr.unit,
        deliveryCity: googleNycAddr.city,
        deliveryPostcode: googleNycAddr.postcode,
        deliveryInstructions: googleNycAddr.deliveryInstructions,
        status: DeliveryDropStatus.DELIVERED,
        driverId: driverUser4?.id,
        dispatchReadyAt: new Date(`${todayStr}T10:30:00.000Z`),
        outForDeliveryAt: new Date(`${todayStr}T11:15:00.000Z`),
        deliveredAt: new Date(`${todayStr}T13:20:00.000Z`),
        deliveredNote: 'Delivered to 4th floor loading bay security',
        isOnTime: true,
      },
    });
    await prisma.order.updateMany({
      where: { id: orderDlv2.id },
      data: { dropId: drop5.id },
    });
  }

  const todayCount = await prisma.order.count({
    where: { deliveryDate: new Date('2026-10-04T00:00:00.000Z') },
  });

  return { todayCount };
}
