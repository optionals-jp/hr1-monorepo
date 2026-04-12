"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@hr1/shared-ui/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { formatCurrency } from "@/lib/utils";
import { contractStatusLabels, contractStatusColors } from "@/lib/constants";
import { Search, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Contract, Plan } from "@/types/database";

export default function OrganizationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    data: contracts,
    error,
    mutate,
  } = useQuery<Contract[]>("admin-organizations", async () => {
    const { data } = await getSupabase()
      .from("contracts")
      .select("*, organizations(*), plans(*)")
      .order("created_at", { ascending: false });
    return (data as Contract[]) ?? [];
  });

  const { data: plans } = useQuery<Plan[]>("admin-plans-for-setup", async () => {
    const { data } = await getSupabase()
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price_monthly", { ascending: true });
    return (data as Plan[]) ?? [];
  });

  const filtered = (contracts ?? []).filter((c) => {
    const matchSearch =
      !search || c.organizations?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // --- セットアップダイアログ ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    organization_name: "",
    industry: "",
    location: "",
    plan_id: "",
    contracted_employees: "",
    monthly_price: "",
    status: "trial" as string,
    trial_end_date: "",
    admin_email: "",
    admin_display_name: "",
  });

  const openSetup = () => {
    setFormError(null);
    setSuccess(null);
    setForm({
      organization_name: "",
      industry: "",
      location: "",
      plan_id: "",
      contracted_employees: "",
      monthly_price: "",
      status: "trial",
      trial_end_date: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
      })(),
      admin_email: "",
      admin_display_name: "",
    });
    setDialogOpen(true);
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans?.find((p) => p.id === planId);
    setForm({
      ...form,
      plan_id: planId,
      monthly_price: plan ? String(plan.price_monthly) : form.monthly_price,
    });
  };

  const handleSetup = async () => {
    setSaving(true);
    setFormError(null);
    setSuccess(null);

    const employees = parseInt(form.contracted_employees, 10);
    const price = parseInt(form.monthly_price, 10);

    if (isNaN(employees) || employees <= 0) {
      setFormError("契約社員数は1以上の数値を入力してください。");
      setSaving(false);
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormError("月額料金は0以上の数値を入力してください。");
      setSaving(false);
      return;
    }

    try {
      const { data: sessionData } = await getSupabase().auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/setup-organization`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            organization_name: form.organization_name,
            industry: form.industry || undefined,
            location: form.location || undefined,
            plan_id: form.plan_id,
            contracted_employees: employees,
            monthly_price: price,
            status: form.status,
            trial_end_date: form.trial_end_date || undefined,
            admin_email: form.admin_email,
            admin_display_name: form.admin_display_name || undefined,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        setFormError(result.error ?? "セットアップに失敗しました。");
        return;
      }

      setSuccess(
        `${form.organization_name} のセットアップが完了しました。${form.admin_email} に招待メールを送信しました。`
      );
      mutate();
    } catch {
      setFormError("ネットワークエラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    !saving &&
    form.organization_name &&
    form.plan_id &&
    form.contracted_employees &&
    form.monthly_price &&
    form.admin_email;

  return (
    <>
      <PageHeader
        title="契約企業"
        description="HR1と契約中の企業一覧"
        action={
          <Button size="sm" onClick={openSetup}>
            <Plus className="mr-1.5 h-4 w-4" />
            新規企業セットアップ
          </Button>
        }
      />
      <PageContent>
        <QueryErrorBanner error={error} onRetry={() => mutate()} />

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="企業名で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="active">契約中</SelectItem>
              <SelectItem value="trial">トライアル</SelectItem>
              <SelectItem value="suspended">停止中</SelectItem>
              <SelectItem value="cancelled">解約済み</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>企業名</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead className="text-right">契約社員数</TableHead>
                <TableHead className="text-right">月額</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>契約開始日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contract) => (
                <TableRow
                  key={contract.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => router.push(`/organizations/${contract.organization_id}`)}
                >
                  <TableCell className="font-medium">
                    {contract.organizations?.name ?? "-"}
                  </TableCell>
                  <TableCell>{contract.plans?.name ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {contract.contracted_employees.toLocaleString()}名
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ¥{formatCurrency(contract.monthly_price)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={contractStatusColors[contract.status] ?? "outline"}>
                      {contractStatusLabels[contract.status] ?? contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(contract.start_date).toLocaleDateString("ja-JP")}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {contracts && contracts.length > 0
                      ? "条件に一致する企業がありません"
                      : "契約企業がありません"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>

      {/* Setup Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!saving) setDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新規企業セットアップ</DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
              <Button className="w-full" onClick={() => setDialogOpen(false)}>
                閉じる
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 企業情報 */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                企業情報
              </p>
              <div className="space-y-1.5">
                <Label>
                  企業名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.organization_name}
                  onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                  placeholder="株式会社サンプル"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>業種</Label>
                  <Input
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder="IT・通信"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>所在地</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="東京都渋谷区"
                  />
                </div>
              </div>

              {/* 契約情報 */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
                契約情報
              </p>
              <div className="space-y-1.5">
                <Label>
                  プラン <span className="text-red-500">*</span>
                </Label>
                <Select value={form.plan_id} onValueChange={(v) => v && handlePlanChange(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="プランを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {(plans ?? []).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} (¥{formatCurrency(plan.price_monthly)}/月)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    契約社員数 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={form.contracted_employees}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        contracted_employees: e.target.value,
                      })
                    }
                    placeholder="50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    月額料金（円） <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={form.monthly_price}
                    onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>ステータス</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => v && setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">トライアル</SelectItem>
                      <SelectItem value="active">契約中</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.status === "trial" && (
                  <div className="space-y-1.5">
                    <Label>トライアル終了日</Label>
                    <Input
                      type="date"
                      value={form.trial_end_date}
                      onChange={(e) => setForm({ ...form, trial_end_date: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* 初期管理者 */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">
                初期管理者（招待メールが送信されます）
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    メールアドレス <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>表示名</Label>
                  <Input
                    value={form.admin_display_name}
                    onChange={(e) => setForm({ ...form, admin_display_name: e.target.value })}
                    placeholder="管理 太郎"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  キャンセル
                </Button>
                <Button onClick={handleSetup} disabled={!canSubmit}>
                  {saving ? "セットアップ中..." : "セットアップ実行"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
