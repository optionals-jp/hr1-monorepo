import { ShieldX } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <ShieldX className="h-10 w-10" />
      <p className="text-sm font-medium">アクセス権限がありません</p>
      <p className="text-xs">管理者に権限の付与を依頼してください</p>
    </div>
  );
}
