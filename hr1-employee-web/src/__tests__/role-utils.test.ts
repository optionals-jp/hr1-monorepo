import { describe, it, expect } from "vitest";
import {
  canAccessEmployeePortal,
  canApproveWorkflows,
  canManageEvaluations,
  ROLE_LABELS,
} from "@/lib/role-utils";
import type { ProfileRole } from "@/types/database";

describe("canAccessEmployeePortal", () => {
  it.each(["admin", "manager", "approver", "employee"] as const)(
    "%s ロールはアクセス可能",
    (role) => {
      expect(canAccessEmployeePortal(role)).toBe(true);
    }
  );

  it("applicant ロールはアクセス不可", () => {
    expect(canAccessEmployeePortal("applicant")).toBe(false);
  });

  it("null はアクセス不可", () => {
    expect(canAccessEmployeePortal(null)).toBe(false);
  });

  it("不正な文字列はアクセス不可", () => {
    expect(canAccessEmployeePortal("unknown")).toBe(false);
  });
});

describe("canApproveWorkflows", () => {
  it.each(["admin", "manager", "approver"] as const)("%s ロールは承認可能", (role) => {
    expect(canApproveWorkflows(role)).toBe(true);
  });

  it.each(["employee", "applicant"] as const)("%s ロールは承認不可", (role) => {
    expect(canApproveWorkflows(role)).toBe(false);
  });

  it("null は承認不可", () => {
    expect(canApproveWorkflows(null)).toBe(false);
  });
});

describe("canManageEvaluations", () => {
  it.each(["admin", "manager"] as const)("%s ロールは評価管理可能", (role) => {
    expect(canManageEvaluations(role)).toBe(true);
  });

  it.each(["employee", "applicant", "approver"] as const)("%s ロールは評価管理不可", (role) => {
    expect(canManageEvaluations(role)).toBe(false);
  });

  it("null は評価管理不可", () => {
    expect(canManageEvaluations(null)).toBe(false);
  });
});

describe("ROLE_LABELS", () => {
  const allRoles: ProfileRole[] = ["admin", "manager", "approver", "employee", "applicant"];

  it("全てのロールにラベルが定義されている", () => {
    for (const role of allRoles) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  it("各ラベルが正しい日本語", () => {
    expect(ROLE_LABELS.admin).toBe("管理者");
    expect(ROLE_LABELS.manager).toBe("マネージャー");
    expect(ROLE_LABELS.approver).toBe("承認者");
    expect(ROLE_LABELS.employee).toBe("社員");
    expect(ROLE_LABELS.applicant).toBe("候補者");
  });
});
