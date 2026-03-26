import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold text-foreground">ページが見つかりません</h2>
        <p className="text-sm text-muted-foreground">
          指定されたページは存在しないか、削除された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
