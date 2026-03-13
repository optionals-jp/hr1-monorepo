"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Simple markdown → HTML renderer (handles common cases without dependencies)
// ---------------------------------------------------------------------------

function applyInline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
      const isAllowedUrl =
        /^https?:\/\//i.test(url) || /^mailto:/i.test(url) || url.startsWith("/");
      if (isAllowedUrl) {
        return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
      }
      return label;
    });
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) {
      html += "</ul>";
      inUl = false;
    }
    if (inOl) {
      html += "</ol>";
      inOl = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      closeList();
      html += `<h3>${applyInline(trimmed.slice(4))}</h3>`;
    } else if (trimmed.startsWith("## ")) {
      closeList();
      html += `<h2>${applyInline(trimmed.slice(3))}</h2>`;
    } else if (trimmed.startsWith("# ")) {
      closeList();
      html += `<h1>${applyInline(trimmed.slice(2))}</h1>`;
    } else if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      closeList();
      html += "<hr />";
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inUl) {
        closeList();
        html += "<ul>";
        inUl = true;
      }
      html += `<li>${applyInline(trimmed.slice(2))}</li>`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (!inOl) {
        closeList();
        html += "<ol>";
        inOl = true;
      }
      html += `<li>${applyInline(trimmed.replace(/^\d+\.\s/, ""))}</li>`;
    } else if (trimmed.startsWith("> ")) {
      closeList();
      html += `<blockquote>${applyInline(trimmed.slice(2))}</blockquote>`;
    } else if (trimmed === "") {
      closeList();
      html += '<div class="empty-line"></div>';
    } else {
      closeList();
      html += `<p>${applyInline(trimmed)}</p>`;
    }
  }

  closeList();
  return html;
}

// ---------------------------------------------------------------------------
// Toolbar button helpers
// ---------------------------------------------------------------------------

interface ToolbarAction {
  label: string;
  title: string;
  bold?: boolean;
  action: (
    value: string,
    selStart: number,
    selEnd: number
  ) => { value: string; selStart: number; selEnd: number };
}

function wrapSelection(
  value: string,
  selStart: number,
  selEnd: number,
  prefix: string,
  suffix: string,
  placeholder: string
): { value: string; selStart: number; selEnd: number } {
  const selected = value.slice(selStart, selEnd) || placeholder;
  const before = value.slice(0, selStart);
  const after = value.slice(selEnd);
  const newValue = before + prefix + selected + suffix + after;
  const newStart = selStart + prefix.length;
  const newEnd = newStart + selected.length;
  return { value: newValue, selStart: newStart, selEnd: newEnd };
}

function prefixCurrentLine(
  value: string,
  selStart: number,
  prefix: string
): { value: string; selStart: number; selEnd: number } {
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const lineEnd = value.indexOf("\n", selStart);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const currentLine = value.slice(lineStart, end);

  // Toggle: remove if already prefixed
  if (currentLine.startsWith(prefix)) {
    const newValue =
      value.slice(0, lineStart) + currentLine.slice(prefix.length) + value.slice(end);
    const newPos = Math.max(lineStart, selStart - prefix.length);
    return { value: newValue, selStart: newPos, selEnd: newPos };
  }

  const newValue = value.slice(0, lineStart) + prefix + currentLine + value.slice(end);
  const newPos = selStart + prefix.length;
  return { value: newValue, selStart: newPos, selEnd: newPos };
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    label: "見出し",
    title: "見出し（大）",
    action: (v, s, e) => prefixCurrentLine(v, s, "## "),
  },
  {
    label: "小見出し",
    title: "見出し（小）",
    action: (v, s, e) => prefixCurrentLine(v, s, "### "),
  },
  {
    label: "B",
    title: "太字",
    bold: true,
    action: (v, s, e) => wrapSelection(v, s, e, "**", "**", "太字テキスト"),
  },
  {
    label: "I",
    title: "斜体",
    action: (v, s, e) => wrapSelection(v, s, e, "*", "*", "斜体テキスト"),
  },
  {
    label: "・リスト",
    title: "箇条書き",
    action: (v, s, e) => prefixCurrentLine(v, s, "- "),
  },
  {
    label: "1. リスト",
    title: "番号付きリスト",
    action: (v, s, e) => prefixCurrentLine(v, s, "1. "),
  },
  {
    label: "引用",
    title: "引用",
    action: (v, s, e) => prefixCurrentLine(v, s, "> "),
  },
  {
    label: "──",
    title: "区切り線",
    action: (v, s) => {
      const before = v.slice(0, s);
      const after = v.slice(s);
      const separator = "\n\n---\n\n";
      const newValue = before + separator + after;
      const newPos = s + separator.length;
      return { value: newValue, selStart: newPos, selEnd: newPos };
    },
  },
];

// ---------------------------------------------------------------------------
// MarkdownEditor component
// ---------------------------------------------------------------------------

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, rows = 10, placeholder }: MarkdownEditorProps) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const result = action.action(value, textarea.selectionStart, textarea.selectionEnd);
    onChange(result.value);

    // Restore cursor/selection after React re-render
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(result.selStart, result.selEnd);
    });
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Tab switcher */}
      <div className="flex border-b bg-slate-50">
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-r transition-colors",
            tab === "edit"
              ? "bg-white text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            tab === "preview"
              ? "bg-white text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          プレビュー
        </button>
      </div>

      {tab === "edit" ? (
        <>
          {/* Formatting toolbar */}
          <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b bg-slate-50">
            {TOOLBAR_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                title={action.title}
                onClick={() => applyAction(action)}
                className={cn(
                  "px-2 py-1 text-xs rounded border border-transparent hover:border-border hover:bg-white transition-colors text-muted-foreground hover:text-foreground",
                  action.bold && "font-bold"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={
              placeholder ??
              "テキストを入力してください。\n上のボタンで見出し・太字・リストなどの書式を設定できます。"
            }
            className="w-full px-3 py-2.5 text-sm resize-none outline-none font-sans leading-relaxed"
          />
        </>
      ) : (
        /* Preview */
        <div
          className={cn(
            "px-4 py-3 min-h-24 text-sm leading-relaxed",
            "prose prose-sm max-w-none",
            "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1",
            "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1",
            "[&_p]:my-1.5 [&_p]:leading-relaxed",
            "[&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc",
            "[&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal",
            "[&_li]:my-0.5",
            "[&_strong]:font-semibold",
            "[&_em]:italic",
            "[&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:text-xs [&_code]:font-mono",
            "[&_hr]:my-3 [&_hr]:border-border",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:my-2",
            "[&_a]:text-primary [&_a]:underline",
            "[&_.empty-line]:h-3"
          )}
          dangerouslySetInnerHTML={{
            __html: value
              ? markdownToHtml(value)
              : '<span class="text-muted-foreground">プレビューがここに表示されます</span>',
          }}
        />
      )}
    </div>
  );
}
