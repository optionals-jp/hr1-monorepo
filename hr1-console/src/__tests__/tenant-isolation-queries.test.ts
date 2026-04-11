import { describe, it, expect } from "vitest";
import { fetchTaskDetail } from "@/lib/repositories/task-repository";

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
