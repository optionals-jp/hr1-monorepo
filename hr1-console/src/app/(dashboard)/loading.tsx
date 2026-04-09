export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  );
}
