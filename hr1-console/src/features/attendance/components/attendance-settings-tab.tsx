"use client";

import { useState } from "react";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { upsertAttendanceSettings } from "@/features/attendance/hooks/use-attendance-queries";
import { attendanceStatusLabels, attendanceStatusColors, punchTypeLabels } from "@/lib/constants";
import { Settings2 } from "lucide-react";
import type { AttendanceSettingsRow } from "@/types/database";

interface AttendanceSettingsTabProps {
  settings: AttendanceSettingsRow | null;
  mutateSettings: () => void;
  organizationId: string;
}

export function AttendanceSettingsTab({
  settings,
  mutateSettings,
  organizationId,
}: AttendanceSettingsTabProps) {
  const { showToast } = useToast();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("18:00");
  const [editBreakMinutes, setEditBreakMinutes] = useState("60");
  const [savingSettings, setSavingSettings] = useState(false);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await upsertAttendanceSettings({
        organization_id: organizationId,
        work_start_time: editStartTime,
        work_end_time: editEndTime,
        break_minutes: parseInt(editBreakMinutes, 10) || 60,
      });
      await mutateSettings();
      showToast("設定を保存しました", "success");
      setSettingsDialogOpen(false);
    } catch {
      showToast("設定の保存に失敗しました", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <>
      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <div className="max-w-xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">勤務時間設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">始業時刻</Label>
                  <p className="text-lg font-medium mt-1">{settings?.work_start_time ?? "09:00"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">終業時刻</Label>
                  <p className="text-lg font-medium mt-1">{settings?.work_end_time ?? "18:00"}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">休憩時間</Label>
                <p className="text-lg font-medium mt-1">{settings?.break_minutes ?? 60}分</p>
              </div>
              <Button
                className="mt-2"
                onClick={() => {
                  setEditStartTime(settings?.work_start_time ?? "09:00");
                  setEditEndTime(settings?.work_end_time ?? "18:00");
                  setEditBreakMinutes(String(settings?.break_minutes ?? 60));
                  setSettingsDialogOpen(true);
                }}
              >
                <Settings2 className="h-4 w-4 mr-1.5" />
                設定を変更
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ステータス一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(attendanceStatusLabels).map(([k, v]) => (
                  <Badge key={k} variant={attendanceStatusColors[k] ?? "outline"}>
                    {v}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">打刻種別一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(punchTypeLabels).map(([k, v]) => (
                  <Badge key={k} variant="secondary">
                    {v}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditPanel
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        title="勤務時間設定"
        saving={savingSettings}
        onSave={handleSaveSettings}
      >
        <div className="space-y-4">
          <div>
            <Label>始業時刻</Label>
            <Input
              type="time"
              value={editStartTime}
              onChange={(e) => setEditStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label>終業時刻</Label>
            <Input
              type="time"
              value={editEndTime}
              onChange={(e) => setEditEndTime(e.target.value)}
            />
          </div>
          <div>
            <Label>休憩時間（分）</Label>
            <Input
              type="number"
              min="0"
              max="480"
              value={editBreakMinutes}
              onChange={(e) => setEditBreakMinutes(e.target.value)}
            />
          </div>
        </div>
      </EditPanel>
    </>
  );
}
