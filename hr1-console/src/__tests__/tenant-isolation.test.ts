import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const RUN_ISOLATION_TESTS = !!process.env.RUN_TENANT_ISOLATION_TESTS;

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";
const EMPLOYEE_EMAIL = process.env.TEST_EMPLOYEE_EMAIL ?? "";
const EMPLOYEE_PASSWORD = process.env.TEST_EMPLOYEE_PASSWORD ?? "";
const APPLICANT_EMAIL = process.env.TEST_APPLICANT_EMAIL ?? "";
const APPLICANT_PASSWORD = process.env.TEST_APPLICANT_PASSWORD ?? "";

const ORG_001 = "org-001";
const ORG_002 = "org-002";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAs(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(`Login failed for ${email}: ${error?.message}`);
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  });
}

function precondition(ok: boolean, msg: string): asserts ok {
  if (!ok) throw new Error(`Precondition failed: ${msg}`);
}

async function selectFrom(
  client: SupabaseClient,
  table: string,
  columns: string,
  filter?: { column: string; value: string }
) {
  let q = client.from(table).select(columns).limit(200);
  if (filter) q = q.eq(filter.column, filter.value);
  const { data, error } = await q;
  expect(error).toBeNull();
  return data!;
}

async function getUserId(client: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  precondition(!!user, "user must be authenticated");
  return user!.id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skipIf(!RUN_ISOLATION_TESTS)("Multi-tenant data isolation", () => {
  let adminClient: SupabaseClient;
  let employeeClient: SupabaseClient;
  let applicantClient: SupabaseClient;
  let employeeUserId: string;
  let employeeOrgIds: Set<string>;

  beforeAll(async () => {
    adminClient = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    employeeClient = await loginAs(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);
    applicantClient = await loginAs(APPLICANT_EMAIL, APPLICANT_PASSWORD);

    employeeUserId = await getUserId(employeeClient);

    const orgs = await selectFrom(employeeClient, "user_organizations", "organization_id");
    employeeOrgIds = new Set(orgs.map((o) => o.organization_id));

    precondition(employeeOrgIds.has(ORG_001), "employee must belong to org-001");
    precondition(
      !employeeOrgIds.has(ORG_002),
      "employee must NOT belong to org-002 for isolation tests to be valid"
    );
  }, 30_000);

  // ================================================================
  // 1. Organization read isolation (employee perspective)
  // ================================================================

  describe("1. Organization read isolation (employee perspective)", () => {
    const orgTables = [
      "jobs",
      "departments",
      "interviews",
      "evaluation_cycles",
      "message_threads",
      "projects",
    ] as const;

    for (const table of orgTables) {
      test(`${table}: employee sees own-org data (>0 rows)`, async () => {
        const rows = await selectFrom(employeeClient, table, "organization_id");
        precondition(rows.length > 0, `no ${table} found for employee. Seed data is required.`);
        for (const row of rows) {
          expect(employeeOrgIds.has(row.organization_id)).toBe(true);
        }
      });

      test(`${table}: employee cannot see org-002 data`, async () => {
        expect(employeeOrgIds.has(ORG_002)).toBe(false);
        const rows = await selectFrom(employeeClient, table, "organization_id", {
          column: "organization_id",
          value: ORG_002,
        });
        expect(rows).toEqual([]);
      });
    }
  });

  // ================================================================
  // 2. Own-data isolation (employee perspective)
  // ================================================================

  describe("2. Own-data isolation (employee perspective)", () => {
    const ownDataTables = [
      "attendance_records",
      "payslips",
      "workflow_requests",
      "notifications",
      "push_tokens",
      "employee_tasks",
    ] as const;

    for (const table of ownDataTables) {
      test(`${table}: employee only sees own records`, async () => {
        const rows = await selectFrom(employeeClient, table, "user_id");
        precondition(rows.length > 0, `no ${table} found for employee. Seed data is required.`);
        for (const row of rows) {
          expect(row.user_id).toBe(employeeUserId);
        }
      });
    }
  });

  // ================================================================
  // 3. Role isolation (applicant perspective)
  // ================================================================

  describe("3. Role isolation (applicant perspective)", () => {
    const forbiddenTables = [
      "attendance_records",
      "payslips",
      "audit_logs",
      "workflow_requests",
      "evaluations",
    ] as const;

    for (const table of forbiddenTables) {
      test(`applicant cannot read ${table}`, async () => {
        const rows = await selectFrom(applicantClient, table, "id");
        expect(rows).toEqual([]);
      });
    }

    test("applicant can only see own applications", async () => {
      const applicantUserId = await getUserId(applicantClient);
      const rows = await selectFrom(applicantClient, "applications", "applicant_id");
      precondition(rows.length > 0, "no applications found for applicant. Seed data is required.");
      for (const row of rows) {
        expect(row.applicant_id).toBe(applicantUserId);
      }
    });
  });

  // ================================================================
  // 4. Direct ID guessing attacks
  // ================================================================

  describe("4. Direct ID guessing attacks", () => {
    test("employee cannot fetch a job from org-002 by ID", async () => {
      const adminRows = await selectFrom(adminClient, "jobs", "id", {
        column: "organization_id",
        value: ORG_002,
      });
      precondition(adminRows.length > 0, "no jobs in org-002. Seed data is required.");
      const targetId = adminRows[0].id;

      const rows = await selectFrom(employeeClient, "jobs", "id");
      const ids = rows.map((r) => r.id);
      expect(ids).not.toContain(targetId);
    });

    test("employee cannot fetch a profile from org-002 by ID", async () => {
      // profiles の組織メンバーシップは user_organizations 経由で解決
      const adminRows = await selectFrom(adminClient, "user_organizations", "user_id", {
        column: "organization_id",
        value: ORG_002,
      });
      precondition(adminRows.length > 0, "no profiles in org-002. Seed data is required.");
      const targetId = adminRows[0].user_id;

      const { data, error } = await employeeClient.from("profiles").select("id").eq("id", targetId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("employee cannot fetch a payslip from another user by ID", async () => {
      const adminRows = await selectFrom(adminClient, "payslips", "id, user_id");
      const otherPayslip = adminRows.find((r) => r.user_id !== employeeUserId);
      precondition(!!otherPayslip, "no payslips from other users. Seed data is required.");

      const { data, error } = await employeeClient
        .from("payslips")
        .select("id")
        .eq("id", otherPayslip.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("employee cannot fetch an attendance_record from another user by ID", async () => {
      const adminRows = await selectFrom(adminClient, "attendance_records", "id, user_id");
      const otherRecord = adminRows.find((r) => r.user_id !== employeeUserId);
      precondition(!!otherRecord, "no attendance_records from other users. Seed data is required.");

      const { data, error } = await employeeClient
        .from("attendance_records")
        .select("id")
        .eq("id", otherRecord.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("employee cannot fetch a notification from another user by ID", async () => {
      const adminRows = await selectFrom(adminClient, "notifications", "id, user_id");
      const otherNotification = adminRows.find((r) => r.user_id !== employeeUserId);
      precondition(
        !!otherNotification,
        "no notifications from other users. Seed data is required."
      );

      const { data, error } = await employeeClient
        .from("notifications")
        .select("id")
        .eq("id", otherNotification.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  // ================================================================
  // 5. Write protection
  // ================================================================

  describe("5. Write protection", () => {
    test("employee cannot insert a job into org-002", async () => {
      const { error } = await employeeClient.from("jobs").insert({
        organization_id: ORG_002,
        title: "RLS bypass test",
        description: "Should fail",
        status: "draft",
      });
      expect(error).toBeTruthy();
    });

    test("employee cannot insert attendance_record into org-002", async () => {
      const { error } = await employeeClient.from("attendance_records").insert({
        user_id: employeeUserId,
        organization_id: ORG_002,
        date: "2099-12-31",
        status: "present",
      });
      expect(error).toBeTruthy();
    });

    test("employee cannot insert workflow_request into org-002", async () => {
      const { error } = await employeeClient.from("workflow_requests").insert({
        organization_id: ORG_002,
        user_id: employeeUserId,
        request_type: "paid_leave",
        reason: "RLS bypass test",
        request_data: {},
      });
      expect(error).toBeTruthy();
    });

    test("employee cannot update a job in org-002", async () => {
      const adminRows = await selectFrom(adminClient, "jobs", "id", {
        column: "organization_id",
        value: ORG_002,
      });
      precondition(
        adminRows.length > 0,
        "no jobs in org-002 for update test. Seed data is required."
      );

      const { data } = await employeeClient
        .from("jobs")
        .update({ title: "hacked" })
        .eq("id", adminRows[0].id)
        .select("id");
      expect(data ?? []).toEqual([]);
    });

    test("employee cannot delete a job in org-002", async () => {
      const adminRows = await selectFrom(adminClient, "jobs", "id", {
        column: "organization_id",
        value: ORG_002,
      });
      precondition(
        adminRows.length > 0,
        "no jobs in org-002 for delete test. Seed data is required."
      );

      const { data } = await employeeClient
        .from("jobs")
        .delete()
        .eq("id", adminRows[0].id)
        .select("id");
      expect(data ?? []).toEqual([]);
    });

    test("applicant cannot insert into evaluation_cycles", async () => {
      const { error } = await applicantClient.from("evaluation_cycles").insert({
        organization_id: ORG_001,
        title: "Fake cycle",
        template_id: "00000000-0000-0000-0000-000000000000",
        status: "draft",
        start_date: "2099-01-01",
        end_date: "2099-12-31",
      });
      expect(error).toBeTruthy();
    });
  });

  // ================================================================
  // 6. Audit log immutability
  // ================================================================

  describe("6. Audit log immutability", () => {
    test("admin can read audit logs (>0 rows)", async () => {
      const rows = await selectFrom(adminClient, "audit_logs", "id");
      precondition(rows.length > 0, "no audit_logs found. Seed data is required.");
    });

    test("admin cannot UPDATE audit_logs", async () => {
      const rows = await selectFrom(adminClient, "audit_logs", "id");
      precondition(rows.length > 0, "no audit_logs for update test");

      const { error } = await adminClient
        .from("audit_logs")
        .update({ action: "hacked" })
        .eq("id", rows[0].id);
      expect(error).toBeTruthy();
    });

    test("admin cannot DELETE audit_logs", async () => {
      const rows = await selectFrom(adminClient, "audit_logs", "id");
      precondition(rows.length > 0, "no audit_logs for delete test");

      const { data, error } = await adminClient
        .from("audit_logs")
        .delete()
        .eq("id", rows[0].id)
        .select("id");

      const deleted = data?.length ?? 0;
      if (error) {
        expect(error).toBeTruthy();
      } else {
        expect(deleted).toBe(0);
      }
    });

    test("employee cannot read audit_logs", async () => {
      const rows = await selectFrom(employeeClient, "audit_logs", "id");
      expect(rows).toEqual([]);
    });

    test("employee cannot insert into audit_logs", async () => {
      const { error } = await employeeClient.from("audit_logs").insert({
        organization_id: ORG_001,
        user_id: employeeUserId,
        action: "create",
        table_name: "fake",
        record_id: "fake-id",
        changes: {},
      });
      expect(error).toBeTruthy();
    });
  });

  // ================================================================
  // 7. Sensitive data protection
  // ================================================================

  describe("7. Sensitive data protection", () => {
    test("employee cannot access profiles from org-002", async () => {
      const rows = await selectFrom(employeeClient, "profiles", "id, phone, address, birth_date", {
        column: "organization_id",
        value: ORG_002,
      });
      expect(rows).toEqual([]);
    });

    test("employee cannot read another user's notification content", async () => {
      const adminRows = await selectFrom(adminClient, "notifications", "id, user_id, title");
      const otherNotification = adminRows.find((r) => r.user_id !== employeeUserId);
      precondition(
        !!otherNotification,
        "no notifications from other users. Seed data is required."
      );

      const { data, error } = await employeeClient
        .from("notifications")
        .select("id, title")
        .eq("id", otherNotification.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });
});
