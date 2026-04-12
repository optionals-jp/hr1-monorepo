"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { contractChangeTypeLabels } from "@/lib/constants";
import type { ContractChange } from "@/types/database";

export function RecentChanges() {
  const { data: changes } = useQuery<ContractChange[]>("admin-recent-changes", async () => {
    const { data } = await getSupabase()
      .from("contract_changes")
      .select("*, profiles:changed_by(display_name, email)")
      .order("created_at", { ascending: false })
      .limit(10);

    return (data as ContractChange[]) ?? [];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">最近の契約変更</CardTitle>
      </CardHeader>
      <CardContent>
        {changes && changes.length > 0 ? (
          <div className="space-y-3">
            {changes.map((change) => (
              <div
                key={change.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {contractChangeTypeLabels[change.change_type] ?? change.change_type}
                    </Badge>
                    {change.notes && (
                      <span className="text-sm text-muted-foreground truncate">{change.notes}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {change.profiles?.display_name ?? change.profiles?.email ?? "システム"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">
                  {new Date(change.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">変更履歴がありません</p>
        )}
      </CardContent>
    </Card>
  );
}
