"use client";

import { useEffect, useState } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import type { SkillMaster } from "@/types/database";
import { Plus, X } from "lucide-react";

export default function SkillsSettingsPage() {
  const { organization } = useOrg();
  const [masters, setMasters] = useState<SkillMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const { data } = await getSupabase()
      .from("skill_masters")
      .select("*")
      .order("category", { nullsFirst: false })
      .order("name");
    setMasters(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (organization) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const handleAdd = async () => {
    if (!organization || !newName.trim()) return;
    setAdding(true);
    await getSupabase()
      .from("skill_masters")
      .insert({
        organization_id: organization.id,
        name: newName.trim(),
        category: newCategory.trim() || null,
      });
    setNewName("");
    setNewCategory("");
    setAdding(false);
    await load();
  };

  const handleDelete = async (master: SkillMaster) => {
    if (!confirm(`「${master.name}」を削除しますか？`)) return;
    await getSupabase().from("skill_masters").delete().eq("id", master.id);
    await load();
  };

  // カテゴリーごとにグループ化
  const grouped = masters.reduce(
    (acc, m) => {
      const cat = m.category ?? "未分類";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    },
    {} as Record<string, SkillMaster[]>
  );

  const categories = Object.keys(grouped).sort((a, b) => {
    if (a === "未分類") return 1;
    if (b === "未分類") return -1;
    return a.localeCompare(b, "ja");
  });

  const existingCategories = [
    ...new Set(masters.map((m) => m.category).filter(Boolean)),
  ] as string[];

  if (!organization || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <>
      <PageHeader title="スキルマスタ" description="社員が選択できるスキルの一覧を管理します" />

      <PageContent>
        <div className="max-w-2xl space-y-6">
          {/* 追加フォーム */}
          <div className="rounded-lg bg-white border p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">スキルを追加</h2>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="スキル名"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="カテゴリ（任意）"
                className="w-48"
                list="skill-categories"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <datalist id="skill-categories">
                {existingCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <Button onClick={handleAdd} disabled={adding || !newName.trim()} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ここで追加したスキルは自社専用です。共通スキルは全企業で共有され、削除できません。
            </p>
          </div>

          {/* カテゴリー別一覧 */}
          {categories.map((category) => (
            <div key={category} className="rounded-lg bg-white border">
              <div className="px-5 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-muted-foreground">{category}</h2>
              </div>
              <div className="px-5 pb-4 space-y-1.5">
                {grouped[category].map((master) => {
                  const isSystem = master.organization_id === null;
                  return (
                    <div
                      key={master.id}
                      className="flex items-center justify-between py-1.5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{master.name}</span>
                        {isSystem && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            共通
                          </Badge>
                        )}
                      </div>
                      {!isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDelete(master)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {masters.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              スキルマスタが登録されていません
            </p>
          )}
        </div>
      </PageContent>
    </>
  );
}
