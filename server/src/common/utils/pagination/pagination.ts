export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Calculates skip and take offset parameters for Prisma pagination.
 *
 * @param page - Current 1-indexed page number (default 1)
 * @param limit - Number of records per page (default 20)
 * @returns Offset object containing { skip, take, safePage, safeLimit }
 */
export function calculatePagination(
  page = 1,
  limit = 20,
): { skip: number; take: number; safePage: number; safeLimit: number } {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    safePage,
    safeLimit,
  };
}

/**
 * Builds a standardized paginated response containing data and meta.
 *
 * @param data - Array of entities for the current page
 * @param total - Total count of records across all pages
 * @param page - Current page number
 * @param limit - Current page size
 * @returns Standardized PaginatedResult object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}
