"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import {
  loadPageTabs,
  savePageTab,
  removePageTab,
  swapPageTabOrder,
  savePageSection,
  removePageSection,
  swapPageSectionOrder,
} from "@/lib/hooks/use-settings";

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

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
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

export const SECTION_ITEM_FIELDS: Record<SectionType, ItemField[]> = {
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
// Hook
// ---------------------------------------------------------------------------

export function useHomeDesign() {
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

    const { data, error } = await loadPageTabs(organization.id);

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
      const { data: updated, error } = await savePageTab(editingTab.id, organization!.id, {
        label: editTabLabel.trim(),
      });
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
      const { data, error } = await savePageTab(null, organization!.id, {
        organization_id: organization.id,
        label: editTabLabel.trim(),
        sort_order: maxOrder + 1,
      });
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
    const { error } = await removePageTab(editingTab.id, organization!.id);
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
    await swapPageTabOrder(organization!.id, a.id, a.sort_order, b.id, b.sort_order);
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
      const { data: updated, error } = await savePageSection(editingSection.id, basePayload);

      if (error) {
        setErrorMsg(`保存に失敗しました: ${error.message}`);
        setSavingSection(false);
        return;
      }
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
      const { data: inserted, error } = await savePageSection(null, {
        ...basePayload,
        tab_id: selectedTab.id,
        sort_order: maxOrder + 1,
      });

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
    const { error } = await removePageSection(editingSection.id);
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
    await swapPageSectionOrder(a.id, a.sort_order, b.id, b.sort_order);
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

  return {
    organization,
    tabs,
    loading,
    errorMsg,
    setErrorMsg,
    selectedTabId,
    setSelectedTabId,
    selectedTab,

    // Tab editing
    tabPanelOpen,
    setTabPanelOpen,
    editingTab,
    editTabLabel,
    setEditTabLabel,
    savingTab,
    deletingTab,
    openAddTab,
    openEditTab,
    saveTab,
    deleteTab,
    moveTab,

    // Section editing
    sectionPanelOpen,
    setSectionPanelOpen,
    editingSection,
    editSectionType,
    setEditSectionType,
    editSectionTitle,
    setEditSectionTitle,
    editSectionContent,
    setEditSectionContent,
    editSectionItems,
    setEditSectionItems,
    savingSection,
    deletingSection,
    openAddSection,
    openEditSection,
    saveSection,
    deleteSection,
    moveSection,

    // Item helpers
    addItem,
    updateItem,
    removeItem,
  };
}
