"use client";

import { useEffect, useState } from "react";

/**
 * ウィンドウがスクロールされているかを返すフック。
 * sticky ヘッダーの下線表示など、スクロール状態に応じた UI 切り替えに使用する。
 */
export function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 0;
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrolled;
}
