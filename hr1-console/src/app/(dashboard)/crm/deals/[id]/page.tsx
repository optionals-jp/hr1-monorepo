"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import {
  useCrmDeal,
  useCrmDealActivities,
  useCrmDealTodos,
  useCrmQuotesByDeal,
} from "@/lib/hooks/use-crm";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants";
import { FileText, Plus, CheckCircle2, Circle, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePipelines, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import { CrmCustomFields } from "@/components/crm/crm-custom-fields";
import { StageChevrons } from "@/components/crm/stage-chevrons";
import { DealContactsPanel } from "@/components/crm/deal-contacts-panel";
import { ActivityInputBar } from "@/components/crm/activity-input-bar";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/crm-repository";

export default function CrmDealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: deal, error, mutate: mutateDeal } = useCrmDeal(id);
  const { data: activities, mutate: mutateActivities } = useCrmDealActivities(id);
  const { data: todos, mutate: mutateTodos } = useCrmDealTodos(id);
  const { data: quotes } = useCrmQuotesByDeal(id);
  const { data: pipelines } = usePipelines();
  const dealPipeline =
    pipelines?.find((p) => p.id === deal?.pipeline_id) ??
    pipelines?.find((p) => p.is_default) ??
    pipelines?.[0] ??
    null;
  const stages = getStagesFromPipeline(dealPipeline);

  const handleStageChange = useCallback(
    async (stageId: string, stageName: string, probability: number) => {
      if (!organization) return;
      try {
        await repository.updateDeal(getSupabase(), id, organization.id, {
          stage_id: stageId,
          stage: stageName,
          probability,
        });
        mutateDeal();
        showToast(`ステージを「${stageName}」に変更しました`);
      } catch {
        showToast("ステージの変更に失敗しました", "error");
      }
    },
    [organization, id, mutateDeal, showToast]
  );

  // 活動追加
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
    <div className="flex flex-col">
      <PageHeader
        title={deal?.title ?? "商談詳細"}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "商談管理", href: "/crm/deals" }]}
      />
      {error && <QueryErrorBanner error={error} />}

      {deal && (
        <>
          <PageContent>
            {/* パイプラインステージ（矢羽） */}
            <div className="mb-6">
              <StageChevrons
                stages={stages}
                currentStageId={deal.stage_id}
                currentStageName={deal.stage}
                status={deal.status}
                onStageChange={handleStageChange}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ===== 左カラム (2/3): 基本情報・連絡先・見積書 ===== */}
              <div className="lg:col-span-2 space-y-6">
                {/* 基本情報 */}
                <Card>
                  <CardHeader>
                    <CardTitle>基本情報</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">商談名</span>
                      <span className="font-medium">{deal.title}</span>
                    </div>
                    {deal.amount != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">金額</span>
                        <span>¥{deal.amount.toLocaleString()}</span>
                      </div>
                    )}
                    {deal.probability != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">確度</span>
                        <span>{deal.probability}%</span>
                      </div>
                    )}
                    {deal.bc_companies && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">企業</span>
                        <Link
                          href={`/crm/companies/${deal.company_id}`}
                          className="text-primary hover:underline"
                        >
                          {deal.bc_companies.name}
                        </Link>
                      </div>
                    )}
                    {deal.bc_contacts && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">連絡先</span>
                        <Link
                          href={`/crm/contacts/${deal.contact_id}`}
                          className="text-primary hover:underline"
                        >
                          {deal.bc_contacts.last_name} {deal.bc_contacts.first_name ?? ""}
                        </Link>
                      </div>
                    )}
                    {deal.expected_close_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">見込み日</span>
                        <span>{deal.expected_close_date}</span>
                      </div>
                    )}
                    {deal.description && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">説明</span>
                        <span className="text-right max-w-[60%]">{deal.description}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* カスタムフィールド */}
                <CrmCustomFields entityId={deal.id} entityType="deal" />

                {/* 関連連絡先 */}
                <DealContactsPanel dealId={deal.id} />

                {/* 見積書 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="size-4" />
                      見積書（{quotes?.length ?? 0}件）
                    </h2>
                    <Link href={`/crm/quotes/new?dealId=${deal.id}`}>
                      <Button variant="outline" size="sm">
                        <Plus className="size-4 mr-1" />
                        作成
                      </Button>
                    </Link>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>見積番号</TableHead>
                        <TableHead>タイトル</TableHead>
                        <TableHead>金額</TableHead>
                        <TableHead>ステータス</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(quotes ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                            見積書なし
                          </TableCell>
                        </TableRow>
                      ) : (
                        (quotes ?? []).map((q) => (
                          <TableRow
                            key={q.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`/crm/quotes/${q.id}`)}
                          >
                            <TableCell className="font-medium">{q.quote_number}</TableCell>
                            <TableCell className="text-muted-foreground">{q.title}</TableCell>
                            <TableCell className="tabular-nums">
                              ¥{q.total.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={quoteStatusColors[q.status]}>
                                {quoteStatusLabels[q.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* 活動ログ + 入力バー */}
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <MessageSquare className="size-4" />
                    活動ログ（{activities?.length ?? 0}件）
                  </h2>
                  <ActivityTimeline activities={activities ?? []} emptyMessage="活動なし" />
                  <ActivityInputBar dealId={id} onAdded={() => mutateActivities()} />
                </div>
              </div>

              {/* ===== 右カラム (1/3): TODO ===== */}
              <div className="space-y-6">
                {/* TODO */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">TODO（{todos?.length ?? 0}件）</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTodoForm(!showTodoForm)}
                    >
                      <Plus className="size-4 mr-1" />
                      追加
                    </Button>
                  </CardHeader>
                  <CardContent>
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
                            className="w-full"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddTodo} disabled={savingTodo}>
                            {savingTodo ? "追加中..." : "追加"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTodoForm(false)}
                          >
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {(todos ?? []).map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          <button
                            onClick={() => handleToggleTodo(todo.id, !todo.is_completed)}
                            className="shrink-0"
                          >
                            {todo.is_completed ? (
                              <CheckCircle2 className="size-5 text-green-500" />
                            ) : (
                              <Circle className="size-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium text-sm truncate ${
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
                  </CardContent>
                </Card>
              </div>
            </div>
          </PageContent>
        </>
      )}
    </div>
  );
}
