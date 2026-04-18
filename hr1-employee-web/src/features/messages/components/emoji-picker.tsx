"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { cn } from "@hr1/shared-ui/lib/utils";
import { EMOJI_CATEGORIES, type EmojiCategory } from "@/lib/constants/common-emojis";

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
};

/**
 * Slack Webの絵文字ピッカーに近いUI:
 * - 上部に検索入力
 * - 左側にカテゴリアイコンのサイドバー
 * - 右側にカテゴリ毎のグリッド（スクロール）
 */
export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(EMOJI_CATEGORIES[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredCategories: EmojiCategory[] = useMemo(() => {
    if (!query.trim()) return EMOJI_CATEGORIES;
    // 単純な絵文字一致（文字列包含）。日本語ラベルは横断検索しないが、
    // 将来的に emoji name マップを足せる設計にしておく。
    const q = query.trim();
    return EMOJI_CATEGORIES.map((c) => ({
      ...c,
      emojis: c.emojis.filter((e) => e.includes(q)),
    })).filter((c) => c.emojis.length > 0);
  }, [query]);

  // カテゴリクリックで対応セクションへスクロール
  const handleCategoryClick = (id: string) => {
    setActiveCategory(id);
    const el = categoryRefs.current[id];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: el.offsetTop - scrollRef.current.offsetTop,
        behavior: "smooth",
      });
    }
  };

  // スクロール位置に応じてアクティブカテゴリを更新
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const top = container.scrollTop;
      let current = filteredCategories[0]?.id ?? "";
      for (const cat of filteredCategories) {
        const el = categoryRefs.current[cat.id];
        if (el && el.offsetTop - container.offsetTop <= top + 8) {
          current = cat.id;
        }
      }
      setActiveCategory(current);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [filteredCategories]);

  return (
    <div className="flex flex-col w-[360px] h-[400px] overflow-hidden">
      {/* 検索バー */}
      <div className="p-2 border-b">
        <div className="flex items-center rounded-full bg-gray-100 px-4 py-2.5 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-white border border-transparent">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            placeholder="絵文字を検索"
            aria-label="絵文字を検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ml-2"
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* 左: カテゴリアイコン列 */}
        <div className="flex flex-col border-r w-10 shrink-0 overflow-y-auto py-1">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              title={cat.label}
              className={cn(
                "h-9 w-9 mx-auto flex items-center justify-center rounded text-lg transition-colors",
                activeCategory === cat.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60"
              )}
            >
              {cat.icon}
            </button>
          ))}
        </div>

        {/* 右: 絵文字グリッド */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
          {filteredCategories.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              該当する絵文字がありません
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div
                key={cat.id}
                ref={(el) => {
                  categoryRefs.current[cat.id] = el;
                }}
              >
                <div className="sticky top-0 bg-popover text-[11px] font-semibold text-muted-foreground px-1 py-1 z-10">
                  {cat.label}
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${cat.id}-${idx}-${emoji}`}
                      type="button"
                      onClick={() => onSelect(emoji)}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
