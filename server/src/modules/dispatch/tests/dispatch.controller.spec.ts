import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchController } from '../dispatch.controller.js';
import { DriverController } from '../driver.controller.js';
import { DispatchService } from '../dispatch.service.js';
import { DropService } from '../drop.service.js';
import { DispatchStatusService } from '../dispatch-status.service.js';
import { DriverService } from '../driver.service.js';
import { UserRole } from '../../../generated/prisma/enums.js';

describe('Dispatch & Driver Controllers', () => {
  let dispatchController: DispatchController;
  let driverController: DriverController;
  let dispatchServiceMock: any;
  let dropServiceMock: any;
  let statusServiceMock: any;
  let driverServiceMock: any;

  beforeEach(() => {
    dispatchServiceMock = {
      getBoard: vi.fn().mockResolvedValue({ deliveryDate: '2026-10-14', drops: [] }),
      getDropDetail: vi.fn().mockResolvedValue({ id: 'drop-1' }),
    };

    dropServiceMock = {
      assignDriver: vi.fn().mockResolvedValue({ id: 'drop-1', driverId: 'driver-1' }),
    };

    statusServiceMock = {
      markDispatchReady: vi.fn().mockResolvedValue({ id: 'drop-1' }),
      markOrderDispatchReady: vi.fn().mockResolvedValue({ id: 'drop-1' }),
      markOutForDelivery: vi.fn().mockResolvedValue({ id: 'drop-1' }),
      markDelivered: vi.fn().mockResolvedValue({ id: 'drop-1' }),
    };

    driverServiceMock = {
      getTodayDropsForDriver: vi.fn().mockResolvedValue({ date: '2026-10-14', drops: [] }),
      getDriverDropDetail: vi.fn().mockResolvedValue({ id: 'drop-1' }),
      uploadDeliveryPhoto: vi.fn().mockResolvedValue({ photoUrl: 'https://storage/proof.webp' }),
    };

    dispatchController = new DispatchController(
      dispatchServiceMock as unknown as DispatchService,
      dropServiceMock as unknown as DropService,
      statusServiceMock as unknown as DispatchStatusService,
    );

    driverController = new DriverController(
      driverServiceMock as unknown as DriverService,
      statusServiceMock as unknown as DispatchStatusService,
    );
  });

  describe('DispatchController', () => {
    it('delegates getBoard to DispatchService', async () => {
      const result = await dispatchController.getBoard({ deliveryDate: '2026-10-14' });
      expect(result.deliveryDate).toBe('2026-10-14');
      expect(dispatchServiceMock.getBoard).toHaveBeenCalledWith({ deliveryDate: '2026-10-14' });
    });

    it('delegates assignDriver to DropService', async () => {
      const user = { id: 'admin-1', role: UserRole.ADMIN, email: 'admin@kitchen.com', name: 'Admin', isActive: true };
      await dispatchController.assignDriver('drop-1', { driverId: 'driver-1' }, user);
      expect(dropServiceMock.assignDriver).toHaveBeenCalledWith('drop-1', 'driver-1', 'admin-1');
    });

    it('delegates markDropReady to DispatchStatusService', async () => {
      const user = { id: 'disp-1', role: UserRole.DISPATCH, email: 'disp@kitchen.com', name: 'Disp', isActive: true };
      await dispatchController.markDropReady('drop-1', user);
      expect(statusServiceMock.markDispatchReady).toHaveBeenCalledWith('drop-1', 'disp-1');
    });

    it('delegates markOutForDelivery to DispatchStatusService', async () => {
      const user = { id: 'disp-1', role: UserRole.DISPATCH, email: 'disp@kitchen.com', name: 'Disp', isActive: true };
      await dispatchController.markOutForDelivery('drop-1', user);
      expect(statusServiceMock.markOutForDelivery).toHaveBeenCalledWith('drop-1', 'disp-1');
    });
  });

  describe('DriverController', () => {
    it('delegates getTodayDrops to DriverService using authenticated user id', async () => {
      const user = { id: 'driver-1', role: UserRole.DRIVER, email: 'driver@kitchen.com', name: 'Driver', isActive: true };
      await driverController.getTodayDrops(user);
      expect(driverServiceMock.getTodayDropsForDriver).toHaveBeenCalledWith('driver-1');
    });

    it('delegates getDriverDropDetail to DriverService', async () => {
      const user = { id: 'driver-1', role: UserRole.DRIVER, email: 'driver@kitchen.com', name: 'Driver', isActive: true };
      await driverController.getDriverDropDetail('drop-1', user);
      expect(driverServiceMock.getDriverDropDetail).toHaveBeenCalledWith('drop-1', 'driver-1');
    });

    it('delegates markDelivered to DispatchStatusService', async () => {
      const user = { id: 'driver-1', role: UserRole.DRIVER, email: 'driver@kitchen.com', name: 'Driver', isActive: true };
      await driverController.markDelivered('drop-1', { note: 'Left at reception' }, user);
      expect(statusServiceMock.markDelivered).toHaveBeenCalledWith('drop-1', 'driver-1', { note: 'Left at reception' });
    });
  });
});
