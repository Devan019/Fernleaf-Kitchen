import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { OrderController } from './order.controller.js';
import { OrderCutoffService } from './services/order-cutoff.service.js';
import { OrderService } from './order.service.js';

describe('OrderController', () => {
  let controller: OrderController;
  let orderServiceMock: any;
  let cutoffServiceMock: any;

  const mockAdminUser: any = {
    id: 'user-admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    orderServiceMock = {
      createOrder: vi.fn(),
      placeOrder: vi.fn(),
      findOrders: vi.fn(),
      findOrderById: vi.fn(),
      updateOrder: vi.fn(),
      updateOrderDelivery: vi.fn(),
      cancelOrder: vi.fn(),
      addOrderLine: vi.fn(),
      updateOrderLine: vi.fn(),
      removeOrderLine: vi.fn(),
    };

    cutoffServiceMock = {
      processCutoffForDate: vi.fn(),
      checkCutoff: vi.fn(),
    };

    controller = new OrderController(
      orderServiceMock as unknown as OrderService,
      cutoffServiceMock as unknown as OrderCutoffService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to orderService.createOrder', async () => {
    const dto: any = { employeeId: 'emp-1' };
    orderServiceMock.createOrder.mockResolvedValue({ id: 'ord-1' });

    const result = await controller.create(dto, mockAdminUser);
    expect(orderServiceMock.createOrder).toHaveBeenCalledWith(
      dto,
      mockAdminUser.id,
      mockAdminUser.role,
    );
    expect(result).toEqual({ id: 'ord-1' });
  });

  it('place delegates to orderService.placeOrder', async () => {
    orderServiceMock.placeOrder.mockResolvedValue({ id: 'ord-1', status: 'PLACED' });

    const result = await controller.place('ord-1', mockAdminUser);
    expect(orderServiceMock.placeOrder).toHaveBeenCalledWith(
      'ord-1',
      mockAdminUser.id,
      mockAdminUser.role,
    );
    expect(result.status).toBe('PLACED');
  });

  it('findOrders delegates to orderService.findOrders', async () => {
    orderServiceMock.findOrders.mockResolvedValue({ data: [], meta: {} as any });

    const query: any = { page: 1, limit: 10 };
    const result = await controller.findOrders(query);
    expect(orderServiceMock.findOrders).toHaveBeenCalledWith(query);
    expect(result.data).toEqual([]);
  });

  it('findOne delegates to orderService.findOrderById', async () => {
    orderServiceMock.findOrderById.mockResolvedValue({ id: 'ord-1' });

    const result = await controller.findOne('ord-1');
    expect(orderServiceMock.findOrderById).toHaveBeenCalledWith('ord-1');
    expect(result.id).toBe('ord-1');
  });

  it('update delegates to orderService.updateOrder', async () => {
    const dto: any = { deliveryTime: '13:00' };
    orderServiceMock.updateOrder.mockResolvedValue({ id: 'ord-1' });

    const result = await controller.update('ord-1', dto, mockAdminUser);
    expect(orderServiceMock.updateOrder).toHaveBeenCalledWith(
      'ord-1',
      dto,
      mockAdminUser.id,
      mockAdminUser.role,
    );
    expect(result.id).toBe('ord-1');
  });

  it('updateDelivery delegates to orderService.updateOrderDelivery', async () => {
    const dto: any = { deliveryTime: '14:00' };
    orderServiceMock.updateOrderDelivery.mockResolvedValue({ id: 'ord-1' });

    const result = await controller.updateDelivery('ord-1', dto, mockAdminUser);
    expect(orderServiceMock.updateOrderDelivery).toHaveBeenCalledWith(
      'ord-1',
      dto,
      mockAdminUser.id,
      mockAdminUser.role,
    );
    expect(result.id).toBe('ord-1');
  });

  it('cancel delegates to orderService.cancelOrder', async () => {
    orderServiceMock.cancelOrder.mockResolvedValue({ id: 'ord-1', status: 'CANCELLED' });

    const result = await controller.cancel('ord-1', { reason: 'Test' }, mockAdminUser);
    expect(orderServiceMock.cancelOrder).toHaveBeenCalledWith(
      'ord-1',
      { reason: 'Test' },
      mockAdminUser.id,
      mockAdminUser.role,
    );
    expect(result.status).toBe('CANCELLED');
  });

  it('processCutoff delegates to cutoffService.processCutoffForDate', async () => {
    cutoffServiceMock.processCutoffForDate.mockResolvedValue({
      deliveryDate: '2026-10-10',
      cancelledDrafts: 1,
      confirmedPlaced: 2,
    });

    const result = await controller.processCutoff(
      { deliveryDate: '2026-10-10' },
      mockAdminUser,
    );
    expect(cutoffServiceMock.processCutoffForDate).toHaveBeenCalledWith(
      '2026-10-10',
      mockAdminUser.id,
    );
    expect(result.cancelledDrafts).toBe(1);
  });

  it('checkCutoff delegates to cutoffService.checkCutoff', async () => {
    cutoffServiceMock.checkCutoff.mockResolvedValue({
      deliveryDate: '2026-10-10',
      isPastCutoff: false,
    });

    const result = await controller.checkCutoff('2026-10-10');
    expect(cutoffServiceMock.checkCutoff).toHaveBeenCalledWith('2026-10-10');
    expect(result.isPastCutoff).toBe(false);
  });
});
