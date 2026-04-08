"use client";

import { useState } from "react";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@hr1/shared-ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { formatCurrency } from "@/lib/utils";
import { contractStatusLabels, contractStatusColors } from "@/lib/constants";
import { useAuth } from "@/lib/auth-context";
import { Plus, AlertCircle } from "lucide-react";
import type { Contract, Plan, Organization } from "@/types/database";

export default function ContractsPage() {
  const { user } = useAuth();

  const {
    data: contracts,
    error,
    mutate,
  } = useQuery<Contract[]>("admin-contracts", async () => {
    const { data } = await getSupabase()
      .from("contracts")
      .select("*, organizations(*), plans(*)")
      .order("created_at", { ascending: false });
    return (data as Contract[]) ?? [];
  });

  const { data: plans } = useQuery<Plan[]>("admin-plans-list", async () => {
    const { data } = await getSupabase()
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price_monthly", { ascending: true });
    return (data as Plan[]) ?? [];
  });

  const { data: organizations } = useQuery<Organization[]>(
    "admin-orgs-list",
    async () => {
      const { data } = await getSupabase()
        .from("organizations")
        .select("*")
        .order("name", { ascending: true });
      return (data as Organization[]) ?? [];
    },
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    organization_id: "",
    plan_id: "",
    contracted_employees: "",
    monthly_price: "",
    start_date: "",
    trial_end_date: "",
    notes: "",
    status: "active" as string,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);

  const openCreate = () => {
    setFormError(null);
    setForm({
      organization_id: "",
      plan_id: "",
      contracted_employees: "",
      monthly_price: "",
      start_date: new Date().toISOString().split("T")[0],
      trial_end_date: "",
      notes: "",
      status: "active",
    });
    setDialogOpen(true);
  };

  // プラン選択時に月額を自動設定
  const handlePlanChange = (planId: string) => {
    const plan = plans?.find((p) => p.id === planId);
    setForm({
      ...form,
      plan_id: planId,
      monthly_price: plan ? String(plan.price_monthly) : form.monthly_price,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const employees = parseInt(form.contracted_employees, 10);
      const price = parseInt(form.monthly_price, 10);

      if (isNaN(employees) || employees <= 0) {
        setFormError("契約社員数は1以上の数値を入力してください。");
        return;
      }
      if (isNaN(price) || price < 0) {
        setFormError("月額料金は0以上の数値を入力してください。");
        return;
      }

      const payload = {
        organization_id: form.organization_id,
        plan_id: form.plan_id,
        contracted_employees: employees,
        monthly_price: price,
        start_date: form.start_date,
        trial_end_date: form.trial_end_date || null,
        notes: form.notes || null,
        status: form.status,
      };

      const { data: newContract, error: insertError } = await getSupabase()
        .from("contracts")
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        setFormError("契約の作成に失敗しました。");
        return;
      }

      // 変更履歴に記録
      if (newContract) {
        const { error: changeError } = await getSupabase()
          .from("contract_changes")
          .insert({
            contract_id: newContract.id,
            changed_by: user?.id ?? null,
            change_type: "created",
            new_values: payload,
            notes: "新規契約作成",
          });
        if (changeError) {
          console.error("変更履歴の記録に失敗:", changeError);
        }
      }

      setDialogOpen(false);
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (contract: Contract, newStatus: string) => {
    if (changingStatusId) return;
    setChangingStatusId(contract.id);
    setStatusError(null);
    try {
      const oldStatus = contract.status;
      const { error: updateError } = await getSupabase()
        .from("contracts")
        .update({ status: newStatus })
        .eq("id", contract.id);

      if (updateError) {
        setStatusError("ステータスの変更に失敗しました。");
        return;
      }

      // 変更履歴に記録
      const changeType =
        newStatus === "cancelled"
          ? "cancelled"
          : newStatus === "suspended"
            ? "suspended"
            : "updated";
      const { error: changeError } = await getSupabase()
        .from("contract_changes")
        .insert({
          contract_id: contract.id,
          changed_by: user?.id ?? null,
          change_type: changeType,
          old_values: { status: oldStatus },
          new_values: { status: newStatus },
          notes: `ステータスを${contractStatusLabels[newStatus] ?? newStatus}に変更`,
        });
      if (changeError) {
        console.error("変更履歴の記録に失敗:", changeError);
      }

      mutate();
    } finally {
      setChangingStatusId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="契約管理"
        description="契約の作成・管理"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            新規契約
          </Button>
        }
      />
      <PageContent>
        <QueryErrorBanner error={error} onRetry={() => mutate()} />
        {statusError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{statusError}</span>
          </div>
        )}

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
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contracts ?? []).map((contract) => (
                <TableRow key={contract.id}>
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
                    <Badge
                      variant={
                        contractStatusColors[contract.status] ?? "outline"
                      }
                    >
                      {contractStatusLabels[contract.status] ?? contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(contract.start_date).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={contract.status}
                      onValueChange={(v) =>
                        v && handleStatusChange(contract, v)
                      }
                      disabled={changingStatusId === contract.id}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">契約中</SelectItem>
                        <SelectItem value="trial">トライアル</SelectItem>
                        <SelectItem value="suspended">停止</SelectItem>
                        <SelectItem value="cancelled">解約</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {contracts && contracts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    契約がありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新規契約作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>企業</Label>
              <Select
                value={form.organization_id}
                onValueChange={(v) =>
                  v && setForm({ ...form, organization_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="企業を選択" />
                </SelectTrigger>
                <SelectContent>
                  {(organizations ?? []).map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>プラン</Label>
              <Select
                value={form.plan_id}
                onValueChange={(v) => v && handlePlanChange(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="プランを選択" />
                </SelectTrigger>
                <SelectContent>
                  {(plans ?? []).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} (¥
                      {formatCurrency(plan.price_monthly)}/月)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>契約社員数</Label>
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
                <Label>月額料金（円）</Label>
                <Input
                  type="number"
                  value={form.monthly_price}
                  onChange={(e) =>
                    setForm({ ...form, monthly_price: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>契約開始日</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </div>
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
                    <SelectItem value="active">契約中</SelectItem>
                    <SelectItem value="trial">トライアル</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.status === "trial" && (
              <div className="space-y-1.5">
                <Label>トライアル終了日</Label>
                <Input
                  type="date"
                  value={form.trial_end_date}
                  onChange={(e) =>
                    setForm({ ...form, trial_end_date: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>備考</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="契約に関する備考..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.organization_id ||
                  !form.plan_id ||
                  !form.contracted_employees ||
                  !form.monthly_price ||
                  !form.start_date
                }
              >
                {saving ? "作成中..." : "作成"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
