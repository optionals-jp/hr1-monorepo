"use client";

import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditPanel } from "@/components/ui/edit-panel";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";

export default function OrganizationSettingsPage() {
  const h = useOrganizationSettings();

  if (!h.organization || h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.org) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        組織情報が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="組織情報"
        description="企業の基本情報を管理します"
        sticky={false}
        border={false}
      />

      <PageContent>
        <div className="max-w-2xl space-y-4">
          <div className="rounded-lg bg-white border">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">基本情報</h2>
              <Button variant="outline" size="sm" onClick={h.startEditing}>
                編集
              </Button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">組織名</span>
                <span className="font-medium">{h.org.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">業種</span>
                <span>{h.org.industry ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">所在地</span>
                <span>{h.org.location ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">従業員数</span>
                <span>{h.org.employee_count ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">設立年</span>
                <span>{h.org.founded_year ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ウェブサイト</span>
                <span className="truncate max-w-xs">{h.org.website_url ?? "-"}</span>
              </div>
              {h.org.mission && (
                <div className="pt-3 border-t">
                  <p className="text-muted-foreground mb-1">ミッション</p>
                  <p className="whitespace-pre-wrap">{h.org.mission}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContent>

      <EditPanel
        open={h.editing}
        onOpenChange={h.setEditing}
        title="組織情報を編集"
        onSave={h.saveEdit}
        saving={h.saving}
        saveDisabled={!h.editName.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>組織名 *</Label>
            <Input
              value={h.editName}
              onChange={(e) => h.setEditName(e.target.value)}
              placeholder="株式会社〇〇"
            />
          </div>
          <div className="space-y-2">
            <Label>業種</Label>
            <Input
              value={h.editIndustry}
              onChange={(e) => h.setEditIndustry(e.target.value)}
              placeholder="IT・ソフトウェア"
            />
          </div>
          <div className="space-y-2">
            <Label>所在地</Label>
            <Input
              value={h.editLocation}
              onChange={(e) => h.setEditLocation(e.target.value)}
              placeholder="東京都渋谷区"
            />
          </div>
          <div className="space-y-2">
            <Label>従業員数</Label>
            <Input
              value={h.editEmployeeCount}
              onChange={(e) => h.setEditEmployeeCount(e.target.value)}
              placeholder="100〜300名"
            />
          </div>
          <div className="space-y-2">
            <Label>設立年</Label>
            <Input
              value={h.editFoundedYear}
              onChange={(e) => h.setEditFoundedYear(e.target.value)}
              placeholder="2010"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <Label>ウェブサイト</Label>
            <Input
              value={h.editWebsiteUrl}
              onChange={(e) => h.setEditWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>
          <div className="space-y-2">
            <Label>ミッション</Label>
            <Textarea
              value={h.editMission}
              onChange={(e) => h.setEditMission(e.target.value)}
              placeholder="組織のミッションや理念"
              rows={4}
            />
          </div>
        </div>
      </EditPanel>
    </>
  );
}
