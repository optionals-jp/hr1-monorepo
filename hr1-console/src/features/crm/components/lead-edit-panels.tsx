import { Button } from "@hr1/shared-ui/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@hr1/shared-ui/components/ui/dialog";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { leadSourceLabels, activityTypeLabels } from "@/lib/constants/crm";
import type { useCrmLeadDetailPage } from "@/features/crm/hooks/use-crm-lead-detail-page";

type H = ReturnType<typeof useCrmLeadDetailPage>;

export function LeadEditPanel({ h, onUpdate }: { h: H; onUpdate: () => void }) {
  return (
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
          <Input value={h.editContactName} onChange={(e) => h.setEditContactName(e.target.value)} />
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
              {Object.entries(leadSourceLabels).map(([k, l]) => (
                <SelectItem key={k} value={k}>
                  {l}
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
              {(h.employees ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.display_name ?? e.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>メモ</Label>
          <Textarea value={h.editNotes} onChange={(e) => h.setEditNotes(e.target.value)} rows={3} />
        </div>
      </div>
    </EditPanel>
  );
}

export function ActivityEditPanel({ h, onAddActivity }: { h: H; onAddActivity: () => void }) {
  return (
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
              {Object.entries(activityTypeLabels).map(([k, l]) => (
                <SelectItem key={k} value={k}>
                  {l}
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
  );
}

export function ConvertDialog({ h, onConvert }: { h: H; onConvert: () => void }) {
  return (
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
  );
}
