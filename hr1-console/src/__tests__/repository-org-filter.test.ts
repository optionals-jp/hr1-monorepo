/**
 * リポジトリ関数の organization_id フィルタ検証テスト
 *
 * organization_id カラムを持つテーブルへの SELECT / UPDATE / DELETE クエリに
 * .eq("organization_id", ...) が含まれていることを静的に検証する。
 *
 * テナント間でデータが漏洩する重大なセキュリティリスクを防止する。
 *
 * ※ INSERT はデータに organization_id を含めて渡すため、このテストでは対象外。
 * ※ 子テーブル（job_steps, application_steps 等）は親テーブル経由で保護されるため対象外。
 * ※ profiles テーブルはグローバルテーブルのため対象外。
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const REPO_DIR = join(__dirname, "..", "lib", "repositories");

/**
 * organization_id カラムを持つテーブル一覧。
 * これらのテーブルへの SELECT / UPDATE / DELETE には org_id フィルタが必須。
 */
const ORG_SCOPED_TABLES = [
  "jobs",
  "applications",
  "departments",
  "attendance_records",
  "attendance_settings",
  "attendance_punches",
  "attendance_corrections",
  "attendance_approvers",
  "custom_forms",
  "interviews",
  "evaluation_templates",
  "evaluation_cycles",
  "evaluations",
  "workflow_requests",
  "workflow_rules",
  "announcements",
  "faqs",
  "payslips",
  "projects",
  "tasks",
  "pulse_surveys",
  "leave_balances",
  "shift_schedules",
  "shift_requests",
  "wiki_pages",
  "compliance_alerts",
  "bc_deals",
  "bc_companies",
  "bc_contacts",
  "bc_activities",
  "bc_cards",
  "bc_todos",
  "skill_masters",
  "certification_masters",
  "page_tabs",
  "calendar_events",
  "audit_logs",
  "organizations",
  "notifications",
];

/**
 * org_id フィルタが不要な例外パターン。
 *
 * key: "ファイル名:関数名"
 * value: 除外理由
 *
 * .in("id", ids) パターン（ID は既にフィルタ済みクエリから取得）や、
 * INSERT のデータに org_id が含まれる upsert、RPC 呼び出し等を除外する。
 */
const ALLOWED_EXCEPTIONS: Record<string, string> = {
  // .in("id", ids) パターン — ID は既に org フィルタ済みのクエリ結果から取得
  "evaluation-repository.ts:fetchTemplateTitles": ".in() で ID 指定（ID は org フィルタ済み）",

  // upsert — onConflict に organization_id が含まれる
  "attendance-repository.ts:upsertSettings": "upsert の onConflict に organization_id 含む",
  "shift-repository.ts:autoFillFromRequests": "upsert データに organization_id 含む",
  "leave-repository.ts:upsertBalance": "upsert の onConflict に organization_id 含む",
  "leave-repository.ts:upsertBalances": "upsert の onConflict に organization_id 含む",
  "payslip-repository.ts:upsertBatch": "upsert の onConflict に organization_id 含む",

  // INSERT — データに organization_id が含まれる（静的解析で UPDATE/DELETE と区別困難）
  "audit-repository.ts:insertAuditLog": "INSERT データに organization_id 含む",
  "attendance-repository.ts:addApprover": "INSERT データに organization_id 含む",
  "workflow-repository.ts:insertNotification": "INSERT データに organization_id 含む",

  // organizations テーブルは .eq("id", organizationId) でフィルタ（自テーブルなので organization_id ではない）
  "settings-repository.ts:fetchOrganization": ".eq('id', organizationId) でフィルタ",
  "settings-repository.ts:updateOrganization": ".eq('id', organizationId) でフィルタ",

  // .or() で organization_id フィルタ — 共通データ（null）と自社データを両方取得
  "settings-repository.ts:fetchSkillMasters":
    ".or() で organization_id.is.null + organization_id.eq フィルタ",
  "settings-repository.ts:fetchCertificationMasters":
    ".or() で organization_id.is.null + organization_id.eq フィルタ",

  // skill_masters は .eq("id") で単一取得/更新 — RLS で保護
  "settings-repository.ts:fetchSkillMaster": ".eq('id') で単一取得、RLS で閲覧制御",
  "settings-repository.ts:updateSkillMasterDescription": ".eq('id') で単一更新、RLS で更新制御",
};

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full));
    } else if (full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

interface FunctionBlock {
  name: string;
  startLine: number;
  body: string;
}

/**
 * export async function / export function を抽出する。
 * ブレース計数で正確に関数本体を取得する。
 */
function extractFunctions(content: string): FunctionBlock[] {
  const lines = content.split("\n");
  const functions: FunctionBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^export\s+(?:async\s+)?function\s+(\w+)/);
    if (!match) continue;

    const name = match[1];
    const startLine = i + 1;
    let braceCount = 0;
    let started = false;
    const bodyLines: string[] = [];

    for (let j = i; j < lines.length; j++) {
      bodyLines.push(lines[j]);
      for (const ch of lines[j]) {
        if (ch === "{") {
          braceCount++;
          started = true;
        } else if (ch === "}") {
          braceCount--;
        }
      }
      if (started && braceCount === 0) break;
    }

    functions.push({ name, startLine, body: bodyLines.join("\n") });
  }

  return functions;
}

