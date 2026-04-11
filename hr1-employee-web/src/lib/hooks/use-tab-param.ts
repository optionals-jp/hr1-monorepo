"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * URL search param ベースのタブ管理フック。
 * ブラウザの戻る/進むでタブ状態が復元される。
 */
export function useTabParam<T extends string>(
  defaultTab: NoInfer<T>,
  paramName = "tab"
): [T, (tab: T) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const raw = searchParams.get(paramName);
  const tab = (raw as T) || defaultTab;

  const setTab = useCallback(
    (newTab: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newTab === defaultTab) {
        params.delete(paramName);
      } else {
        params.set(paramName, newTab);
      }
      const q = params.toString();
      router.replace(`${pathname}${q ? `?${q}` : ""}`, { scroll: false });
    },
    [searchParams, pathname, router, defaultTab, paramName]
  );

  return [tab, setTab];
}
