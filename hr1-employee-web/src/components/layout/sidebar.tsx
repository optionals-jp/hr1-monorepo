"use client";

import { usePathname } from "next/navigation";
import { cn } from "@hr1/shared-ui/lib/utils";
import { NavLink } from "@hr1/shared-ui/components/layout/nav-link";
import { CollapsibleSection } from "@hr1/shared-ui/components/layout/collapsible-section";
import { SidebarShell } from "@hr1/shared-ui/components/layout/sidebar-shell";
import {
  useProductTab,
  useSidebarCollapsed,
  toggleSidebarCollapsed,
  sectionsByTab,
  dashboardByTab,
  bottomItems,
  dashboardIcon,
} from "@/lib/nav-config";

/* ------------------------------------------------------------------ */
/*  SidebarNav                                                         */
/* ------------------------------------------------------------------ */

export function SidebarNav({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const activeTab = useProductTab();
  const sections = sectionsByTab[activeTab];
  const dashboardHref = dashboardByTab[activeTab];
  const DashboardIcon = dashboardIcon;

  return (
    <nav className={cn("flex flex-col h-full py-3 overflow-y-auto", collapsed ? "px-1" : "px-2")}>
      <div className="flex-1 space-y-4">
        <div className="space-y-0.5">
          <NavLink
            href={dashboardHref}
            label="ダッシュボード"
            icon={DashboardIcon}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        </div>

        {sections.map((section) => (
          <CollapsibleSection
            key={section.label}
            section={section}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </div>

      <div className={cn("border-t pt-2 mt-2 space-y-0.5", collapsed && "border-t-0")}>
        {collapsed && <div className="mx-2 my-1 h-px bg-border" />}
        {bottomItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const collapsed = useSidebarCollapsed();

  return (
    <SidebarShell collapsed={collapsed} onToggleCollapse={toggleSidebarCollapsed}>
      <SidebarNav collapsed={collapsed} />
    </SidebarShell>
  );
}
