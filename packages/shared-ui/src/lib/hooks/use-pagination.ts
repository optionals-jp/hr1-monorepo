"use client";

import { useState } from "react";

/**
 * クライアントサイドページネーションhook
 */
export function usePagination<T>(items: T[], initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  const onPageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const onPageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return {
    page: safePage,
    pageSize,
    totalCount,
    paginatedItems,
    onPageChange,
    onPageSizeChange,
  };
}
