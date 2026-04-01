"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InfoItem } from "@/components/ui/info-item";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { Badge } from "@/components/ui/badge";
import { dealStatusLabels, dealStatusColors, activityTypeLabels } from "@/lib/constants";
import Link from "next/link";
import { useCrmDeal, useCrmDealActivities, useCrmDealTodos } from "@/lib/hooks/use-crm";
import {
  useDefaultPipeline,
  getStagesFromPipeline,
  resolveStageLabel,
} from "@/lib/hooks/use-pipelines";

export default function CrmDealDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: deal, error } = useCrmDeal(id);
  const { data: activities } = useCrmDealActivities(id);
  const { data: todos } = useCrmDealTodos(id);
  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);

  return (
    <div>
      <PageHeader
        title={deal?.title ?? "商談詳細"}
        breadcrumb={[{ label: "商談管理", href: "/crm/deals" }]}
      />
      {error && <QueryErrorBanner error={error} />}

      {deal && (
        <div className="space-y-8">
          {/* ステータス */}
          <div className="flex items-center gap-3">
            <Badge variant={dealStatusColors[deal.status]} className="text-sm">
              {dealStatusLabels[deal.status]}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {resolveStageLabel(deal.stage, deal.stage_id, stages)}
            </Badge>
          </div>

          {/* 基本情報 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem label="商談名" value={deal.title} />
            <InfoItem
              label="金額"
              value={deal.amount != null ? `¥${deal.amount.toLocaleString()}` : null}
            />
            <InfoItem
              label="確度"
              value={deal.probability != null ? `${deal.probability}%` : null}
            />
            {deal.bc_companies && (
              <div>
                <p className="text-sm text-muted-foreground">企業</p>
                <Link
                  href={`/crm/companies/${deal.company_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {deal.bc_companies.name}
                </Link>
              </div>
            )}
            {deal.bc_contacts && (
              <div>
                <p className="text-sm text-muted-foreground">連絡先</p>
                <Link
                  href={`/crm/contacts/${deal.contact_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {deal.bc_contacts.last_name} {deal.bc_contacts.first_name ?? ""}
                </Link>
              </div>
            )}
            <InfoItem label="見込み日" value={deal.expected_close_date} />
            <InfoItem label="説明" value={deal.description} />
          </div>

          {/* TODO */}
          <div>
            <h2 className="text-lg font-semibold mb-3">TODO（{todos?.length ?? 0}件）</h2>
            <div className="space-y-2">
              {(todos ?? []).map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      todo.is_completed
                        ? "bg-green-500 border-green-500"
                        : "border-muted-foreground"
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        todo.is_completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {todo.title}
                    </p>
                    {todo.due_date && (
                      <p className="text-xs text-muted-foreground">期限: {todo.due_date}</p>
                    )}
                  </div>
                </div>
              ))}
              {(todos ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">TODOなし</p>
              )}
            </div>
          </div>

          {/* 活動 */}
          <div>
            <h2 className="text-lg font-semibold mb-3">活動ログ（{activities?.length ?? 0}件）</h2>
            <div className="space-y-2">
              {(activities ?? []).map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="outline">
                      {activityTypeLabels[a.activity_type] ?? a.activity_type}
                    </Badge>
                  </div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                  )}
                </div>
              ))}
              {(activities ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">活動なし</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
