"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/Icons";
import { Button } from "@/components/ui/Button";
import { TableFooter } from "@/components/ui/Table";
import { getPaginationMeta } from "@/lib/table-pagination";

type TablePaginationFooterProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function TablePaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: TablePaginationFooterProps) {
  const { totalPages } = getPaginationMeta(page, pageSize, total);

  if (totalPages <= 1) return null;

  return (
    <TableFooter align="center">
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="px-2 py-1.5"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          className="px-2 py-1.5"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </TableFooter>
  );
}
