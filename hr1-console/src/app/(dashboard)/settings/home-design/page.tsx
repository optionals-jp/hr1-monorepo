"use client";

import { PageHeader, PageContent } from "@/components/layout/page-header";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useHomeDesign,
  SECTION_TYPE_LABELS,
  SECTION_ITEM_FIELDS,
} from "@/lib/hooks/use-home-design";
import { cn } from "@/lib/utils";
import { ChevronDown, Plus, Settings2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types (re-exported for JSX type narrowing)
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomeDesignPage() {
  const h = useHomeDesign();

  if (!h.organization || h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="アプリのホームデザイン"
        description="応募者アプリのホーム画面に表示するタブとコンテンツを設定します"
        sticky={false}
        border={false}
      />

      {h.errorMsg && (
        <div className="mx-4 mt-4 sm:mx-6 md:mx-8 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{h.errorMsg}</span>
          <button
            type="button"
            onClick={() => h.setErrorMsg(null)}
            className="ml-4 shrink-0 text-destructive/70 hover:text-destructive"
          >
            ✕
          </button>
        </div>
      )}

      <StickyFilterBar>
        <div
          role="tablist"
          className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8 bg-white"
        >
          {h.tabs.map((tab) => {
            const isActive = h.selectedTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => h.setSelectedTabId(tab.id)}
                className={cn(
                  "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors flex items-center gap-1.5",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="text-xs text-muted-foreground">{tab.page_sections.length}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
          {h.tabs.length === 0 && (
            <span className="pb-2.5 pt-2 text-sm text-muted-foreground">タブがありません</span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1 pb-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={h.openAddTab}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              タブ追加
            </Button>
            {h.selectedTab && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" />}
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1" />
                  タブ管理
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => h.openEditTab(h.selectedTab!)}>
                    タブ名を編集
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => h.moveTab(h.selectedTab!.id, "up")}
                    disabled={h.tabs.indexOf(h.selectedTab!) === 0}
                  >
                    左へ移動
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => h.moveTab(h.selectedTab!.id, "down")}
                    disabled={h.tabs.indexOf(h.selectedTab!) === h.tabs.length - 1}
                  >
                    右へ移動
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </StickyFilterBar>

      <PageContent>
        <div className="max-w-3xl">
          {!h.selectedTab ? (
            <div className="rounded-lg bg-muted/40 flex items-center justify-center h-40 text-sm text-muted-foreground">
              タブを追加してください
            </div>
          ) : (
            <div className="rounded-lg bg-white border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b">
                <h2 className="text-sm font-semibold">「{h.selectedTab.label}」のセクション</h2>
                <Button variant="outline" size="sm" onClick={h.openAddSection}>
                  セクションを追加
                </Button>
              </div>
              {h.selectedTab.page_sections.length === 0 ? (
                <p className="text-sm text-muted-foreground p-8 text-center">
                  セクションがありません。追加してください。
                </p>
              ) : (
                <ul className="divide-y">
                  {h.selectedTab.page_sections.map((section, idx) => (
                    <li
                      key={section.id}
                      className="group flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors"
                    >
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => h.moveSection(section.id, "up")}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-25 text-xs leading-tight"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => h.moveSection(section.id, "down")}
                          disabled={idx === h.selectedTab!.page_sections.length - 1}
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
                        onClick={() => h.openEditSection(section)}
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
      </PageContent>

      {/* ------------------------------------------------------------------ */}
      {/* Tab Edit Panel                                                      */}
      {/* ------------------------------------------------------------------ */}
      <EditPanel
        open={h.tabPanelOpen}
        onOpenChange={h.setTabPanelOpen}
        title={h.editingTab ? "タブを編集" : "タブを追加"}
        onSave={h.saveTab}
        saving={h.savingTab}
        saveDisabled={!h.editTabLabel.trim()}
        onDelete={h.editingTab ? h.deleteTab : undefined}
        deleteLabel="タブを削除"
        deleting={h.deletingTab}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タブ名 *</Label>
            <Input
              value={h.editTabLabel}
              onChange={(e) => h.setEditTabLabel(e.target.value)}
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
        open={h.sectionPanelOpen}
        onOpenChange={h.setSectionPanelOpen}
        title={h.editingSection ? "セクションを編集" : "セクションを追加"}
        onSave={h.saveSection}
        saving={h.savingSection}
        onDelete={h.editingSection ? h.deleteSection : undefined}
        deleteLabel="セクションを削除"
        deleting={h.deletingSection}
      >
        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <Label>種類 *</Label>
            <Select
              value={h.editSectionType}
              onValueChange={(v) => {
                h.setEditSectionType(v as SectionType);
                h.setEditSectionItems([]);
              }}
              disabled={!!h.editingSection}
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
            {h.editingSection && (
              <p className="text-xs text-muted-foreground">種類は変更できません</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>見出し</Label>
            <Input
              value={h.editSectionTitle}
              onChange={(e) => h.setEditSectionTitle(e.target.value)}
              placeholder="空の場合は見出しを非表示"
            />
          </div>

          {/* Markdown content */}
          {h.editSectionType === "markdown" && (
            <div className="space-y-2">
              <Label>本文</Label>
              <MarkdownEditor
                value={h.editSectionContent}
                onChange={h.setEditSectionContent}
                rows={10}
              />
            </div>
          )}

          {/* jobList: no extra config needed */}
          {h.editSectionType === "jobList" && (
            <p className="text-sm text-muted-foreground rounded-lg bg-slate-50 p-3">
              求人一覧は自動的に表示されます。追加の設定は不要です。
            </p>
          )}

          {/* Item list editor for list-based section types */}
          {SECTION_ITEM_FIELDS[h.editSectionType].length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>アイテム</Label>
                <Button type="button" variant="outline" size="sm" onClick={h.addItem}>
                  + 追加
                </Button>
              </div>

              {h.editSectionItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  アイテムがありません
                </p>
              )}

              {h.editSectionItems.map((item, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-2 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => h.removeItem(index)}
                      className="text-xs text-destructive hover:underline"
                    >
                      削除
                    </button>
                  </div>
                  {SECTION_ITEM_FIELDS[h.editSectionType].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{field.label}</label>
                      {field.multiline ? (
                        <Textarea
                          value={item[field.key] ?? ""}
                          onChange={(e) => h.updateItem(index, field.key, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      ) : (
                        <Input
                          value={item[field.key] ?? ""}
                          onChange={(e) => h.updateItem(index, field.key, e.target.value)}
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
    </div>
  );
}
