import { describe, it, expect, vi } from "vitest";
import { csvFilenameWithDate } from "@hr1/shared-ui";

describe("csvFilenameWithDate", () => {
  it("プレフィックス_YYYYMMDD形式を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 23)); // 2026-03-23
    expect(csvFilenameWithDate("社員一覧")).toBe("社員一覧_20260323");
    vi.useRealTimers();
  });
});

describe("escapeCsvValue (formula injection)", () => {
  it("危険な先頭文字にシングルクォートを付与する", async () => {
    // escapeCsvValueは非公開なのでexportToCSV経由で間接テスト
    // exportToCSVはDOM依存のため、モジュールから直接インポートしてテスト
    const mod = await import("@hr1/shared-ui");
    // @ts-expect-error escapeCsvValue is not exported, access via module internals
    // 代わりにexportToCSVの出力を検証する
    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURL = vi.fn();
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const click = vi.fn();

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal(
      "Blob",
      class {
        constructor(
          public content: string[],
          public options: object
        ) {}
      }
    );
    Object.defineProperty(globalThis, "document", {
      value: {
        createElement: () => ({ set href(_: string) {}, set download(_: string) {}, click }),
        body: { appendChild, removeChild },
      },
      configurable: true,
    });

    type Row = { value: string };
    mod.exportToCSV<Row>(
      [
        { value: "=SUM(A1)" },
        { value: "+cmd" },
        { value: "-data" },
        { value: "@import" },
        { value: "safe" },
      ],
      [{ key: "value", label: "値" }],
      "test"
    );

    const blobArg = (createObjectURL.mock.calls[0][0] as { content: string[] }).content[0];
    const lines = blobArg.replace("\uFEFF", "").split("\n");
    // header
    expect(lines[0]).toBe("値");
    // formula injection prevention
    expect(lines[1]).toBe("'=SUM(A1)");
    expect(lines[2]).toBe("'+cmd");
    expect(lines[3]).toBe("'-data");
    expect(lines[4]).toBe("'@import");
    expect(lines[5]).toBe("safe");
  });
});
