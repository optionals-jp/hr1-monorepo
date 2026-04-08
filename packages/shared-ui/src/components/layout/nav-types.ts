import type React from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  resource?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface MobileTab {
  href: string;
  label: string;
  icon: React.ElementType;
}
