"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import Link from "next/link";
import {
  useCrmDeal,
  useCrmDealActivities,
  useCrmDealTodos,
  useCrmQuotesByDeal,
} from "@/lib/hooks/use-crm";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants";
import {
  FileText,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Briefcase,
  ScrollText,
  ListTodo,
  MessageCircle,
} from "lucide-react";
import { usePipelines, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import { CrmCustomFields } from "@/components/crm/crm-custom-fields";
import { StageChevrons } from "@/components/crm/stage-chevrons";
import { DealContactsPanel } from "@/components/crm/deal-contacts-panel";
import { ActivityInputBar } from "@/components/crm/activity-input-bar";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { CommentFeed } from "@/components/crm/comment-feed";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/crm-repository";

const tabs = [
  { value: "overview", label: "概要", icon: Briefcase },
  { value: "activity", label: "活動ログ", icon: ScrollText },
  { value: "todos", label: "TODO", icon: ListTodo },
  { value: "comments", label: "コメント", icon: MessageCircle },
];

export default function CrmDealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();

  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(`/deals/${id}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, id, searchParams]
  );

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
        breadcrumb={[{ label: "商談管理", href: "/deals" }]}
      />
      {error && <QueryErrorBanner error={error} />}

      {deal && (
        <div className="px-4 sm:px-6 md:px-8 mb-4">
          <StageChevrons
            stages={stages}
            currentStageId={deal.stage_id}
            currentStageName={stages.find((s) => s.id === deal.stage_id)?.name ?? ""}
            status={deal.status}
            onStageChange={handleStageChange}
          />
        </div>
      )}

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </StickyFilterBar>

      {deal && activeTab === "overview" && (
        <PageContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard className="self-start">
              <h2 className="text-sm font-semibold mb-4">基本情報</h2>
              <div className="space-y-4 text-sm">
                <div className="flex gap-8">
                  <span className="text-muted-foreground w-20 shrink-0">商談名</span>
                  <span className="font-medium">{deal.title}</span>
                </div>
                {deal.amount != null && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">金額</span>
                    <span>¥{deal.amount.toLocaleString()}</span>
                  </div>
                )}
                {deal.probability != null && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">確度</span>
                    <span>{deal.probability}%</span>
                  </div>
                )}
                {deal.crm_companies && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">企業</span>
                    <Link
                      href={`/companies/${deal.company_id}`}
                      className="text-primary hover:underline"
                    >
                      {deal.crm_companies.name}
                    </Link>
                  </div>
                )}
                {deal.crm_contacts && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">連絡先</span>
                    <Link
                      href={`/contacts/${deal.contact_id}`}
                      className="text-primary hover:underline"
                    >
                      {deal.crm_contacts.last_name} {deal.crm_contacts.first_name ?? ""}
                    </Link>
                  </div>
                )}
                {deal.expected_close_date && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">見込み日</span>
                    <span>{deal.expected_close_date}</span>
                  </div>
                )}
                {deal.description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      説明
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{deal.description}</p>
                  </div>
                )}
              </div>

              <CrmCustomFields entityId={deal.id} entityType="deal" />
            </SectionCard>

            <div className="lg:col-span-2 space-y-6">
              <SectionCard>
                <h2 className="text-sm font-semibold mb-3">サマリー</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">見積書</span>
                    </div>
                    <span className="text-2xl font-bold">{quotes?.length ?? 0}</span>
                  </div>
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ListTodo className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">TODO</span>
                    </div>
                    <span className="text-2xl font-bold">{todos?.length ?? 0}</span>
                  </div>
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ScrollText className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">活動</span>
                    </div>
                    <span className="text-2xl font-bold">{activities?.length ?? 0}</span>
                  </div>
                </div>
              </SectionCard>

              <DealContactsPanel dealId={deal.id} />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">
                    見積書
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {quotes?.length ?? 0}
                    </span>
                  </h2>
                  <Link href={`/quotes/new?dealId=${deal.id}`}>
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
                          onClick={() => router.push(`/quotes/${q.id}`)}
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

              <SectionCard>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">
                    直近の活動
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {activities?.length ?? 0}
                    </span>
                  </h2>
                  {(activities?.length ?? 0) > 3 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("activity")}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      すべて表示
                    </button>
                  )}
                </div>
                <ActivityTimeline activities={(activities ?? []).slice(0, 3).reverse()} />
                <ActivityInputBar dealId={id} onAdded={() => mutateActivities()} />
              </SectionCard>
            </div>
          </div>
        </PageContent>
      )}

      {deal && activeTab === "activity" && (
        <PageContent>
          <div className="max-w-3xl">
            <ActivityTimeline activities={activities ?? []} />
            <ActivityInputBar dealId={id} onAdded={() => mutateActivities()} />
          </div>
        </PageContent>
      )}

      {deal && activeTab === "todos" && (
        <PageContent>
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">
                TODO
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {todos?.length ?? 0}
                </span>
              </h2>
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
                <Input
                  type="date"
                  value={todoDueDate}
                  onChange={(e) => setTodoDueDate(e.target.value)}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleAddTodo} disabled={savingTodo}>
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
                    className="shrink-0 cursor-pointer"
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
                <p className="text-sm text-muted-foreground text-center py-8">TODOなし</p>
              )}
            </div>
          </div>
        </PageContent>
      )}

      {deal && activeTab === "comments" && (
        <PageContent>
          <div className="max-w-3xl">
            <CommentFeed entityType="deal" entityId={id} />
          </div>
        </PageContent>
      )}
    </div>
  );
}
