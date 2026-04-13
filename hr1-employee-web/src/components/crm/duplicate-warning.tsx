"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Props {
  type: "company" | "contact";
  duplicates: Array<{ id: string; label: string; matchType: string; score?: number }>;
  onUseExisting: (id: string) => void;
  onDismiss: () => void;
}

export function DuplicateWarning({ type, duplicates, onUseExisting, onDismiss }: Props) {
  if (duplicates.length === 0) return null;

  const typeLabel = type === "company" ? "企業" : "連絡先";

  return (
    <Card className="border-yellow-300 bg-yellow-50">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="size-4 text-yellow-600" />
          <span className="text-sm font-semibold text-yellow-800">
            類似する{typeLabel}レコードが見つかりました
          </span>
        </div>
        <div className="space-y-2">
          {duplicates.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-md border border-yellow-200 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{d.label}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {d.matchType}
                </Badge>
                {d.score != null && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {Math.round(d.score * 100)}%
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={() => onUseExisting(d.id)}
              >
                既存を使用
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDismiss}>
            新規作成を続行
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
