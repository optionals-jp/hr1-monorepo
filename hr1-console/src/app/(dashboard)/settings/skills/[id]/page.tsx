"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { useSkillMasterDetail, LEVEL_LABELS } from "@/lib/hooks/use-skill-master-detail";
import { Loader2, Pencil, Star, Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const pageTabs = [
  { value: "overview", label: "概要", icon: Info },
  { value: "employees", label: "登録社員", icon: Users },
];

function LevelStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= level ? "fill-amber-400 text-amber-400" : "text-gray-200"
          )}
        />
      ))}
      <span className="ml-1.5 text-xs text-muted-foreground">{LEVEL_LABELS[level]}</span>
    </div>
  );
}

function LevelDistribution({ distribution, count }: { distribution: number[]; count: number }) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((level) => {
        const n = distribution[level - 1];
        const pct = count > 0 ? (n / count) * 100 : 0;
        return (
          <div key={level} className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-0.5 w-20 shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3 w-3",
                    s <= level ? "fill-amber-400 text-amber-400" : "text-gray-200"
                  )}
                />
              ))}
            </div>
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-10 text-xs text-muted-foreground text-right">{n}名</span>
          </div>
        );
      })}
    </div>
  );
}

export default function SkillMasterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const h = useSkillMasterDetail(id);

  if (h.loading || !h.organization) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.master) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        スキルマスタが見つかりません
      </div>
    );
  }

  const isSystem = h.master.organization_id === null;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={h.master.name}
        description={h.master.category ?? undefined}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "スキルマスタ", href: "/settings/skills" }]}
        action={
          isSystem ? (
            <Badge variant="outline">共通スキル</Badge>
          ) : (
            <Badge variant="secondary">自社スキル</Badge>
          )
        }
      />

      <StickyFilterBar>
        <TabBar tabs={pageTabs} activeTab={h.activeTab} onTabChange={h.setActiveTab} />
      </StickyFilterBar>

      {/* 概要タブ */}
      {h.activeTab === "overview" && (
        <PageContent>
          <div className="max-w-3xl space-y-6">
            {/* スキル説明 */}
            <SectionCard>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">スキル説明</h2>
                {!isSystem && !h.editingDescription && (
                  <Button variant="outline" size="sm" onClick={h.startEditDescription}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    編集
                  </Button>
                )}
              </div>
              {h.editingDescription ? (
                <div className="space-y-3">
                  <Textarea
                    value={h.draftDescription}
                    onChange={(e) => h.setDraftDescription(e.target.value)}
                    placeholder="このスキルの説明を入力..."
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => h.setEditingDescription(false)}
                    >
                      キャンセル
                    </Button>
                    <Button size="sm" onClick={h.saveDescription} disabled={h.savingDescription}>
                      {h.savingDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {h.master.description || (
                    <span className="text-muted-foreground">説明が登録されていません</span>
                  )}
                </p>
              )}
            </SectionCard>

            {/* サマリー */}
            <SectionCard>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">サマリー</h2>
              {h.stats.count === 0 ? (
                <p className="text-sm text-muted-foreground">
                  このスキルを登録している社員はいません
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{h.stats.average}</span>
                      <span className="text-sm text-muted-foreground">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            "h-5 w-5",
                            n <= Math.round(h.stats.average)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-200"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{h.stats.count}名の社員が登録</p>
                  </div>
                  <LevelDistribution distribution={h.stats.distribution} count={h.stats.count} />
                </div>
              )}
            </SectionCard>
          </div>
        </PageContent>
      )}

      {/* 登録社員タブ */}
      {h.activeTab === "employees" && (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>社員</TableHead>
                <TableHead>役職</TableHead>
                <TableHead>レベル</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={3}
                isLoading={false}
                isEmpty={h.employees.length === 0}
                emptyMessage="このスキルを登録している社員はいません"
              >
                {h.employees.map((emp) => (
                  <TableRow
                    key={emp.user_id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/employees/${emp.user_id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                            {(emp.display_name ?? emp.email)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{emp.display_name ?? "-"}</span>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.position ?? "-"}</TableCell>
                    <TableCell>
                      <LevelStars level={emp.level} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      )}
    </div>
  );
}
