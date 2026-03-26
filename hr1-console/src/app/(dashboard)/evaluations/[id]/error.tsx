"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
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
          <Link
            href="/evaluations"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
