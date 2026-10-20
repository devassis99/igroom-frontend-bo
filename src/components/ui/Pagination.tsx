import type { ReactNode } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface PaginationProps {
  /** 1-indexed. */
  page: number;
  pageSize: number;
  /** Rows across every page. */
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

const ARROW_CLASS =
  "flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg border border-bo-input-border font-sans text-[14px] text-bo-muted-4 hover:bg-bo-page disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Rows per page, ‹ 1 … 4 5 6 … 12 › — the footer under a paged table.
 * The back office twin of the tenant app's ui/Pagination.tsx, in back
 * office colours and with the themed dropdown for rows per page.
 *
 * Hidden while everything fits on the *smallest* page size, not merely the
 * current one, so somebody who switched to 50 rows can still switch back.
 */
export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  if (totalCount <= Math.min(...pageSizeOptions)) return null;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const sizeOptions: SelectOption<number>[] = pageSizeOptions.map((size) => ({
    value: size,
    label: String(size),
  }));

  // A wall of 13+ page buttons doesn't fit — window down to page 1, the
  // current page ± 1, and the last page, with an ellipsis filling any gap.
  const keep = [
    ...new Set([1, page - 1, page, page + 1, totalPages].filter((n) => n >= 1 && n <= totalPages)),
  ];
  keep.sort((a, b) => a - b);
  const pageButtons: ReactNode[] = [];
  keep.forEach((n, i) => {
    if (i > 0 && n - keep[i - 1]! > 1) {
      pageButtons.push(
        <span key={`gap-${n}`} className="px-0.5 font-sans text-xs text-bo-faint">
          …
        </span>,
      );
    }
    pageButtons.push(
      <button
        key={n}
        type="button"
        onClick={() => onPageChange(n)}
        aria-label={`Page ${n}`}
        aria-current={n === page ? "page" : undefined}
        className={`flex h-[30px] min-w-[30px] cursor-pointer items-center justify-center rounded-lg px-1.5 font-sans text-xs font-semibold ${
          n === page
            ? "bg-bo-dark text-bo-on-dark"
            : "border border-bo-input-border text-bo-muted-4 hover:bg-bo-page"
        }`}
      >
        {n}
      </button>,
    );
  });

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-3.5"
    >
      <div className="flex items-center gap-2 font-sans text-xs text-bo-muted-5">
        <span aria-hidden>Rows per page</span>
        <Select
          label="Rows per page"
          size="sm"
          value={pageSize}
          options={sizeOptions}
          onChange={onPageSizeChange}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className={ARROW_CLASS}
        >
          ‹
        </button>
        {pageButtons}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={ARROW_CLASS}
        >
          ›
        </button>
      </div>
    </nav>
  );
}

/** "Showing 21–40 of 72 prices" — the line beside a paged table's filters. */
export function PageRange({
  page,
  pageSize,
  totalCount,
  noun,
  className = "",
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  noun: string;
  className?: string;
}) {
  const rangeStart = (page - 1) * pageSize + 1;
  // Nothing to say about an empty list, or for the moment a page is past
  // the end (the list steps back to the last real page).
  if (totalCount === 0 || rangeStart > totalCount) return null;
  const rangeEnd = Math.min(page * pageSize, totalCount);
  return (
    <p className={`m-0 font-sans text-xs text-bo-muted-5 ${className}`}>
      Showing{" "}
      <span className="font-semibold text-bo-ink-soft">
        {rangeStart}–{rangeEnd}
      </span>{" "}
      of <span className="font-semibold text-bo-ink-soft">{totalCount}</span> {noun}
    </p>
  );
}
