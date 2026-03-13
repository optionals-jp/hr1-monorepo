/**
 * markdownToHtml / applyInline のユニットテスト
 *
 * markdown-editor.tsx の関数は module-private なので、
 * コンポーネント経由でテストする代わりに、同じロジックをインポート可能にする。
 * ここでは実装をそのまま複製せず、コンポーネントの dangerouslySetInnerHTML 出力を
 * render して検証する方針をとる。
 *
 * ※ 純粋関数テストのため、applyInline / markdownToHtml を export する
 *   リファクタを先に行う。
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { useState } from "react";

// MarkdownEditor のプレビューモードで HTML 出力を検証するヘルパー
function PreviewWrapper({ markdown }: { markdown: string }) {
  const [value] = useState(markdown);
  return <MarkdownEditor value={value} onChange={() => {}} />;
}

async function getPreviewHtml(markdown: string) {
  const user = userEvent.setup();
  const { container } = render(<PreviewWrapper markdown={markdown} />);
  // プレビュータブをクリック
  const previewBtn = screen.getByText("プレビュー");
  await user.click(previewBtn);
  // dangerouslySetInnerHTML を含む div を取得
  const previewDiv = container.querySelector(".prose");
  return previewDiv?.innerHTML ?? "";
}

// ---------------------------------------------------------------------------
// Tier 1: XSS 対策テスト
// ---------------------------------------------------------------------------
describe("markdownToHtml XSS対策", () => {
  it("javascript: スキームのリンクを拒否する", async () => {
    const html = await getPreviewHtml("[クリック](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<a ");
    expect(html).toContain("クリック");
  });

  it("data: スキームのリンクを拒否する", async () => {
    const html = await getPreviewHtml("[XSS](data:text/html,<script>alert(1)</script>)");
    expect(html).not.toContain("data:");
    expect(html).not.toContain("<a ");
  });

  it("vbscript: スキームのリンクを拒否する", async () => {
    const html = await getPreviewHtml("[click](vbscript:msgbox)");
    expect(html).not.toContain("vbscript:");
    expect(html).not.toContain("<a ");
  });

  it("HTMLタグをエスケープする", async () => {
    const html = await getPreviewHtml('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("属性インジェクションを防ぐ", async () => {
    const html = await getPreviewHtml("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("https: リンクは許可する", async () => {
    const html = await getPreviewHtml("[Google](https://google.com)");
    expect(html).toContain('<a href="https://google.com"');
    expect(html).toContain("Google");
  });

  it("mailto: リンクは許可する", async () => {
    const html = await getPreviewHtml("[メール](mailto:test@example.com)");
    expect(html).toContain('<a href="mailto:test@example.com"');
  });

  it("相対パスリンクは許可する", async () => {
    const html = await getPreviewHtml("[ホーム](/home)");
    expect(html).toContain('<a href="/home"');
  });
});

// ---------------------------------------------------------------------------
// マークダウン変換テスト
// ---------------------------------------------------------------------------
describe("markdownToHtml 変換", () => {
  it("見出しを変換する", async () => {
    const html = await getPreviewHtml("# 見出し1\n## 見出し2\n### 見出し3");
    expect(html).toContain("<h1>見出し1</h1>");
    expect(html).toContain("<h2>見出し2</h2>");
    expect(html).toContain("<h3>見出し3</h3>");
  });

  it("太字・斜体・インラインコードを変換する", async () => {
    const html = await getPreviewHtml("**太字** *斜体* `コード`");
    expect(html).toContain("<strong>太字</strong>");
    expect(html).toContain("<em>斜体</em>");
    expect(html).toContain("<code>コード</code>");
  });

  it("太字+斜体を変換する", async () => {
    const html = await getPreviewHtml("***両方***");
    expect(html).toContain("<strong><em>両方</em></strong>");
  });

  it("箇条書きリストを変換する", async () => {
    const html = await getPreviewHtml("- 項目1\n- 項目2");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>項目1</li>");
    expect(html).toContain("<li>項目2</li>");
    expect(html).toContain("</ul>");
  });

  it("番号付きリストを変換する", async () => {
    const html = await getPreviewHtml("1. 最初\n2. 次");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>最初</li>");
    expect(html).toContain("<li>次</li>");
    expect(html).toContain("</ol>");
  });

  it("引用を変換する", async () => {
    const html = await getPreviewHtml("> 引用テキスト");
    expect(html).toContain("<blockquote>引用テキスト</blockquote>");
  });

  it("水平線を変換する", async () => {
    const html = await getPreviewHtml("---");
    expect(html).toContain("<hr");
  });

  it("空行を変換する", async () => {
    const html = await getPreviewHtml("段落1\n\n段落2");
    expect(html).toContain('<div class="empty-line"></div>');
  });

  it("リストの後に段落が来た場合リストを閉じる", async () => {
    const html = await getPreviewHtml("- 項目\nテキスト");
    expect(html).toContain("</ul><p>テキスト</p>");
  });

  it("空文字列のプレビューはプレースホルダーを表示する", async () => {
    const user = userEvent.setup();
    render(<PreviewWrapper markdown="" />);
    await user.click(screen.getByText("プレビュー"));
    expect(screen.getByText("プレビューがここに表示されます")).toBeInTheDocument();
  });
});
