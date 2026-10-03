import { describe, expect, it } from 'vitest';
import {
  calculatePagination,
  createPaginatedResponse,
} from './pagination.js';

describe('pagination utility', () => {
  describe('calculatePagination', () => {
    it('calculates skip and take for default arguments', () => {
      const result = calculatePagination();
      expect(result).toEqual({
        skip: 0,
        take: 20,
        safePage: 1,
        safeLimit: 20,
      });
    });

    it('calculates skip and take for page 3 with limit 15', () => {
      const result = calculatePagination(3, 15);
      expect(result).toEqual({
        skip: 30,
        take: 15,
        safePage: 3,
        safeLimit: 15,
      });
    });

    it('clamps negative or zero page and limit to 1', () => {
      const result = calculatePagination(0, -5);
      expect(result).toEqual({
        skip: 0,
        take: 1,
        safePage: 1,
        safeLimit: 1,
      });
    });
  });

  describe('createPaginatedResponse', () => {
    it('constructs correct response and metadata', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const response = createPaginatedResponse(items, 45, 2, 20);

      expect(response).toEqual({
        data: items,
        meta: {
          page: 2,
          limit: 20,
          total: 45,
          totalPages: 3,
        },
      });
    });

    it('handles 0 total items gracefully', () => {
      const response = createPaginatedResponse([], 0, 1, 20);

      expect(response).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it('calculates exact totalPages when total is divisible by limit', () => {
      const response = createPaginatedResponse([], 40, 1, 20);
      expect(response.meta.totalPages).toBe(2);
    });
  });
});
