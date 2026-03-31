import { describe, it, expect, beforeEach } from "vitest";
import { fetchJobDetail, fetchTaskDetail } from "@/lib/repositories/job-repository";

// ---------------------------------------------------------------------------
// Supabase クライアントモック
//
// 各 .from() 呼び出しごとに独立した QueryRecorder を生成し、
// Promise.all で並列実行されてもテーブル名が競合しない。
// ---------------------------------------------------------------------------

interface EqCall {
  column: string;
  value: unknown;
}

interface QueryRecord {
  table: string;
  eqCalls: EqCall[];
}

function createMockClient() {
  const queries: QueryRecord[] = [];

  const client = {
    from(table: string) {
      const record: QueryRecord = { table, eqCalls: [] };
      queries.push(record);

      const chain: Record<string, unknown> = {};
      const self = () => chain;

      chain.select = self;
      chain.order = self;
      chain.limit = self;
      chain.eq = (col: string, val: unknown) => {
        record.eqCalls.push({ column: col, value: val });
        return chain;
      };
      chain.single = () => Promise.resolve({ data: null, error: null });
      chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
      chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

      return chain;
    },
  };

  return { client: client as never, queries };
}

/** 指定テーブルの全クエリから .eq() 呼び出しを取得 */
function eqCallsFor(queries: QueryRecord[], table: string): EqCall[] {
  return queries.filter((q) => q.table === table).flatMap((q) => q.eqCalls);
}

/** 指定テーブルのクエリに organization_id フィルタがあるか */
function hasOrgFilter(queries: QueryRecord[], table: string, orgId: string): boolean {
  return eqCallsFor(queries, table).some(
    (c) => c.column === "organization_id" && c.value === orgId
  );
}

// ---------------------------------------------------------------------------
// fetchJobDetail
// ---------------------------------------------------------------------------

describe("fetchJobDetail", () => {
  const ORG = "org-001";
  const JOB = "job-001";
  let queries: QueryRecord[];

  beforeEach(async () => {
    const mock = createMockClient();
    queries = mock.queries;
    await fetchJobDetail(mock.client, JOB, ORG);
  });

  describe("テナント分離", () => {
    it("jobs クエリに organization_id フィルタがある", () => {
      expect(hasOrgFilter(queries, "jobs", ORG)).toBe(true);
    });

    it("applications クエリに organization_id フィルタがある", () => {
      expect(hasOrgFilter(queries, "applications", ORG)).toBe(true);
    });
  });

  describe("レコード特定", () => {
    it("jobs クエリに id フィルタがある", () => {
      expect(eqCallsFor(queries, "jobs")).toContainEqual({ column: "id", value: JOB });
    });

    it("applications クエリに job_id フィルタがある", () => {
      expect(eqCallsFor(queries, "applications")).toContainEqual({ column: "job_id", value: JOB });
    });

    it("job_steps クエリに job_id フィルタがある", () => {
      expect(eqCallsFor(queries, "job_steps")).toContainEqual({ column: "job_id", value: JOB });
    });
  });

  describe("クエリ対象テーブル", () => {
    it("3 テーブルにクエリを発行する", () => {
      const tables = new Set(queries.map((q) => q.table));
      expect(tables).toEqual(new Set(["jobs", "job_steps", "applications"]));
    });
  });
});

// ---------------------------------------------------------------------------
// fetchTaskDetail
// ---------------------------------------------------------------------------

describe("fetchTaskDetail", () => {
  const ORG = "org-002";
  const TASK = "task-001";

  it("tasks クエリに organization_id フィルタがある", async () => {
    const { client, queries } = createMockClient();
    await fetchTaskDetail(client, TASK, ORG);
    expect(hasOrgFilter(queries, "tasks", ORG)).toBe(true);
  });

  it("tasks クエリに id フィルタがある", async () => {
    const { client, queries } = createMockClient();
    await fetchTaskDetail(client, TASK, ORG);
    expect(eqCallsFor(queries, "tasks")).toContainEqual({ column: "id", value: TASK });
  });

  it("異なる organizationId を渡すとそれがフィルタに反映される", async () => {
    const { client, queries } = createMockClient();
    await fetchTaskDetail(client, TASK, "org-other");
    expect(hasOrgFilter(queries, "tasks", "org-other")).toBe(true);
    expect(hasOrgFilter(queries, "tasks", ORG)).toBe(false);
  });
});
