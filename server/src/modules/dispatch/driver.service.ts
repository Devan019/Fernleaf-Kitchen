import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { StorageService } from '../../common/storage/storage.service.js';
import { DeliveryDropStatus } from '../../generated/prisma/enums.js';
import { DispatchStatusService } from './dispatch-status.service.js';
import { DropService } from './drop.service.js';
import {
  DriverDropCardItem,
  DriverDropDetailResponse,
  DriverTodayDropsResponse,
} from './types/dispatch.types.js';
import { getTodayDateString } from './utils/drop-grouping.utils.js';

const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dropService: DropService,
    private readonly statusService: DispatchStatusService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Driver views their own assigned drops for today.
   *
   * Business Rules (Section 19, 25):
   * - Driver sees ONLY their own assigned drops (driverId === authenticatedUser.id).
   * - Today is calculated in the application business timezone.
   * - Ordered by deliveryTime ascending.
   * - Response is lightweight and optimized for mobile screens.
   */
  async getTodayDropsForDriver(
    driverUserId: string,
  ): Promise<DriverTodayDropsResponse> {
    const timezone = await this.statusService.getBusinessTimezone();
    const todayStr = getTodayDateString(timezone);
    const targetDate = new Date(`${todayStr}T00:00:00.000Z`);

    // 1. Reconcile any newly confirmed orders for today
    await this.dropService.reconcileDropsForDate(targetDate);

    // 2. Fetch drops assigned exclusively to this driver for today
    const drops = await this.prisma.deliveryDrop.findMany({
      where: {
        deliveryDate: targetDate,
        driverId: driverUserId,
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
        orders: {
          select: { id: true },
        },
      },
      orderBy: {
        deliveryTime: 'asc',
      },
    });

    const dropCards: DriverDropCardItem[] = drops.map((drop) => ({
      id: drop.id,
      deliveryTime: drop.deliveryTime,
      company: {
        id: drop.company.id,
        name: drop.company.name,
      },
      address: {
        street: drop.deliveryStreet,
        unit: drop.deliveryUnit,
        city: drop.deliveryCity,
        postcode: drop.deliveryPostcode,
        deliveryInstructions: drop.deliveryInstructions,
      },
      ordersCount: drop.orders.length,
      status: drop.status,
      isOnTime: drop.isOnTime,
      canDeliver: drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY,
    }));

    return {
      date: todayStr,
      drops: dropCards,
    };
  }

  /**
   * Driver views detailed operational information for a specific drop.
   *
   * Business Rules (Section 20, 25):
   * - Driver isolation enforced: drop.driverId === authenticatedUser.id.
   * - Throws 403 Forbidden if assigned to a different driver.
   * - Returns operational details without sensitive administrative data.
   */
  async getDriverDropDetail(
    dropId: string,
    driverUserId: string,
  ): Promise<DriverDropDetailResponse> {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            standingDriverInstructions: true,
          },
        },
        orders: {
          include: {
            Employee: { select: { name: true } },
            OrderLine: { select: { quantity: true } },
          },
        },
      },
    });

    if (!drop) {
      throw new NotFoundException(`Delivery drop with ID '${dropId}' not found`);
    }

    // Driver isolation
    if (drop.driverId !== driverUserId) {
      throw new ForbiddenException(
        'You are not authorized to view this delivery drop: assigned to another driver',
      );
    }

    const dateStr =
      drop.deliveryDate instanceof Date
        ? drop.deliveryDate.toISOString().substring(0, 10)
        : String(drop.deliveryDate).substring(0, 10);

    return {
      id: drop.id,
      deliveryDate: dateStr,
      deliveryTime: drop.deliveryTime,
      status: drop.status,
      company: {
        id: drop.company.id,
        name: drop.company.name,
        standingDriverInstructions: drop.company.standingDriverInstructions,
      },
      address: {
        street: drop.deliveryStreet,
        unit: drop.deliveryUnit,
        city: drop.deliveryCity,
        postcode: drop.deliveryPostcode,
        deliveryInstructions: drop.deliveryInstructions,
      },
      ordersCount: drop.orders.length,
      orders: drop.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        employeeName: o.Employee?.name ?? '',
        packagingType: o.packagingType,
        deliveryInstructions: o.deliveryInstructions,
        itemsCount: o.OrderLine.reduce((sum, line) => sum + line.quantity, 0),
      })),
      isOnTime: drop.isOnTime,
      dispatchReadyAt: drop.dispatchReadyAt,
      outForDeliveryAt: drop.outForDeliveryAt,
      deliveredAt: drop.deliveredAt,
      deliveredNote: drop.deliveredNote,
      deliveredPhotoUrl: drop.deliveredPhotoUrl,
      canDeliver: drop.status === DeliveryDropStatus.OUT_FOR_DELIVERY,
    };
  }

  /**
   * Uploads an optional delivery proof photo via S3-compatible StorageService.
   *
   * Business Rules (Section 18, 25):
   * - Driver isolation enforced: drop.driverId === authenticatedUser.id.
   * - Validates MIME type (JPEG, PNG, WebP) and size (max 5MB).
   */
  async uploadDeliveryPhoto(
    dropId: string,
    driverUserId: string,
    file?: Express.Multer.File,
  ): Promise<{ photoUrl: string }> {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
    });

    if (!drop) {
      throw new NotFoundException(`Delivery drop with ID '${dropId}' not found`);
    }

    if (drop.driverId !== driverUserId) {
      throw new ForbiddenException(
        'You are not authorized to upload photos for this delivery drop: assigned to another driver',
      );
    }

    if (!file) {
      throw new BadRequestException('Delivery photo file is required');
    }

    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Allowed types: ${ALLOWED_PHOTO_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${MAX_PHOTO_SIZE / (1024 * 1024)}MB`,
      );
    }

    const ext = file.mimetype.split('/')[1] || 'webp';
    const key = `delivery/drops/${dropId}/${randomUUID()}.${ext}`;

    const uploadResult = await this.storageService.upload(
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      },
      key,
    );

    return { photoUrl: uploadResult.url };
  }
}
