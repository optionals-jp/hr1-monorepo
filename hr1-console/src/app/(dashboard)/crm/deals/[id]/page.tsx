"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InfoItem } from "@/components/ui/info-item";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dealStatusLabels, dealStatusColors, activityTypeLabels } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import {
  useCrmDeal,
  useCrmDealActivities,
  useCrmDealTodos,
  useCrmQuotesByDeal,
} from "@/lib/hooks/use-crm";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants/crm";
import { FileText, Plus, CheckCircle2, Circle, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDefaultPipeline,
  getStagesFromPipeline,
  resolveStageLabel,
} from "@/lib/hooks/use-pipelines";
import { CrmCustomFields } from "@/components/crm/crm-custom-fields";
import { DealContactsPanel } from "@/components/crm/deal-contacts-panel";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/crm-repository";

export default function CrmDealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: deal, error } = useCrmDeal(id);
  const { data: activities, mutate: mutateActivities } = useCrmDealActivities(id);
  const { data: todos, mutate: mutateTodos } = useCrmDealTodos(id);
  const { data: quotes } = useCrmQuotesByDeal(id);
  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);

  // 活動追加
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityType, setActivityType] = useState("memo");
  const [activityDesc, setActivityDesc] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);

  const handleAddActivity = useCallback(async () => {
    if (!organization || !activityTitle.trim() || savingActivity) return;
    setSavingActivity(true);
    try {
      await repository.createActivity(getSupabase(), {
        organization_id: organization.id,
        activity_type: activityType,
        title: activityTitle.trim(),
        description: activityDesc.trim() || null,
        deal_id: id,
        activity_date: new Date().toISOString(),
        created_by: user?.id ?? null,
      });
      setActivityTitle("");
      setActivityDesc("");
      setShowActivityForm(false);
      mutateActivities();
      showToast("活動を記録しました");
    } catch {
      showToast("活動の記録に失敗しました", "error");
    } finally {
      setSavingActivity(false);
    }
  }, [
    organization,
    activityTitle,
    activityType,
    activityDesc,
    savingActivity,
    id,
    user,
    mutateActivities,
    showToast,
  ]);

  // TODO追加
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [savingTodo, setSavingTodo] = useState(false);

  const handleAddTodo = useCallback(async () => {
    if (!organization || !todoTitle.trim() || savingTodo) return;
    setSavingTodo(true);
    try {
      await repository.createTodo(getSupabase(), {
        organization_id: organization.id,
        title: todoTitle.trim(),
        deal_id: id,
        due_date: todoDueDate || null,
        assigned_to: user?.id ?? null,
        created_by: user?.id ?? null,
      });
      setTodoTitle("");
      setTodoDueDate("");
      setShowTodoForm(false);
      mutateTodos();
      showToast("TODOを追加しました");
    } catch {
      showToast("TODOの追加に失敗しました", "error");
    } finally {
      setSavingTodo(false);
    }
  }, [organization, todoTitle, todoDueDate, savingTodo, id, user, mutateTodos, showToast]);

  const handleToggleTodo = useCallback(
    async (todoId: string, isCompleted: boolean) => {
      if (!organization) return;
      try {
        await repository.toggleTodoComplete(getSupabase(), todoId, organization.id, isCompleted);
        mutateTodos();
      } catch {
        showToast("TODOの更新に失敗しました", "error");
      }
    },
    [organization, mutateTodos, showToast]
  );

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

          {/* 関連連絡先 */}
          <DealContactsPanel dealId={deal.id} />

          {/* 見積書 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="size-5" />
                見積書（{quotes?.length ?? 0}件）
              </h2>
              <Link href={`/crm/quotes/new?dealId=${deal.id}`}>
                <Button variant="outline" size="sm">
                  <Plus className="size-4 mr-1" />
                  作成
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {(quotes ?? []).map((q) => (
                <Link
                  key={q.id}
                  href={`/crm/quotes/${q.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-sm">{q.quote_number}</p>
                    <p className="text-xs text-muted-foreground">{q.title}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={quoteStatusColors[q.status]}>
                      {quoteStatusLabels[q.status]}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums">
                      ¥{q.total.toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
              {(quotes ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">見積書なし</p>
              )}
            </div>
          </div>

          {/* カスタムフィールド */}
          <CrmCustomFields entityId={deal.id} entityType="deal" mode="view" />

          {/* TODO */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">TODO（{todos?.length ?? 0}件）</h2>
              <Button variant="outline" size="sm" onClick={() => setShowTodoForm(!showTodoForm)}>
                <Plus className="size-4 mr-1" />
                追加
              </Button>
            </div>
            {showTodoForm && (
              <div className="rounded-lg border p-3 mb-3 space-y-2 bg-muted/20">
                <Input
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  placeholder="TODOタイトル"
                  onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
                />
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={todoDueDate}
                    onChange={(e) => setTodoDueDate(e.target.value)}
                    className="w-40"
                  />
                  <Button size="sm" onClick={handleAddTodo} disabled={savingTodo}>
                    {savingTodo ? "追加中..." : "追加"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowTodoForm(false)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {(todos ?? []).map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <button
                    onClick={() => handleToggleTodo(todo.id, !todo.is_completed)}
                    className="flex-shrink-0"
                  >
                    {todo.is_completed ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        todo.is_completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {todo.title}
                    </p>
                    {todo.due_date && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {todo.due_date}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(todos ?? []).length === 0 && !showTodoForm && (
                <p className="text-sm text-muted-foreground text-center py-4">TODOなし</p>
              )}
            </div>
          </div>

          {/* 活動タイムライン */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="size-5" />
                活動ログ（{activities?.length ?? 0}件）
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActivityForm(!showActivityForm)}
              >
                <Plus className="size-4 mr-1" />
                記録
              </Button>
            </div>
            {showActivityForm && (
              <div className="rounded-lg border p-4 mb-4 space-y-3 bg-muted/20">
                <div className="flex gap-2">
                  <Input
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    placeholder="活動タイトル"
                    className="flex-1"
                  />
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(activityTypeLabels).map(([val, lbl]) => (
                        <SelectItem key={val} value={val}>
                          {lbl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  placeholder="詳細メモ（任意）"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddActivity} disabled={savingActivity}>
                    {savingActivity ? "記録中..." : "記録する"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowActivityForm(false)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
            <div className="relative">
              {(activities ?? []).length > 0 && (
                <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
              )}
              <div className="space-y-4">
                {(activities ?? []).map((a) => (
                  <div key={a.id} className="flex gap-3 relative">
                    <div className="w-6 h-6 rounded-full border-2 bg-background flex-shrink-0 flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{a.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {activityTypeLabels[a.activity_type] ?? a.activity_type}
                        </Badge>
                      </div>
                      {a.description && (
                        <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(a.activity_date ?? a.created_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {(activities ?? []).length === 0 && !showActivityForm && (
                <p className="text-sm text-muted-foreground text-center py-4">活動なし</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
