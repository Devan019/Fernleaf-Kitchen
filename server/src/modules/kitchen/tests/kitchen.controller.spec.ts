/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { KitchenController } from '../kitchen.controller.js';
import { KitchenBoardService } from '../kitchen-board.service.js';
import { KitchenUnitService } from '../kitchen-unit.service.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import { Permission } from '../../auth/types/permission.enum.js';
import { PERMISSIONS_KEY } from '../../auth/decorators/permissions.decorator.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type.js';

describe('KitchenController', () => {
  let controller: KitchenController;
  let boardServiceMock: any;
  let unitServiceMock: any;
  let reflector: Reflector;

  const adminUser: AuthenticatedUser = {
    id: 'user-admin',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const kitchenUser: AuthenticatedUser = {
    id: 'user-kitchen',
    email: 'kitchen@test.com',
    role: UserRole.KITCHEN,
  };

  beforeEach(() => {
    reflector = new Reflector();

    boardServiceMock = {
      getBoard: vi.fn(),
    };

    unitServiceMock = {
      startUnit: vi.fn(),
      completeUnit: vi.fn(),
      forceCompleteOrder: vi.fn(),
    };

    controller = new KitchenController(
      boardServiceMock as unknown as KitchenBoardService,
      unitServiceMock as unknown as KitchenUnitService,
    );
  });

  describe('GET /kitchen/board', () => {
    it('delegates to boardService.getBoard and enforces KITCHEN_READ permission', async () => {
      boardServiceMock.getBoard.mockResolvedValue({
        deliveryDate: '2026-10-14',
        stations: [],
        totalUnits: 0,
      });

      const result = await controller.getBoard({ deliveryDate: '2026-10-14' });

      expect(boardServiceMock.getBoard).toHaveBeenCalledWith({
        deliveryDate: '2026-10-14',
      });
      expect(result.deliveryDate).toBe('2026-10-14');

      // Verify Permission metadata
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        KitchenController.prototype.getBoard,
      );
      expect(permissions).toContain(Permission.KITCHEN_READ);
    });
  });

  describe('POST /kitchen/units/:unitId/start', () => {
    it('delegates to unitService.startUnit with unitId and current user ID', async () => {
      unitServiceMock.startUnit.mockResolvedValue({
        unitId: 'unit-1',
        status: 'STARTED',
      });

      const result = await controller.startUnit('unit-1', kitchenUser);

      expect(unitServiceMock.startUnit).toHaveBeenCalledWith(
        'unit-1',
        kitchenUser.id,
      );
      expect(result.unitId).toBe('unit-1');

      // Verify Permission metadata
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        KitchenController.prototype.startUnit,
      );
      expect(permissions).toContain(Permission.KITCHEN_UPDATE);
    });
  });

  describe('POST /kitchen/units/:unitId/complete', () => {
    it('delegates to unitService.completeUnit with unitId and current user ID', async () => {
      unitServiceMock.completeUnit.mockResolvedValue({
        unitId: 'unit-1',
        status: 'DONE',
      });

      const result = await controller.completeUnit('unit-1', kitchenUser);

      expect(unitServiceMock.completeUnit).toHaveBeenCalledWith(
        'unit-1',
        kitchenUser.id,
      );
      expect(result.unitId).toBe('unit-1');

      // Verify Permission metadata
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        KitchenController.prototype.completeUnit,
      );
      expect(permissions).toContain(Permission.KITCHEN_UPDATE);
    });
  });

  describe('POST /kitchen/orders/:orderId/force-complete (Requirement 23, 24)', () => {
    it('delegates to unitService.forceCompleteOrder with orderId and current user ID', async () => {
      unitServiceMock.forceCompleteOrder.mockResolvedValue({
        orderId: 'ord-1',
        status: 'CONFIRMED',
      });

      const result = await controller.forceComplete('ord-1', adminUser);

      expect(unitServiceMock.forceCompleteOrder).toHaveBeenCalledWith(
        'ord-1',
        adminUser.id,
      );
      expect(result.orderId).toBe('ord-1');
    });

    it('strictly restricts force-complete to ADMIN role and KITCHEN_FORCE_COMPLETE permission', () => {
      const requiredRoles = reflector.get<UserRole[]>(
        ROLES_KEY,
        KitchenController.prototype.forceComplete,
      );
      expect(requiredRoles).toContain(UserRole.ADMIN);
      expect(requiredRoles).not.toContain(UserRole.KITCHEN);
      expect(requiredRoles).not.toContain(UserRole.DISPATCH);
      expect(requiredRoles).not.toContain(UserRole.DRIVER);

      const requiredPermissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        KitchenController.prototype.forceComplete,
      );
      expect(requiredPermissions).toContain(Permission.KITCHEN_FORCE_COMPLETE);
    });
  });
});
