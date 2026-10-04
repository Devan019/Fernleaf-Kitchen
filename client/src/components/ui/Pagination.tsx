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
    <div className="flex items-center justify-between border-t border-[#eae5d8] bg-[#fbfaf6]/90 px-6 py-4">
      <p className="text-xs text-[#78857a]">
        Showing <span className="font-semibold text-[#26352a]">{from}–{to}</span> of{" "}
        <span className="font-semibold text-[#26352a]">{total}</span> records
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-xl border text-sm transition-all",
            hasPreviousPage
              ? "border-[#d9d2c2] bg-white text-[#26352a] hover:bg-[#ede8db] shadow-xs"
              : "border-[#e5dfd2] text-[#b0b8ae] cursor-not-allowed bg-transparent",
          )}
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs font-medium text-[#4c594f] px-2.5">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          aria-label="Next page"
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-xl border text-sm transition-all",
            hasNextPage
              ? "border-[#d9d2c2] bg-white text-[#26352a] hover:bg-[#ede8db] shadow-xs"
              : "border-[#e5dfd2] text-[#b0b8ae] cursor-not-allowed bg-transparent",
          )}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
