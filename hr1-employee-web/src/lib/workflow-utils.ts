import type { WorkflowRequestType, WorkflowRequestStatus } from "@/types/database";
import { Clock, CheckCircle2, XCircle, Ban } from "lucide-react";

export const WORKFLOW_TYPE_LABELS: Record<WorkflowRequestType, string> = {
  paid_leave: "有給休暇",
  overtime: "残業申請",
  business_trip: "出張申請",
  expense: "経費精算",
};

export const WORKFLOW_STATUS_CONFIG: Record<
  WorkflowRequestStatus,
  {
    label: string;
    icon: typeof Clock;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "申請中", icon: Clock, variant: "secondary" },
  approved: { label: "承認済", icon: CheckCircle2, variant: "default" },
  rejected: { label: "却下", icon: XCircle, variant: "destructive" },
  cancelled: { label: "取消", icon: Ban, variant: "outline" },
};
