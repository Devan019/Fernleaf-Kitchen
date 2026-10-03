import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../../../generated/prisma/enums.js';
import { OrderStatusService } from './order-status.service.js';

describe('OrderStatusService', () => {
  const service = new OrderStatusService();

  describe('validateTransition', () => {
    it('allows same status without error', () => {
      expect(() =>
        service.validateTransition(OrderStatus.DRAFT, OrderStatus.DRAFT),
      ).not.toThrow();
    });

    it('allows DRAFT -> PLACED before cut-off', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.DRAFT,
          OrderStatus.PLACED,
          false,
          false,
        ),
      ).not.toThrow();
    });

    it('allows DRAFT -> CANCELLED before cut-off', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.DRAFT,
          OrderStatus.CANCELLED,
          false,
          false,
        ),
      ).not.toThrow();
    });

    it('allows PLACED -> CONFIRMED', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.PLACED,
          OrderStatus.CONFIRMED,
          true,
          true,
        ),
      ).not.toThrow();
    });

    it('allows CONFIRMED -> DELIVERED', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.CONFIRMED,
          OrderStatus.DELIVERED,
          true,
          true,
        ),
      ).not.toThrow();
    });

    it('allows CONFIRMED -> CANCELLED for Admin', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.CONFIRMED,
          OrderStatus.CANCELLED,
          true,
          true,
        ),
      ).not.toThrow();
    });

    it('rejects transitions from DELIVERED (terminal)', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.DELIVERED,
          OrderStatus.DRAFT,
          true,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        service.validateTransition(
          OrderStatus.DELIVERED,
          OrderStatus.PLACED,
          true,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects transitions from CANCELLED (terminal)', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.CANCELLED,
          OrderStatus.PLACED,
          true,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects invalid direct transitions like DRAFT -> CONFIRMED', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.DRAFT,
          OrderStatus.CONFIRMED,
          false,
          false,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects transitions after cut-off for non-admin', () => {
      expect(() =>
        service.validateTransition(
          OrderStatus.DRAFT,
          OrderStatus.PLACED,
          false,
          true, // past cut-off
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('canEditOrder', () => {
    it('allows editing DRAFT or PLACED before cut-off', () => {
      expect(service.canEditOrder(OrderStatus.DRAFT, false, false)).toBe(true);
      expect(service.canEditOrder(OrderStatus.PLACED, false, false)).toBe(true);
    });

    it('disallows editing after cut-off for normal users', () => {
      expect(service.canEditOrder(OrderStatus.DRAFT, false, true)).toBe(false);
      expect(service.canEditOrder(OrderStatus.PLACED, false, true)).toBe(false);
    });

    it('allows editing after cut-off for Admin', () => {
      expect(service.canEditOrder(OrderStatus.PLACED, true, true)).toBe(true);
    });

    it('disallows editing terminal statuses', () => {
      expect(service.canEditOrder(OrderStatus.DELIVERED, true, false)).toBe(
        false,
      );
      expect(service.canEditOrder(OrderStatus.CANCELLED, true, false)).toBe(
        false,
      );
    });
  });

  describe('canCancelOrder', () => {
    it('allows cancelling DRAFT or PLACED before cut-off', () => {
      expect(service.canCancelOrder(OrderStatus.DRAFT, false, false)).toBe(
        true,
      );
      expect(service.canCancelOrder(OrderStatus.PLACED, false, false)).toBe(
        true,
      );
    });

    it('disallows cancelling after cut-off for normal users', () => {
      expect(service.canCancelOrder(OrderStatus.PLACED, false, true)).toBe(
        false,
      );
    });

    it('allows cancelling after cut-off for Admin', () => {
      expect(service.canCancelOrder(OrderStatus.PLACED, true, true)).toBe(true);
    });

    it('disallows cancelling DELIVERED orders even for Admin', () => {
      expect(service.canCancelOrder(OrderStatus.DELIVERED, true, false)).toBe(
        false,
      );
    });
  });
});
