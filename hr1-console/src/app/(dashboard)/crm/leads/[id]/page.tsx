"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@hr1/shared-ui/components/ui/dialog";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import {
  leadSourceLabels,
  leadStatusLabels,
  leadStatusColors,
  activityTypeLabels,
} from "@/lib/constants/crm";
import { useCrmLeadDetailPage } from "@/features/crm/hooks/use-crm-lead-detail-page";
import {
  Edit,
  Trash2,
  Plus,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Building2,
  User,
  Target,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const activityIcon = (type: string) => {
  switch (type) {
    case "call":
      return <Phone className="size-4" />;
    case "email":
      return <Mail className="size-4" />;
    case "appointment":
      return <Calendar className="size-4" />;
    case "visit":
      return <MapPin className="size-4" />;
    default:
      return <FileText className="size-4" />;
  }
};

export default function LeadDetailPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useCrmLeadDetailPage();

  const onUpdate = async () => {
    const r = await h.handleUpdate();
    if (r.success) showToast("リードを更新しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onStatusChange = async (s: string) => {
    const r = await h.handleStatusChange(s);
    if (r.success) showToast(`ステータスを「${leadStatusLabels[r.statusLabel!]}」に変更しました`);
    else if (r.error) showToast(r.error, "error");
  };
  const onDelete = async () => {
    const r = await h.handleDelete();
    if (r.success) {
      showToast("リードを削除しました");
      router.push("/crm/leads");
    } else if (r.error) showToast(r.error, "error");
  };
  const onAddActivity = async () => {
    const r = await h.handleAddActivity();
    if (r.success) showToast("活動を記録しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onConvert = async () => {
    const r = await h.handleConvert();
    if (r.success) {
      showToast("リードをコンバートしました");
      router.push(`/crm/companies/${r.companyId}`);
    } else if (r.error) showToast(r.error, "error");
  };

  if (!h.lead)
    return (
      <div className="flex flex-col">
        <PageHeader title="読み込み中..." sticky={false} border={false} />
      </div>
    );

  const { lead, id, activities, employees } = h;
  const isConverted = lead.status === "converted";

  return (
    <div className="flex flex-col">
      <PageHeader
        title={lead.name}
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "リード", href: "/crm/leads" },
          { label: lead.name, href: `/crm/leads/${id}` },
        ]}
        action={
          <div className="flex items-center gap-2">
            {!isConverted && (
              <Button onClick={h.openConvert}>
                <RefreshCw className="size-4 mr-1.5" />
                コンバート
              </Button>
            )}
            <Button variant="outline" onClick={h.openEdit}>
              <Edit className="size-4 mr-1.5" />
              編集
            </Button>
            <Button variant="outline" onClick={() => h.setDeleteOpen(true)}>
              <Trash2 className="size-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 md:px-8 pb-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">企業名</p>
                <p className="font-medium flex items-center gap-1.5 mt-1">
                  <Building2 className="size-4 text-muted-foreground" />
                  {lead.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ステータス</p>
                <Badge variant={leadStatusColors[lead.status] ?? "default"} className="mt-1">
                  {leadStatusLabels[lead.status] ?? lead.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ソース</p>
                <Badge variant="secondary" className="mt-1">
                  {leadSourceLabels[lead.source] ?? lead.source}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">担当者名</p>
                <p className="text-sm mt-1 flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" />
                  {lead.contact_name ?? "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">メール</p>
                {lead.contact_email ? (
                  <a
                    href={`mailto:${lead.contact_email}`}
                    className="text-sm text-blue-600 hover:underline mt-1 flex items-center gap-1.5"
                  >
                    <Mail className="size-3.5" />
                    {lead.contact_email}
                  </a>
                ) : (
                  <p className="text-sm mt-1">{"\u2014"}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">電話</p>
                <p className="text-sm mt-1 flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {lead.contact_phone ?? "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">営業担当</p>
                <p className="text-sm mt-1">
                  {lead.profiles?.display_name ?? lead.profiles?.email ?? "未割当"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">作成日</p>
                <p className="text-sm mt-1">{lead.created_at.slice(0, 10)}</p>
              </div>
              {lead.notes && (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-sm text-muted-foreground">メモ</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!isConverted && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">ステータス変更</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {["new", "contacted", "qualified", "unqualified"].map((status, i) => (
                  <div key={status} className="flex items-center gap-2">
                    {i > 0 && <ArrowRight className="size-4 text-muted-foreground" />}
                    <Button
                      size="sm"
                      variant={lead.status === status ? "default" : "outline"}
                      onClick={() => onStatusChange(status)}
                      disabled={lead.status === status}
                    >
                      {leadStatusLabels[status]}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isConverted && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="size-5 text-green-600" />
                <span className="font-medium text-green-800">コンバート済</span>
                <span className="text-sm text-green-600">{lead.converted_at?.slice(0, 10)}</span>
              </div>
              <div className="flex items-center gap-4">
                {lead.converted_company_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/crm/companies/${lead.converted_company_id}`)}
                  >
                    <Building2 className="size-4 mr-1" />
                    企業を表示
                  </Button>
                )}
                {lead.converted_deal_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/crm/deals/${lead.converted_deal_id}`)}
                  >
                    <Target className="size-4 mr-1" />
                    商談を表示
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">活動履歴</h3>
            <Button size="sm" onClick={() => h.setActOpen(true)}>
              <Plus className="size-4 mr-1" />
              活動を記録
            </Button>
          </div>
          {!activities || activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">活動履歴がありません</p>
          ) : (
            <div className="space-y-2">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                    {activityIcon(act.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{act.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {activityTypeLabels[act.activity_type] ?? act.activity_type}
                      </Badge>
                    </div>
                    {act.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {act.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {act.activity_date?.slice(0, 10) ?? act.created_at.slice(0, 10)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditPanel
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        title="リードを編集"
        onSave={onUpdate}
        saveLabel="更新"
        saveDisabled={!h.editName.trim()}
      >
        <div className="space-y-4">
          <div>
            <Label>企業名 *</Label>
            <Input value={h.editName} onChange={(e) => h.setEditName(e.target.value)} />
          </div>
          <div>
            <Label>担当者名</Label>
            <Input
              value={h.editContactName}
              onChange={(e) => h.setEditContactName(e.target.value)}
            />
          </div>
          <div>
            <Label>メール</Label>
            <Input
              type="email"
              value={h.editContactEmail}
              onChange={(e) => h.setEditContactEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>電話</Label>
            <Input
              value={h.editContactPhone}
              onChange={(e) => h.setEditContactPhone(e.target.value)}
            />
          </div>
          <div>
            <Label>ソース</Label>
            <Select value={h.editSource} onValueChange={(v) => h.setEditSource(v ?? "other")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leadSourceLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>営業担当</Label>
            <Select value={h.editAssignedTo} onValueChange={(v) => h.setEditAssignedTo(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="担当を選択" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.display_name ?? emp.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>メモ</Label>
            <Textarea
              value={h.editNotes}
              onChange={(e) => h.setEditNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </EditPanel>

      <EditPanel
        open={h.actOpen}
        onOpenChange={h.setActOpen}
        title="活動を記録"
        onSave={onAddActivity}
        saveLabel="記録"
        saveDisabled={!h.actTitle.trim()}
      >
        <div className="space-y-4">
          <div>
            <Label>種別</Label>
            <Select value={h.actType} onValueChange={(v) => h.setActType(v ?? "call")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(activityTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>タイトル *</Label>
            <Input value={h.actTitle} onChange={(e) => h.setActTitle(e.target.value)} />
          </div>
          <div>
            <Label>日付</Label>
            <Input type="date" value={h.actDate} onChange={(e) => h.setActDate(e.target.value)} />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea value={h.actDesc} onChange={(e) => h.setActDesc(e.target.value)} rows={3} />
          </div>
        </div>
      </EditPanel>

      <Dialog open={h.convertOpen} onOpenChange={h.setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>リードをコンバート</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              このリードから企業・連絡先を作成します。任意で商談も同時に作成できます。
            </p>
            <div>
              <Label>企業名 *</Label>
              <Input
                value={h.convCompanyName}
                onChange={(e) => h.setConvCompanyName(e.target.value)}
              />
            </div>
            <div>
              <Label>連絡先 姓 *</Label>
              <Input value={h.convLastName} onChange={(e) => h.setConvLastName(e.target.value)} />
            </div>
            <div>
              <Label>メール</Label>
              <Input
                type="email"
                value={h.convEmail}
                onChange={(e) => h.setConvEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>電話</Label>
              <Input value={h.convPhone} onChange={(e) => h.setConvPhone(e.target.value)} />
            </div>
            <div className="pt-2 border-t">
              <Label>商談タイトル（空欄で商談作成をスキップ）</Label>
              <Input
                value={h.convDealTitle}
                onChange={(e) => h.setConvDealTitle(e.target.value)}
                placeholder="例: 初回提案"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setConvertOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={onConvert}
              disabled={h.converting || !h.convCompanyName.trim() || !h.convLastName.trim()}
            >
              {h.converting ? "処理中..." : "コンバート"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={h.deleteOpen}
        onOpenChange={h.setDeleteOpen}
        title="リードを削除"
        description={`「${lead.name}」を削除しますか？この操作は元に戻せません。`}
        onConfirm={onDelete}
        confirmLabel="削除"
        variant="destructive"
      />
    </div>
  );
}
