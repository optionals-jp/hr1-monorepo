/**
 * SWR キャッシュキーのテナント分離テスト
 *
 * すべてのカスタムフック（useQuery を使用するもの）のキャッシュキーに
 * organization.id が含まれていることを静的に検証する。
 *
 * テナント間でキャッシュが共有されると、別テナントのデータが表示される
 * 重大なセキュリティリスクとなるため、このテストで防止する。
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SRC_ROOT = join(__dirname, "..");

/** 対象ディレクトリからすべての .ts/.tsx ファイルを再帰取得 */
function collectFiles(dir: string, ext: string[] = [".ts", ".tsx"]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full, ext));
    } else if (ext.some((e) => full.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

/**
 * useQuery / useSWR のキャッシュキー文字列を抽出する。
 * テンプレートリテラル内の変数名を解析し、org 系のトークンが含まれるかチェック。
 */
function extractCacheKeys(content: string): { line: number; key: string; hasOrgId: boolean }[] {
  const results: { line: number; key: string; hasOrgId: boolean }[] = [];
  const lines = content.split("\n");

  // useOrgQuery を使っているファイルは自動的に org ID が付与されるのでスキップ
  // ただし useQuery / useSWR を直接使っているキーはチェック対象
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // useQuery( キー , ...) のパターン
    // テンプレートリテラルまたは文字列リテラルのキーを検出
    const useQueryMatch = line.match(/useQuery[^(]*\(\s*(`[^`]+`|"[^"]+"|'[^']+')/);
    if (useQueryMatch) {
      const key = useQueryMatch[1];
      // 三項演算子の false 側 (: null) はスキップ
      if (key === "null") continue;

      // org 系の変数がキーに含まれているか
      const hasOrgId =
        key.includes("organization.id") ||
        key.includes("orgId") ||
        key.includes("organization!.id");

      results.push({ line: i + 1, key, hasOrgId });
    }
  }

  return results;
}

describe("SWR キャッシュキーのテナント分離", () => {
  // hooks ディレクトリのファイルを取得
  const hookDirs = [join(SRC_ROOT, "lib", "hooks"), join(SRC_ROOT, "features")];

  const hookFiles: string[] = [];
  for (const dir of hookDirs) {
    try {
      hookFiles.push(...collectFiles(dir));
    } catch {
      // ディレクトリが存在しない場合はスキップ
    }
  }

  // useQuery を直接呼んでいるファイルのみ対象
  const filesWithDirectUseQuery = hookFiles.filter((f) => {
    const content = readFileSync(f, "utf-8");
    return (
      content.includes("useQuery") && !f.includes("use-org-query.ts") && !f.includes("use-query.ts")
    );
  });

  it("useQuery を使用するファイルが存在する", () => {
    expect(filesWithDirectUseQuery.length).toBeGreaterThan(0);
  });

  for (const file of filesWithDirectUseQuery) {
    const rel = relative(SRC_ROOT, file);
    const content = readFileSync(file, "utf-8");

    // useOrgQuery のみを使用しているファイルはスキップ（自動的に org ID 付与）
    const usesDirectUseQuery = content.includes("useQuery<") || content.includes("useQuery(");
    const usesOnlyOrgQuery =
      !usesDirectUseQuery || (content.includes("useOrgQuery") && !content.match(/\buseQuery[^O]/));

    if (usesOnlyOrgQuery) continue;

    const keys = extractCacheKeys(content);
    const insecureKeys = keys.filter((k) => !k.hasOrgId);

    it(`${rel}: すべての useQuery キーに organization ID が含まれている`, () => {
      if (insecureKeys.length > 0) {
        const details = insecureKeys.map((k) => `  L${k.line}: ${k.key}`).join("\n");
        expect.fail(`テナント分離違反: org ID がキーに含まれていません\n${details}`);
      }
    });
  }
});
