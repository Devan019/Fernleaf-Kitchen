import { Injectable } from '@nestjs/common';
import { PricingService } from './pricing.interface.js';

/**
 * Service acting as the clean integration boundary between Menu and Pricing.
 * When the PricingModule is implemented, this service delegates to PricingService.
 * In standalone/test execution, it provides an in-memory configurable pricing registry.
 */
@Injectable()
export class PricingIntegrationService implements PricingService {
  private readonly prices = new Map<string, string | null>();

  /**
   * Register or override a dish price for an employee or globally.
   *
   * @param dishId - Dish ID or SKU
   * @param price - Decimal price string (e.g. '9.50') or null to simulate unpriced dish
   * @param employeeId - Optional employee ID for tier-specific pricing
   */
  setDishPrice(
    dishId: string,
    price: string | null,
    employeeId?: string,
  ): void {
    const key = employeeId ? `${employeeId}:${dishId}` : `dish:${dishId}`;
    this.prices.set(key, price);
  }

  /**
   * Reset all in-memory price overrides (useful for testing).
   */
  clearPrices(): void {
    this.prices.clear();
  }

  /**
   * Batch resolves effective prices for an employee's dishes.
   */
  async getEffectiveDishPrices(
    employeeId: string,
    dishIds: string[],
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();

    for (const dishId of dishIds) {
      const employeeKey = `${employeeId}:${dishId}`;
      const generalKey = `dish:${dishId}`;

      let price: string | null = null;
      if (this.prices.has(employeeKey)) {
        price = this.prices.get(employeeKey) ?? null;
      } else if (this.prices.has(generalKey)) {
        price = this.prices.get(generalKey) ?? null;
      }

      result.set(dishId, price);
    }

    return result;
  }
}
