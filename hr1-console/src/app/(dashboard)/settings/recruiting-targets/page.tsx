"use client";

import { useState } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { EditPanel } from "@/components/ui/edit-panel";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useDashboard } from "@/lib/hooks/use-dashboard";

const HIRING_TYPES = [
  { key: "new_grad", label: "新卒" },
  { key: "mid_career", label: "中途" },
] as const;

const TARGET_TYPES = [
  { key: "applications", label: "応募数目標" },
  { key: "offers", label: "内定数目標" },
] as const;

type HiringKey = (typeof HIRING_TYPES)[number]["key"];
type TargetKey = (typeof TARGET_TYPES)[number]["key"];
type EditValues = Record<HiringKey, Record<TargetKey, string>>;

function getDisplayValue(
  hiringKey: HiringKey,
  targetKey: TargetKey,
  targets: ReturnType<typeof useDashboard>["targets"]
): number {
  if (!targets) return 0;
  const group = hiringKey === "new_grad" ? targets.newGrad : targets.midCareer;
  return targetKey === "applications" ? group.applicationTarget : group.offerTarget;
}

export default function RecruitingTargetsPage() {
  const { showToast } = useToast();
  const { targets, fiscalYear, saveTarget } = useDashboard();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<EditValues>({
    new_grad: { applications: "", offers: "" },
    mid_career: { applications: "", offers: "" },
  });

  const startEditing = () => {
    setValues({
      new_grad: {
        applications: String(getDisplayValue("new_grad", "applications", targets) || ""),
        offers: String(getDisplayValue("new_grad", "offers", targets) || ""),
      },
      mid_career: {
        applications: String(getDisplayValue("mid_career", "applications", targets) || ""),
        offers: String(getDisplayValue("mid_career", "offers", targets) || ""),
      },
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const ht of HIRING_TYPES) {
        for (const tt of TARGET_TYPES) {
          const v = parseInt(values[ht.key][tt.key] || "0", 10);
          await saveTarget(ht.key, tt.key, isNaN(v) ? 0 : v);
        }
      }
      showToast("採用目標を保存しました");
      setEditing(false);
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="採用目標"
        description={`${fiscalYear}年度の採用目標を設定`}
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="max-w-2xl space-y-4">
          {HIRING_TYPES.map((ht) => (
            <Card key={ht.key}>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">{ht.label}</h2>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    編集
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  {TARGET_TYPES.map((tt) => {
                    const value = getDisplayValue(ht.key, tt.key, targets);
                    return (
                      <div key={tt.key} className="flex justify-between">
                        <span className="text-muted-foreground">{tt.label}</span>
                        <span>{value > 0 ? `${value}人` : "-"}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContent>

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="採用目標を編集"
        onSave={handleSave}
        saving={saving}
      >
        <div className="space-y-6">
          {HIRING_TYPES.map((ht) => (
            <div key={ht.key} className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">{ht.label}</h3>
              {TARGET_TYPES.map((tt) => (
                <div key={tt.key} className="space-y-2">
                  <Label>{tt.label}</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={values[ht.key][tt.key]}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [ht.key]: { ...prev[ht.key], [tt.key]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </EditPanel>
    </>
  );
}
