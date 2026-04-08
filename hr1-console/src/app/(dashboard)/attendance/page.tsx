"use client";

import { useTabParam } from "@/lib/hooks/use-tab-param";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
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
  const [activeTab, setActiveTab] = useTabParam<TabValue>("daily");
  const { organization, employees, departments, projects, settings, mutateSettings } =
    useAttendanceData();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="勤怠管理"
        description="社員の出退勤状況を管理します"
        sticky={false}
        border={false}
      />

      <StickyFilterBar>
        <TabBar
          tabs={tabList}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as TabValue)}
        />
      </StickyFilterBar>

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
