"use client";

import { Button, buttonVariants } from "@hr1/shared-ui/components/ui/button";
import Link from "next/link";

export function ErrorPage({
  error,
  reset,
  backHref,
  backLabel = "一覧に戻る",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold text-foreground">読み込みに失敗しました</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "予期しないエラーが発生しました。"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            再試行
          </Button>
          {backHref && (
            <Link href={backHref} className={buttonVariants({ variant: "primary" })}>
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
