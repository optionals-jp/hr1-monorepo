"use client";

import { useEffect, useState } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { EditPanel } from "@/components/ui/edit-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionType =
  | "markdown"
  | "jobList"
  | "benefitList"
  | "valueList"
  | "stats"
  | "members"
  | "gallery"
  | "faq";

interface PageSection {
  id: string;
  tab_id: string;
  type: SectionType;
  title: string;
  content: string | null;
  items: Record<string, string>[] | null;
  sort_order: number;
}

interface PageTab {
  id: string;
  organization_id: string;
  label: string;
  sort_order: number;
  page_sections: PageSection[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  markdown: "マークダウン",
  jobList: "求人一覧",
  benefitList: "福利厚生",
  valueList: "カルチャー・バリュー",
  stats: "数値ハイライト",
  members: "メンバー紹介",
  gallery: "ギャラリー",
  faq: "よくある質問",
};

interface ItemField {
  key: string;
  label: string;
  multiline?: boolean;
}

const SECTION_ITEM_FIELDS: Record<SectionType, ItemField[]> = {
  markdown: [],
  jobList: [],
  benefitList: [
    { key: "icon", label: "アイコン（絵文字）" },
    { key: "text", label: "テキスト", multiline: true },
  ],
  valueList: [
    { key: "title", label: "タイトル" },
    { key: "description", label: "説明", multiline: true },
  ],
  stats: [
    { key: "value", label: "数値" },
    { key: "label", label: "ラベル" },
  ],
  members: [
    { key: "name", label: "名前" },
    { key: "role", label: "役職" },
  ],
  gallery: [
    { key: "imageUrl", label: "画像URL" },
    { key: "caption", label: "キャプション" },
  ],
  faq: [
    { key: "question", label: "質問" },
    { key: "answer", label: "回答", multiline: true },
  ],
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomeDesignPage() {
  const { organization } = useOrg();
  const [tabs, setTabs] = useState<PageTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

  // Tab editing state
  const [tabPanelOpen, setTabPanelOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<PageTab | null>(null);
  const [editTabLabel, setEditTabLabel] = useState("");
  const [savingTab, setSavingTab] = useState(false);
  const [deletingTab, setDeletingTab] = useState(false);

  // Section editing state
  const [sectionPanelOpen, setSectionPanelOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [editSectionType, setEditSectionType] = useState<SectionType>("markdown");
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [editSectionContent, setEditSectionContent] = useState("");
  const [editSectionItems, setEditSectionItems] = useState<Record<string, string>[]>([]);
  const [savingSection, setSavingSection] = useState(false);
  const [deletingSection, setDeletingSection] = useState(false);

  const selectedTab = tabs.find((t) => t.id === selectedTabId) ?? null;

  // isInitial=true → full loading spinner; false → silent refresh (panel already closed)
  const load = async (isInitial = false) => {
    if (!organization) return;
    if (isInitial) setLoading(true);

    const { data, error } = await getSupabase()
      .from("page_tabs")
      .select("*, page_sections(*)")
      .eq("organization_id", organization.id)
      .order("sort_order", { ascending: true });

    if (error) {
      setErrorMsg(`データの読み込みに失敗しました: ${error.message}`);
    } else if (data) {
      const mapped = (data as PageTab[]).map((tab) => ({
        ...tab,
        page_sections: (tab.page_sections ?? []).sort((a, b) => a.sort_order - b.sort_order),
      }));
      setTabs(mapped);
      setSelectedTabId((prev) => prev ?? (mapped.length > 0 ? mapped[0].id : null));
    }

    if (isInitial) setLoading(false);
  };

  useEffect(() => {
    if (organization) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  // ---------------------------------------------------------------------------
  // Tab CRUD
  // ---------------------------------------------------------------------------

  const openAddTab = () => {
    setEditingTab(null);
    setEditTabLabel("");
    setTabPanelOpen(true);
  };

  const openEditTab = (tab: PageTab) => {
    setEditingTab(tab);
    setEditTabLabel(tab.label);
    setTabPanelOpen(true);
  };

  const saveTab = async () => {
    if (!organization || !editTabLabel.trim()) return;
    setSavingTab(true);
    setErrorMsg(null);

    if (editingTab) {
      const { data: updated, error } = await getSupabase()
        .from("page_tabs")
        .update({ label: editTabLabel.trim() })
        .eq("id", editingTab.id)
        .select("id");
      if (error) {
        setErrorMsg(`保存に失敗しました: ${error.message}`);
        setSavingTab(false);
        return;
      }
      if (!updated || updated.length === 0) {
        setErrorMsg(
          "保存できませんでした。権限がないか、データが見つかりません。Supabase の RLS ポリシーを確認してください。"
        );
        setSavingTab(false);
        return;
      }
    } else {
      const maxOrder = tabs.length > 0 ? Math.max(...tabs.map((t) => t.sort_order)) : -1;
      const { data, error } = await getSupabase()
        .from("page_tabs")
        .insert({
          organization_id: organization.id,
          label: editTabLabel.trim(),
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      if (error) {
        setErrorMsg(`保存に失敗しました: ${error.message}`);
        setSavingTab(false);
        return;
      }
      if (!data) {
        setErrorMsg("保存できませんでした。Supabase の RLS ポリシーを確認してください。");
        setSavingTab(false);
        return;
      }
      setSelectedTabId((data as PageTab).id);
    }

    setSavingTab(false);
    setTabPanelOpen(false);
    await load();
  };

  const deleteTab = async () => {
    if (!editingTab) return;
    setDeletingTab(true);
    const { error } = await getSupabase().from("page_tabs").delete().eq("id", editingTab.id);
    if (error) {
      setErrorMsg(`削除に失敗しました: ${error.message}`);
      setDeletingTab(false);
      return;
    }
    setDeletingTab(false);
    setTabPanelOpen(false);
    if (selectedTabId === editingTab.id) setSelectedTabId(null);
    await load();
  };

  const moveTab = async (tabId: string, direction: "up" | "down") => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tabs.length) return;

    const a = tabs[idx];
    const b = tabs[swapIdx];
    await Promise.all([
      getSupabase().from("page_tabs").update({ sort_order: b.sort_order }).eq("id", a.id),
      getSupabase().from("page_tabs").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await load();
  };

  // ---------------------------------------------------------------------------
  // Section CRUD
  // ---------------------------------------------------------------------------

  const openAddSection = () => {
    if (!selectedTab) return;
    setEditingSection(null);
    setEditSectionType("markdown");
    setEditSectionTitle("");
    setEditSectionContent("");
    setEditSectionItems([]);
    setSectionPanelOpen(true);
  };

  const openEditSection = (section: PageSection) => {
    setEditingSection(section);
    setEditSectionType(section.type);
    setEditSectionTitle(section.title ?? "");
    setEditSectionContent(section.content ?? "");
    setEditSectionItems(
      (section.items ?? []).map((item) =>
        Object.fromEntries(Object.entries(item).map(([k, v]) => [k, String(v ?? "")]))
      )
    );
    setSectionPanelOpen(true);
  };

  const saveSection = async () => {
    if (!selectedTab) return;
    setSavingSection(true);
    setErrorMsg(null);

    const needsItems = SECTION_ITEM_FIELDS[editSectionType].length > 0;
    const needsContent = editSectionType === "markdown";

    // UPDATE 時は tab_id・sort_order を送らない（変更不要な列は除外）
    const basePayload = {
      type: editSectionType,
      title: editSectionTitle.trim(),
      content: needsContent ? editSectionContent : null,
      items: needsItems ? editSectionItems : null,
    };

    if (editingSection) {
      const { data: updated, error } = await getSupabase()
        .from("page_sections")
        .update(basePayload)
        .eq("id", editingSection.id)
        .select("id");

      if (error) {
        setErrorMsg(`保存に失敗しました: ${error.message}`);
        setSavingSection(false);
        return;
      }
      // 0件 = RLS でブロックされているか、IDが存在しない
      if (!updated || updated.length === 0) {
        setErrorMsg(
          "保存できませんでした。権限がないか、データが見つかりません。Supabase の RLS ポリシーを確認してください。"
        );
        setSavingSection(false);
        return;
      }
    } else {
      const maxOrder =
        selectedTab.page_sections.length > 0
          ? Math.max(...selectedTab.page_sections.map((s) => s.sort_order))
          : -1;
      const { data: inserted, error } = await getSupabase()
        .from("page_sections")
        .insert({ ...basePayload, tab_id: selectedTab.id, sort_order: maxOrder + 1 })
        .select("id");

      if (error) {
        setErrorMsg(`保存に失敗しました: ${error.message}`);
        setSavingSection(false);
        return;
      }
      if (!inserted || inserted.length === 0) {
        setErrorMsg(
          "保存できませんでした。権限がないか、データの挿入に失敗しました。Supabase の RLS ポリシーを確認してください。"
        );
        setSavingSection(false);
        return;
      }
    }

    setSavingSection(false);
    setSectionPanelOpen(false);
    await load();
  };

  const deleteSection = async () => {
    if (!editingSection) return;
    setDeletingSection(true);
    const { error } = await getSupabase()
      .from("page_sections")
      .delete()
      .eq("id", editingSection.id);
    if (error) {
      setErrorMsg(`削除に失敗しました: ${error.message}`);
      setDeletingSection(false);
      return;
    }
    setDeletingSection(false);
    setSectionPanelOpen(false);
    await load();
  };

  const moveSection = async (sectionId: string, direction: "up" | "down") => {
    if (!selectedTab) return;
    const sections = selectedTab.page_sections;
    const idx = sections.findIndex((s) => s.id === sectionId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;

    const a = sections[idx];
    const b = sections[swapIdx];
    await Promise.all([
      getSupabase().from("page_sections").update({ sort_order: b.sort_order }).eq("id", a.id),
      getSupabase().from("page_sections").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await load();
  };

  // ---------------------------------------------------------------------------
  // Item helpers (for list-type sections)
  // ---------------------------------------------------------------------------

  const addItem = () => {
    const fields = SECTION_ITEM_FIELDS[editSectionType];
    const empty = Object.fromEntries(fields.map((f) => [f.key, ""]));
    setEditSectionItems([...editSectionItems, empty]);
  };

  const updateItem = (index: number, key: string, value: string) => {
    setEditSectionItems(
      editSectionItems.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setEditSectionItems(editSectionItems.filter((_, i) => i !== index));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!organization || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="アプリのホームデザイン"
        description="応募者アプリのホーム画面に表示するタブとコンテンツを設定します"
        sticky={false}
        border={false}
      />

      {errorMsg && (
        <div className="mx-4 mt-4 sm:mx-6 md:mx-8 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-4 shrink-0 text-destructive/70 hover:text-destructive"
          >
            ✕
          </button>
        </div>
      )}

      <PageContent>
        <div className="flex gap-4 max-w-4xl min-h-96">
          {/* ---------------------------------------------------------------- */}
          {/* Left panel: Tab list                                             */}
          {/* ---------------------------------------------------------------- */}
          <div className="w-52 shrink-0">
            <div className="rounded-lg bg-white border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="text-sm font-semibold">タブ</h2>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={openAddTab}>
                  + 追加
                </Button>
              </div>
              {tabs.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">タブがありません</p>
              ) : (
                <ul>
                  {tabs.map((tab, idx) => (
                    <li
                      key={tab.id}
                      className={cn(
                        "group flex items-center gap-1 px-3 py-2.5 cursor-pointer border-b last:border-b-0 hover:bg-accent/50 transition-colors",
                        selectedTabId === tab.id && "bg-accent font-medium text-foreground"
                      )}
                      onClick={() => setSelectedTabId(tab.id)}
                    >
                      <span className="flex-1 text-sm truncate">{tab.label}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {tab.page_sections.length}
                      </span>
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveTab(tab.id, "up");
                          }}
                          disabled={idx === 0}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 text-xs"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveTab(tab.id, "down");
                          }}
                          disabled={idx === tabs.length - 1}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 text-xs"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTab(tab);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-foreground text-xs"
                        >
                          ✎
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Right panel: Section list                                        */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex-1 min-w-0">
            {!selectedTab ? (
              <div className="rounded-lg bg-white border flex items-center justify-center h-40 text-sm text-muted-foreground">
                タブを選択してください
              </div>
            ) : (
              <div className="rounded-lg bg-white border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b">
                  <h2 className="text-sm font-semibold">「{selectedTab.label}」のセクション</h2>
                  <Button variant="outline" size="sm" onClick={openAddSection}>
                    セクションを追加
                  </Button>
                </div>
                {selectedTab.page_sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-8 text-center">
                    セクションがありません。追加してください。
                  </p>
                ) : (
                  <ul className="divide-y">
                    {selectedTab.page_sections.map((section, idx) => (
                      <li
                        key={section.id}
                        className="group flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors"
                      >
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveSection(section.id, "up")}
                            disabled={idx === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-25 text-xs leading-tight"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSection(section.id, "down")}
                            disabled={idx === selectedTab.page_sections.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-25 text-xs leading-tight"
                          >
                            ↓
                          </button>
                        </div>

                        {/* Section info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                              {SECTION_TYPE_LABELS[section.type]}
                            </span>
                            {section.title && (
                              <span className="text-sm font-medium truncate">{section.title}</span>
                            )}
                          </div>
                          {section.type === "markdown" && section.content && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {section.content}
                            </p>
                          )}
                          {section.items && section.items.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {section.items.length}件
                            </p>
                          )}
                        </div>

                        {/* Edit button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-7 px-2 text-xs shrink-0"
                          onClick={() => openEditSection(section)}
                        >
                          編集
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </PageContent>

      {/* ------------------------------------------------------------------ */}
      {/* Tab Edit Panel                                                      */}
      {/* ------------------------------------------------------------------ */}
      <EditPanel
        open={tabPanelOpen}
        onOpenChange={setTabPanelOpen}
        title={editingTab ? "タブを編集" : "タブを追加"}
        onSave={saveTab}
        saving={savingTab}
        saveDisabled={!editTabLabel.trim()}
        onDelete={editingTab ? deleteTab : undefined}
        deleteLabel="タブを削除"
        deleting={deletingTab}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タブ名 *</Label>
            <Input
              value={editTabLabel}
              onChange={(e) => setEditTabLabel(e.target.value)}
              placeholder="例：概要、働く環境、採用情報"
              autoFocus
            />
          </div>
        </div>
      </EditPanel>

      {/* ------------------------------------------------------------------ */}
      {/* Section Edit Panel                                                  */}
      {/* ------------------------------------------------------------------ */}
      <EditPanel
        open={sectionPanelOpen}
        onOpenChange={setSectionPanelOpen}
        title={editingSection ? "セクションを編集" : "セクションを追加"}
        onSave={saveSection}
        saving={savingSection}
        onDelete={editingSection ? deleteSection : undefined}
        deleteLabel="セクションを削除"
        deleting={deletingSection}
      >
        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <Label>種類 *</Label>
            <Select
              value={editSectionType}
              onValueChange={(v) => {
                setEditSectionType(v as SectionType);
                setEditSectionItems([]);
              }}
              disabled={!!editingSection}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SECTION_TYPE_LABELS) as [SectionType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {editingSection && (
              <p className="text-xs text-muted-foreground">種類は変更できません</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>見出し</Label>
            <Input
              value={editSectionTitle}
              onChange={(e) => setEditSectionTitle(e.target.value)}
              placeholder="空の場合は見出しを非表示"
            />
          </div>

          {/* Markdown content */}
          {editSectionType === "markdown" && (
            <div className="space-y-2">
              <Label>本文</Label>
              <MarkdownEditor
                value={editSectionContent}
                onChange={setEditSectionContent}
                rows={10}
              />
            </div>
          )}

          {/* jobList: no extra config needed */}
          {editSectionType === "jobList" && (
            <p className="text-sm text-muted-foreground rounded-lg bg-slate-50 p-3">
              求人一覧は自動的に表示されます。追加の設定は不要です。
            </p>
          )}

          {/* Item list editor for list-based section types */}
          {SECTION_ITEM_FIELDS[editSectionType].length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>アイテム</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  + 追加
                </Button>
              </div>

              {editSectionItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  アイテムがありません
                </p>
              )}

              {editSectionItems.map((item, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-2 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-xs text-destructive hover:underline"
                    >
                      削除
                    </button>
                  </div>
                  {SECTION_ITEM_FIELDS[editSectionType].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{field.label}</label>
                      {field.multiline ? (
                        <Textarea
                          value={item[field.key] ?? ""}
                          onChange={(e) => updateItem(index, field.key, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      ) : (
                        <Input
                          value={item[field.key] ?? ""}
                          onChange={(e) => updateItem(index, field.key, e.target.value)}
                          className="text-sm h-8"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </EditPanel>
    </>
  );
}
