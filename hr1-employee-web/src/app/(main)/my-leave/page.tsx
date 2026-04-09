"use client";

import Link from "next/link";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyLeave } from "@/lib/hooks/use-my-leave";
import { CalendarOff, Plus } from "lucide-react";
import { format } from "date-fns";

export default function MyLeavePage() {
  const { data: balances = [], isLoading, error, mutate } = useMyLeave();

  const currentBalance = balances[0];
  const remaining = currentBalance
    ? currentBalance.granted_days +
      currentBalance.carried_over_days -
      currentBalance.used_days -
      currentBalance.expired_days
    : 0;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="休暇"
        description="有給休暇の残日数"
        sticky={false}
        border={false}
        action={
          <Link href="/workflows?type=paid_leave">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              休暇を申請
            </Button>
          </Link>
        }
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : balances.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <CalendarOff className="h-10 w-10 opacity-40" />
            <p className="text-sm">休暇情報がありません</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl">
            {currentBalance && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {currentBalance.fiscal_year}年度 有給休暇
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 mb-6">
                    <span className="text-4xl font-bold tabular-nums">{remaining}</span>
                    <span className="text-sm text-muted-foreground mb-1">日残り</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">付与日数</p>
                      <p className="font-medium">{currentBalance.granted_days}日</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">繰越日数</p>
                      <p className="font-medium">{currentBalance.carried_over_days}日</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">使用日数</p>
                      <p className="font-medium">{currentBalance.used_days}日</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">失効日数</p>
                      <p className="font-medium">{currentBalance.expired_days}日</p>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground mt-4 pt-4 border-t">
                    <span>付与日: {format(new Date(currentBalance.grant_date), "yyyy/MM/dd")}</span>
                    <span>
                      失効日: {format(new Date(currentBalance.expiry_date), "yyyy/MM/dd")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {balances.length > 1 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">過去の付与履歴</h3>
                <div className="divide-y rounded-lg border">
                  {balances.slice(1).map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="font-medium">{b.fiscal_year}年度</span>
                      <span className="text-muted-foreground">
                        付与 {b.granted_days}日 / 使用 {b.used_days}日 / 繰越 {b.carried_over_days}
                        日
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PageContent>
    </div>
  );
}
