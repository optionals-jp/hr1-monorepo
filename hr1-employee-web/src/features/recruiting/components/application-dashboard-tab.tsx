"use client";

import Link from "next/link";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  applicationStatusLabels as statusLabels,
  stepStatusLabels,
  StepStatus,
} from "@/lib/constants";
import type { Application, ApplicationStep, Profile } from "@/types/database";
import { ApplicationStepList } from "@/features/recruiting/components/application-step-list";
import { ProfileInfoList } from "@/features/recruiting/components/profile-info-list";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { ExternalLink } from "lucide-react";

interface ApplicationDashboardTabProps {
  application: Application;
  profile: Profile;
  steps: ApplicationStep[];
  canActOnStep: (step: ApplicationStep) => boolean;
  advanceStep: (step: ApplicationStep) => void;
  skipStep: (step: ApplicationStep) => void;
  unskipStep: (step: ApplicationStep) => void;
  onViewFormResponses: (step: ApplicationStep) => void;
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
}: ApplicationDashboardTabProps) {
  const completedSteps = steps.filter((s) => s.status === StepStatus.Completed).length;
  const currentStep = steps.find(
    (s) => s.status === StepStatus.InProgress || s.status === StepStatus.Pending
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <SectionCard className="self-start">
        <div className="flex flex-col mb-6">
          <Avatar className="size-24 mb-3">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name ?? ""} />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-700 text-3xl font-semibold">
                {(profile?.display_name ?? profile?.email ?? "?")[0]?.toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <h2 className="text-lg font-semibold">{profile?.display_name ?? "-"}</h2>
          <p className="text-sm text-muted-foreground">{profile?.email ?? "-"}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge>{statusLabels[application.status]}</Badge>
            {profile?.invited_at ? (
              <Badge variant="secondary">招待済み</Badge>
            ) : (
              <Badge variant="outline">未招待</Badge>
            )}
          </div>
          {profile?.id && (
            <Link href={`/applicants/${profile.id}`} className="mt-3">
              <Button variant="outline" size="xs">
                <ExternalLink className="size-3 mr-1" />
                応募者詳細
              </Button>
            </Link>
          )}
        </div>

        <ProfileInfoList profile={profile} />
      </SectionCard>

      <div className="lg:col-span-2 space-y-6">
        <SectionCard>
          <h2 className="text-sm font-semibold mb-3">選考進捗</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: steps.length > 0 ? `${(completedSteps / steps.length) * 100}%` : "0%",
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              {completedSteps}/{steps.length}
            </span>
          </div>
          {currentStep && (
            <p className="text-sm text-muted-foreground mb-4">
              現在のステップ:{" "}
              <span className="font-medium text-foreground">{currentStep.label}</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {stepStatusLabels[currentStep.status] ?? currentStep.status}
              </Badge>
            </p>
          )}
        </SectionCard>

        <SectionCard>
          <h2 className="text-sm font-semibold mb-3">
            選考ステップ
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{steps.length}</span>
          </h2>
          <ApplicationStepList
            steps={steps}
            canActOnStep={canActOnStep}
            advanceStep={advanceStep}
            skipStep={skipStep}
            unskipStep={unskipStep}
            onViewFormResponses={onViewFormResponses}
          />
        </SectionCard>
      </div>
    </div>
  );
}
