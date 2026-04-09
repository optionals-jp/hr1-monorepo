"use client";

import { useState, useMemo } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyPayslips } from "@/lib/hooks/use-payslips";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Receipt, ChevronDown } from "lucide-react";

export default function PayslipsPage() {
  const { data: payslips = [], isLoading, error, mutate } = useMyPayslips();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const years = useMemo(
    () => [...new Set(payslips.map((p) => p.year))].sort((a, b) => b - a),
    [payslips]
  );

  const filtered = useMemo(() => {
    if (!selectedYear) return payslips;
    return payslips.filter((p) => p.year === selectedYear);
  }, [payslips, selectedYear]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);

  return (
    <div className="flex flex-col">
      <PageHeader title="給与明細" description="給与明細の確認" sticky={false} border={false} />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : payslips.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Receipt className="h-10 w-10 opacity-40" />
            <p className="text-sm">給与明細がありません</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {years.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedYear === null ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedYear(null)}
                >
                  すべて
                </Badge>
                {years.map((year) => (
                  <Badge
                    key={year}
                    variant={selectedYear === year ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedYear(year === selectedYear ? null : year)}
                  >
                    {year}年
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {filtered.map((payslip) => {
                const isExpanded = expandedId === payslip.id;
                return (
                  <Card
                    key={payslip.id}
                    className="cursor-pointer transition-colors hover:bg-accent/30"
                    onClick={() => setExpandedId(isExpanded ? null : payslip.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                          {payslip.year}年{payslip.month}月
                        </CardTitle>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">
                            {formatCurrency(payslip.net_pay)}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent>
                        <div className="space-y-4 text-sm">
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">基本給</span>
                            <span className="font-medium">
                              {formatCurrency(payslip.base_salary)}
                            </span>
                          </div>

                          {payslip.allowances.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">手当</p>
                              {payslip.allowances.map((a, i) => (
                                <div key={i} className="flex justify-between py-1">
                                  <span className="text-muted-foreground">{a.label}</span>
                                  <span>{formatCurrency(a.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-between py-2 border-t font-medium">
                            <span>総支給額</span>
                            <span>{formatCurrency(payslip.gross_pay)}</span>
                          </div>

                          {payslip.deductions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">控除</p>
                              {payslip.deductions.map((d, i) => (
                                <div key={i} className="flex justify-between py-1">
                                  <span className="text-muted-foreground">{d.label}</span>
                                  <span className="text-red-600">-{formatCurrency(d.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-between py-2 border-t-2 font-bold">
                            <span>差引支給額</span>
                            <span>{formatCurrency(payslip.net_pay)}</span>
                          </div>

                          {payslip.note && (
                            <p className="text-xs text-muted-foreground mt-2">{payslip.note}</p>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </PageContent>
    </div>
  );
}
