"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>
          {from}〜{to} / {totalCount}件
        </span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}件
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-2 text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// Re-export hook from lib/hooks for backwards compatibility
export { usePagination } from "@/lib/hooks/use-pagination";
