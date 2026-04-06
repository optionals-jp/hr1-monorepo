import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  /** タブ行の右側に配置する要素（月切り替えボタン等） */
  trailing?: ReactNode;
}

/**
 * アンダーラインタブの共通コンポーネント。
 * StickyFilterBar 内で使用する。
 */
export function TabBar({ tabs, activeTab, onTabChange, trailing }: TabBarProps) {
  return (
    <div role="tablist" className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8 bg-white">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors flex items-center gap-1.5",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
      {trailing && (
        <>
          <div className="flex-1" />
          {trailing}
        </>
      )}
    </div>
  );
}
