"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useEmployees } from "@/lib/hooks/use-org-query";
import {
  fetchActivitiesByLead,
  fetchLead,
  createActivity,
  createDeal,
  createContact,
  createCompany,
  updateLead,
  deleteLead,
} from "@/lib/repositories/crm-repository";
import {
  leadSourceLabels,
  leadStatusLabels,
  leadStatusColors,
  activityTypeLabels,
} from "@/lib/constants/crm";
import type { BcLead, BcActivity } from "@/types/database";
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

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: employees } = useEmployees();

  const { data: lead, mutate: mutateLead } = useOrgQuery<BcLead | null>(`crm-lead-${id}`, (orgId) =>
    fetchLead(getSupabase(), id, orgId)
  );

  const { data: activities, mutate: mutateActivities } = useOrgQuery<BcActivity[]>(
    `crm-lead-activities-${id}`,
    (orgId) => fetchActivitiesByLead(getSupabase(), id, orgId)
  );

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Activity state
  const [actOpen, setActOpen] = useState(false);
  const [actType, setActType] = useState("call");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actDate, setActDate] = useState(new Date().toISOString().slice(0, 10));

  // Convert state
  const [convertOpen, setConvertOpen] = useState(false);
  const [convCompanyName, setConvCompanyName] = useState("");
  const [convLastName, setConvLastName] = useState("");
  const [convEmail, setConvEmail] = useState("");
  const [convPhone, setConvPhone] = useState("");
  const [convDealTitle, setConvDealTitle] = useState("");
  const [converting, setConverting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const openEdit = () => {
    if (!lead) return;
    setEditName(lead.name);
    setEditContactName(lead.contact_name ?? "");
    setEditContactEmail(lead.contact_email ?? "");
    setEditContactPhone(lead.contact_phone ?? "");
    setEditSource(lead.source);
    setEditAssignedTo(lead.assigned_to ?? "");
    setEditNotes(lead.notes ?? "");
    setEditOpen(true);
  };

  const openConvert = () => {
    if (!lead) return;
    setConvCompanyName(lead.name);
    setConvLastName(lead.contact_name ?? "");
    setConvEmail(lead.contact_email ?? "");
    setConvPhone(lead.contact_phone ?? "");
    setConvDealTitle("");
    setConvertOpen(true);
  };

  const handleUpdate = async () => {
    if (!organization || !id) return;
    try {
      await updateLead(getSupabase(), id, organization.id, {
        name: editName,
        contact_name: editContactName || null,
        contact_email: editContactEmail || null,
        contact_phone: editContactPhone || null,
        source: editSource as BcLead["source"],
        assigned_to: editAssignedTo || null,
        notes: editNotes || null,
      });
      setEditOpen(false);
      mutateLead();
      showToast("リードを更新しました");
    } catch {
      showToast("更新に失敗しました", "error");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!organization || !id) return;
    try {
      await updateLead(getSupabase(), id, organization.id, {
        status: newStatus as BcLead["status"],
      });
      mutateLead();
      showToast(`ステータスを「${leadStatusLabels[newStatus]}」に変更しました`);
    } catch {
      showToast("ステータス変更に失敗しました", "error");
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    try {
      await deleteLead(getSupabase(), id, organization.id);
      showToast("リードを削除しました");
      router.push("/crm/leads");
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  const handleAddActivity = async () => {
    if (!organization || !actTitle.trim()) return;
    try {
      await createActivity(getSupabase(), {
        organization_id: organization.id,
        lead_id: id,
        activity_type: actType,
        title: actTitle,
        description: actDesc || null,
        activity_date: actDate,
        created_by: user?.id ?? null,
      });
      setActOpen(false);
      setActTitle("");
      setActDesc("");
      setActType("call");
      mutateActivities();
      showToast("活動を記録しました");
    } catch {
      showToast("記録に失敗しました", "error");
    }
  };

  const handleConvert = async () => {
    if (!organization || !convCompanyName.trim() || !convLastName.trim()) {
      showToast("企業名と担当者姓は必須です", "error");
      return;
    }
    setConverting(true);
    try {
      // 1. Create company
      const newCompany = await createCompany(getSupabase(), {
        organization_id: organization.id,
        name: convCompanyName,
        phone: convPhone || null,
        created_by: user?.id ?? null,
      });

      // 2. Create contact
      const newContact = await createContact(getSupabase(), {
        organization_id: organization.id,
        company_id: newCompany.id,
        last_name: convLastName,
        email: convEmail || null,
        phone: convPhone || null,
        created_by: user?.id ?? null,
      });

      // 3. Optionally create deal
      let newDealId: string | null = null;
      if (convDealTitle.trim()) {
        const newDeal = await createDeal(getSupabase(), {
          organization_id: organization.id,
          title: convDealTitle,
          company_id: newCompany.id,
          contact_id: newContact.id,
          assigned_to: lead?.assigned_to ?? user?.id ?? null,
          created_by: user?.id ?? null,
        });
        newDealId = newDeal.id;
      }

      // 4. Update lead as converted
      await updateLead(getSupabase(), id, organization.id, {
        status: "converted",
        converted_company_id: newCompany.id,
        converted_contact_id: newContact.id,
        converted_deal_id: newDealId,
        converted_at: new Date().toISOString(),
      });

      setConvertOpen(false);
      showToast("リードをコンバートしました");
      router.push(`/crm/companies/${newCompany.id}`);
    } catch {
      showToast("コンバートに失敗しました", "error");
    } finally {
      setConverting(false);
    }
  };

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

  if (!lead) {
    return (
      <div className="flex flex-col">
        <PageHeader title="読み込み中..." sticky={false} border={false} />
      </div>
    );
  }

  const isConverted = lead.status === "converted";
  const statusFlow = ["new", "contacted", "qualified", "unqualified"];

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
              <Button onClick={openConvert}>
                <RefreshCw className="size-4 mr-1.5" />
                コンバート
              </Button>
            )}
            <Button variant="outline" onClick={openEdit}>
              <Edit className="size-4 mr-1.5" />
              編集
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 md:px-8 pb-6 space-y-6">
        {/* Lead Info */}
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
                  {lead.contact_name ?? "—"}
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
                  <p className="text-sm mt-1">—</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">電話</p>
                <p className="text-sm mt-1 flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {lead.contact_phone ?? "—"}
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

        {/* Status Quick Actions */}
        {!isConverted && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">ステータス変更</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {statusFlow.map((status, i) => (
                  <div key={status} className="flex items-center gap-2">
                    {i > 0 && <ArrowRight className="size-4 text-muted-foreground" />}
                    <Button
                      size="sm"
                      variant={lead.status === status ? "default" : "outline"}
                      onClick={() => handleStatusChange(status)}
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

        {/* Converted Info */}
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

        {/* Activities */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">活動履歴</h3>
            <Button size="sm" onClick={() => setActOpen(true)}>
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

      {/* Edit Panel */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="リードを編集"
        onSave={handleUpdate}
        saveLabel="更新"
        saveDisabled={!editName.trim()}
      >
        <div className="space-y-4">
          <div>
            <Label>企業名 *</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <Label>担当者名</Label>
            <Input value={editContactName} onChange={(e) => setEditContactName(e.target.value)} />
          </div>
          <div>
            <Label>メール</Label>
            <Input
              type="email"
              value={editContactEmail}
              onChange={(e) => setEditContactEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>電話</Label>
            <Input value={editContactPhone} onChange={(e) => setEditContactPhone(e.target.value)} />
          </div>
          <div>
            <Label>ソース</Label>
            <Select value={editSource} onValueChange={(v) => setEditSource(v ?? "other")}>
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
            <Select value={editAssignedTo} onValueChange={(v) => setEditAssignedTo(v ?? "")}>
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
            <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
          </div>
        </div>
      </EditPanel>

      {/* Add Activity Panel */}
      <EditPanel
        open={actOpen}
        onOpenChange={setActOpen}
        title="活動を記録"
        onSave={handleAddActivity}
        saveLabel="記録"
        saveDisabled={!actTitle.trim()}
      >
        <div className="space-y-4">
          <div>
            <Label>種別</Label>
            <Select value={actType} onValueChange={(v) => setActType(v ?? "call")}>
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
            <Input value={actTitle} onChange={(e) => setActTitle(e.target.value)} />
          </div>
          <div>
            <Label>日付</Label>
            <Input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea value={actDesc} onChange={(e) => setActDesc(e.target.value)} rows={3} />
          </div>
        </div>
      </EditPanel>

      {/* Convert Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
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
              <Input value={convCompanyName} onChange={(e) => setConvCompanyName(e.target.value)} />
            </div>
            <div>
              <Label>連絡先 姓 *</Label>
              <Input value={convLastName} onChange={(e) => setConvLastName(e.target.value)} />
            </div>
            <div>
              <Label>メール</Label>
              <Input
                type="email"
                value={convEmail}
                onChange={(e) => setConvEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>電話</Label>
              <Input value={convPhone} onChange={(e) => setConvPhone(e.target.value)} />
            </div>
            <div className="pt-2 border-t">
              <Label>商談タイトル（空欄で商談作成をスキップ）</Label>
              <Input
                value={convDealTitle}
                onChange={(e) => setConvDealTitle(e.target.value)}
                placeholder="例: 初回提案"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleConvert}
              disabled={converting || !convCompanyName.trim() || !convLastName.trim()}
            >
              {converting ? "処理中..." : "コンバート"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="リードを削除"
        description={`「${lead.name}」を削除しますか？この操作は元に戻せません。`}
        onConfirm={handleDelete}
        confirmLabel="削除"
        variant="destructive"
      />
    </div>
  );
}
