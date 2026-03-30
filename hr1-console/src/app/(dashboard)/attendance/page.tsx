"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { Calendar, Clock, ShieldCheck, FileEdit, Settings2 } from "lucide-react";
import { useAttendanceData } from "@/features/attendance/hooks/use-attendance-data";
import { DailyAttendanceTab } from "@/features/attendance/components/daily-attendance-tab";
import { MonthlySummaryTab } from "@/features/attendance/components/monthly-summary-tab";
import { ApproverSettingsTab } from "@/features/attendance/components/approver-settings-tab";
import { CorrectionRequestsTab } from "@/features/attendance/components/correction-requests-tab";
import { AttendanceSettingsTab } from "@/features/attendance/components/attendance-settings-tab";
import type { TabValue } from "@/features/attendance/types";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "daily", label: "日次勤怠", icon: Calendar },
  { value: "monthly", label: "月次集計", icon: Clock },
  { value: "approvers", label: "承認者設定", icon: ShieldCheck },
  { value: "corrections", label: "修正依頼", icon: FileEdit },
  { value: "settings", label: "勤怠設定", icon: Settings2 },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<TabValue>("daily");
  const { organization, employees, departments, projects, settings, mutateSettings } =
    useAttendanceData();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="勤怠管理"
        description="社員の出退勤状況を管理します"
        sticky={false}
        border={false}
        tabs={
          <div className="flex gap-1 border-b -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
            {tabList.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 pb-2.5 pt-1 text-sm font-medium border-b-2 transition-colors -mb-px",
                    activeTab === t.value
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        }
      />

      {activeTab === "daily" && (
        <DailyAttendanceTab settings={settings ?? null} employees={employees} />
      )}

      {activeTab === "monthly" && <MonthlySummaryTab />}

      {activeTab === "approvers" && organization && (
        <ApproverSettingsTab employees={employees} departments={departments} projects={projects} />
      )}

      {activeTab === "corrections" && <CorrectionRequestsTab />}

      {activeTab === "settings" && organization && (
        <AttendanceSettingsTab
          settings={settings ?? null}
          mutateSettings={mutateSettings}
          organizationId={organization.id}
        />
      )}
    </div>
  );
}
