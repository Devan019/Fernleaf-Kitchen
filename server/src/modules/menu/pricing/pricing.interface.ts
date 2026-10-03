export interface PricingService {
  /**
   * Resolves effective selling prices for dishes for a given employee in batch.
   * Returns a map of dishId -> formatted decimal price string (e.g. '9.50') or null if unpriced.
   *
   * @param employeeId - Target employee ID
   * @param dishIds - Array of dish IDs to price
   */
  getEffectiveDishPrices(
    employeeId: string,
    dishIds: string[],
  ): Promise<Map<string, string | null>>;
}
