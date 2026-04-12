"use client";

import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { useCrmReportsPage, type ReportTab } from "@/features/crm/hooks/use-crm-reports-page";
import { WinLossTab, PerformanceTab, PipelineTab } from "@/features/crm/components/report-tabs";

export default function ReportsPage() {
  const h = useCrmReportsPage();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="レポート"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM", href: "/crm/dashboard" }]}
        action={
          <Select value={h.period} onValueChange={(v) => h.setPeriod(v ?? "6m")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">直近3ヶ月</SelectItem>
              <SelectItem value="6m">直近6ヶ月</SelectItem>
              <SelectItem value="12m">直近1年</SelectItem>
              <SelectItem value="all">全期間</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <div className="px-4 sm:px-6 md:px-8 pb-6 space-y-6">
        <TabBar
          tabs={[
            { value: "winloss", label: "受注・失注分析" },
            { value: "performance", label: "担当者パフォーマンス" },
            { value: "pipeline", label: "パイプライン分析" },
          ]}
          activeTab={h.activeTab}
          onTabChange={(v) => h.setActiveTab(v as ReportTab)}
        />
        {h.activeTab === "winloss" && <WinLossTab h={h} />}
        {h.activeTab === "performance" && <PerformanceTab h={h} />}
        {h.activeTab === "pipeline" && <PipelineTab h={h} />}
      </div>
    </div>
  );
}
