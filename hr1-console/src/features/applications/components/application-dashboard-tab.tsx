"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applicationStatusLabels as statusLabels, ApplicationStatus } from "@/lib/constants";
import type { Application, ApplicationStep } from "@/types/database";
import type { ApplicationProfile } from "@/features/applications/types";
import { ApplicationStepList } from "@/features/applications/components/application-steps-tab";
import { UserCheck } from "lucide-react";
import { format } from "date-fns";

interface ApplicationDashboardTabProps {
  application: Application;
  profile: ApplicationProfile;
  steps: ApplicationStep[];
  canActOnStep: (step: ApplicationStep) => boolean;
  advanceStep: (step: ApplicationStep) => void;
  skipStep: (step: ApplicationStep) => void;
  unskipStep: (step: ApplicationStep) => void;
  onViewFormResponses: (step: ApplicationStep) => void;
  onConvertDialogOpen: () => void;
}

export function ApplicationDashboardTab({
  application,
  profile,
  steps,
  canActOnStep,
  advanceStep,
  skipStep,
  unskipStep,
  onViewFormResponses,
  onConvertDialogOpen,
}: ApplicationDashboardTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* 応募者情報 */}
      <section>
        <div className="rounded-lg bg-white border">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground">応募者情報</h2>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">名前</span>
              <span className="font-medium">{profile?.display_name ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">メール</span>
              <span>{profile?.email ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">応募日</span>
              <span>{format(new Date(application.applied_at), "yyyy/MM/dd")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ステータス</span>
              <Badge>{statusLabels[application.status]}</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* 選考ステップ概要 */}
      <section>
        <div className="rounded-lg bg-white border">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              選考ステップ
              <span className="ml-1.5 text-xs font-normal">{steps.length}</span>
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <ApplicationStepList
              steps={steps}
              canActOnStep={canActOnStep}
              advanceStep={advanceStep}
              skipStep={skipStep}
              unskipStep={unskipStep}
              onViewFormResponses={onViewFormResponses}
            />
          </div>
        </div>
      </section>

      {/* 入社確定セクション */}
      {application?.status === ApplicationStatus.Offered && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-green-900">内定者を社員として登録</h4>
              <p className="text-xs text-green-700 mt-1">
                この応募者を社員に変換し、社員アプリへのアクセスを許可します
              </p>
            </div>
            <Button onClick={onConvertDialogOpen} className="bg-green-600 hover:bg-green-700">
              <UserCheck className="mr-2 h-4 w-4" />
              入社確定
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
