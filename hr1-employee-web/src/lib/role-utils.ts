import type { ProfileRole } from "@/types/database";

const EMPLOYEE_ACCESS_ROLES: ProfileRole[] = ["employee", "admin", "manager", "approver"];
const APPROVAL_ROLES: ProfileRole[] = ["admin", "manager", "approver"];
const MANAGEMENT_ROLES: ProfileRole[] = ["admin", "manager"];

export function canAccessEmployeePortal(role: string | null): boolean {
  return EMPLOYEE_ACCESS_ROLES.includes(role as ProfileRole);
}

export function canApproveWorkflows(role: string | null): boolean {
  return APPROVAL_ROLES.includes(role as ProfileRole);
}

export function canManageEvaluations(role: string | null): boolean {
  return MANAGEMENT_ROLES.includes(role as ProfileRole);
}

export const ROLE_LABELS: Record<ProfileRole, string> = {
  admin: "管理者",
  manager: "マネージャー",
  approver: "承認者",
  employee: "社員",
  applicant: "候補者",
  hr1_admin: "HR1運営",
};
