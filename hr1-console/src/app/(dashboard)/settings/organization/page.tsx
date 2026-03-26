"use client";

import { useEffect, useState } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditPanel } from "@/components/ui/edit-panel";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import type { Organization } from "@/types/database";

export default function OrganizationSettingsPage() {
  const { organization, setOrganization } = useOrg();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMission, setEditMission] = useState("");
  const [editEmployeeCount, setEditEmployeeCount] = useState("");
  const [editFoundedYear, setEditFoundedYear] = useState("");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const { data } = await getSupabase()
      .from("organizations")
      .select("*")
      .eq("id", organization.id)
      .single();
    setOrg(data);
    setLoading(false);
  };

  useEffect(() => {
    if (organization) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const startEditing = () => {
    if (!org) return;
    setEditName(org.name);
    setEditIndustry(org.industry ?? "");
    setEditLocation(org.location ?? "");
    setEditMission(org.mission ?? "");
    setEditEmployeeCount(org.employee_count ?? "");
    setEditFoundedYear(org.founded_year?.toString() ?? "");
    setEditWebsiteUrl(org.website_url ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!org || !editName.trim()) return;
    setSaving(true);

    const foundedYear = editFoundedYear ? parseInt(editFoundedYear, 10) : null;

    const { data } = await getSupabase()
      .from("organizations")
      .update({
        name: editName.trim(),
        industry: editIndustry.trim() || null,
        location: editLocation.trim() || null,
        mission: editMission.trim() || null,
        employee_count: editEmployeeCount.trim() || null,
        founded_year: foundedYear && !isNaN(foundedYear) ? foundedYear : null,
        website_url: editWebsiteUrl.trim() || null,
      })
      .eq("id", org.id)
      .select()
      .single();

    if (data) {
      setOrg(data);
      setOrganization(data);
    }

    setSaving(false);
    setEditing(false);
  };

  if (!organization || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!org) {
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
              <Button variant="outline" size="sm" onClick={startEditing}>
                編集
              </Button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">組織名</span>
                <span className="font-medium">{org.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">業種</span>
                <span>{org.industry ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">所在地</span>
                <span>{org.location ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">従業員数</span>
                <span>{org.employee_count ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">設立年</span>
                <span>{org.founded_year ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ウェブサイト</span>
                <span className="truncate max-w-xs">{org.website_url ?? "-"}</span>
              </div>
              {org.mission && (
                <div className="pt-3 border-t">
                  <p className="text-muted-foreground mb-1">ミッション</p>
                  <p className="whitespace-pre-wrap">{org.mission}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContent>

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="組織情報を編集"
        onSave={saveEdit}
        saving={saving}
        saveDisabled={!editName.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>組織名 *</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="株式会社〇〇"
            />
          </div>
          <div className="space-y-2">
            <Label>業種</Label>
            <Input
              value={editIndustry}
              onChange={(e) => setEditIndustry(e.target.value)}
              placeholder="IT・ソフトウェア"
            />
          </div>
          <div className="space-y-2">
            <Label>所在地</Label>
            <Input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="東京都渋谷区"
            />
          </div>
          <div className="space-y-2">
            <Label>従業員数</Label>
            <Input
              value={editEmployeeCount}
              onChange={(e) => setEditEmployeeCount(e.target.value)}
              placeholder="100〜300名"
            />
          </div>
          <div className="space-y-2">
            <Label>設立年</Label>
            <Input
              value={editFoundedYear}
              onChange={(e) => setEditFoundedYear(e.target.value)}
              placeholder="2010"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <Label>ウェブサイト</Label>
            <Input
              value={editWebsiteUrl}
              onChange={(e) => setEditWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>
          <div className="space-y-2">
            <Label>ミッション</Label>
            <Textarea
              value={editMission}
              onChange={(e) => setEditMission(e.target.value)}
              placeholder="組織のミッションや理念"
              rows={4}
            />
          </div>
        </div>
      </EditPanel>
    </>
  );
}
