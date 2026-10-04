import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  total: number;
  limit: number;
}

export function Pagination({
  page,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  total,
  limit,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span> users
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors",
            hasPreviousPage
              ? "border-slate-300 text-slate-600 hover:bg-slate-50"
              : "border-slate-100 text-slate-300 cursor-not-allowed",
          )}
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs text-slate-600 px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          aria-label="Next page"
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors",
            hasNextPage
              ? "border-slate-300 text-slate-600 hover:bg-slate-50"
              : "border-slate-100 text-slate-300 cursor-not-allowed",
          )}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