/**
 * 関数本体が org スコープテーブルにアクセスしているかを検出する。
 * .from("table_name") パターンを検索する。
 */
function findOrgScopedTableAccess(
  body: string
): { table: string; hasOrgFilter: boolean; isInsertOnly: boolean }[] {
  const results: { table: string; hasOrgFilter: boolean; isInsertOnly: boolean }[] = [];
  const fromMatches = body.matchAll(/\.from\(\s*["'](\w+)["']\s*\)/g);

  for (const match of fromMatches) {
    const table = match[1];
    if (!ORG_SCOPED_TABLES.includes(table)) continue;

    // .from("table") からセミコロンまでのチェーン全体を取得
    const chainStart = match.index!;
    const restOfBody = body.slice(chainStart);
    const semiPos = restOfBody.indexOf(";");
    const chain = semiPos > 0 ? restOfBody.slice(0, semiPos) : restOfBody;

    const hasOrgFilter =
      chain.includes('"organization_id"') ||
      chain.includes("'organization_id'") ||
      chain.includes(".organization_id");

    // INSERT のみ（.insert() はあるが .select()/.update()/.delete() がない）
    const isInsert = chain.includes(".insert(");
    const isSelect = chain.includes(".select(") && !chain.includes(".insert(");
    const isUpdate = chain.includes(".update(");
    const isDelete = chain.includes(".delete()");
    const isInsertOnly = isInsert && !isUpdate && !isDelete && !isSelect;

    results.push({ table, hasOrgFilter, isInsertOnly });
  }

  return results;
}

describe("リポジトリ関数の organization_id フィルタ検証", () => {
  const repoFiles = collectFiles(REPO_DIR);

  it("リポジトリファイルが存在する", () => {
    expect(repoFiles.length).toBeGreaterThan(0);
  });

  for (const file of repoFiles) {
    const fileName = file.split("/").pop()!;
    const rel = relative(join(__dirname, ".."), file);
    const content = readFileSync(file, "utf-8");
    const functions = extractFunctions(content);

    for (const fn of functions) {
      const exceptionKey = `${fileName}:${fn.name}`;

      // 許容例外リストに含まれる場合はスキップ
      if (ALLOWED_EXCEPTIONS[exceptionKey]) continue;

      const accesses = findOrgScopedTableAccess(fn.body);
      const violations = accesses.filter((a) => !a.hasOrgFilter && !a.isInsertOnly);

      if (violations.length === 0) continue;

      it(`${rel}:${fn.startLine} ${fn.name}() — org スコープテーブルに organization_id フィルタが必要`, () => {
        const details = violations
          .map((v) => `  テーブル "${v.table}" に .eq("organization_id", ...) がありません`)
          .join("\n");
        expect.fail(`テナント分離違反:\n${details}`);
      });
    }
  }
});
