"use client";

import { usePathname } from "next/navigation";
import { ChevronDown, UserPlus, Briefcase, Handshake } from "lucide-react";
import { cn } from "@hr1/shared-ui/lib/utils";
import { NavLink } from "@hr1/shared-ui/components/layout/nav-link";
import { CollapsibleSection } from "@hr1/shared-ui/components/layout/collapsible-section";
import { SidebarShell } from "@hr1/shared-ui/components/layout/sidebar-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import {
  useSidebarCollapsed,
  toggleSidebarCollapsed,
  sectionsByProduct,
  dashboardHref,
  bottomItems,
  dashboardIcon,
} from "@/lib/nav-config";
import { useProduct } from "@/lib/product-context";
import { type Product, PRODUCT_LABELS, getProductUrl } from "@/lib/product";

const productDefs: { value: Product; label: string; icon: React.ElementType }[] = [
  { value: "recruiting", label: PRODUCT_LABELS.recruiting, icon: UserPlus },
  { value: "working", label: PRODUCT_LABELS.working, icon: Briefcase },
  { value: "client", label: PRODUCT_LABELS.client, icon: Handshake },
];

function ProductSwitcher({ collapsed }: { collapsed?: boolean }) {
  const product = useProduct();
  const current = productDefs.find((p) => p.value === product) ?? productDefs[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center w-full rounded-lg hover:bg-accent text-left transition-colors",
          collapsed ? "justify-center p-2" : "gap-2 px-2 py-2"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="HR1" className="h-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-[15px] font-extrabold tracking-tight text-[#1C1E1E] truncate">
              {current.label}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-56 p-1.5">
        {productDefs.map((p) => {
          const Icon = p.icon;
          return (
            <DropdownMenuItem
              key={p.value}
              onClick={
                product !== p.value
                  ? () => {
                      window.location.href = getProductUrl(p.value);
                    }
                  : undefined
              }
              className={cn(
                "group gap-3 rounded-lg px-3 py-2.5 text-[14px] cursor-pointer",
                product === p.value && "bg-accent font-medium"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  product !== p.value &&
                    "transition-transform group-hover:scale-110 group-data-highlighted:scale-110"
                )}
              />
              <span
                className={cn(
                  "font-extrabold tracking-tight text-[#1C1E1E]",
                  product !== p.value &&
                    "transition-transform group-hover:translate-x-0.5 group-data-highlighted:translate-x-0.5"
                )}
              >
                {p.label}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  const product = useProduct();
  const sections = sectionsByProduct[product];
  const DashboardIcon = dashboardIcon;

  return (
    <nav className={cn("flex flex-col h-full py-3 overflow-y-auto", collapsed ? "px-1" : "px-2")}>
      <div className="mb-3">
        <ProductSwitcher collapsed={collapsed} />
      </div>
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
