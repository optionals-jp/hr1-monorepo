"use client";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Search, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/lib/org-context";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { organization, organizations, setOrganization } = useOrg();

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-white px-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0 pr-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-red-600">
          <span className="text-xs font-bold text-white">H</span>
        </div>
        <span className="text-[15px] font-medium text-foreground">HR1 Studio</span>
      </div>

      {/* Org Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent text-left transition-colors shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">
            {organization?.name?.[0] ?? "?"}
          </div>
          <span className="text-[13px] font-medium text-foreground max-w-40 truncate">
            {organization?.name ?? "企業を選択"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setOrganization(org)}
              className={cn(org.id === organization?.id && "bg-accent")}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 text-[10px] font-bold mr-2">
                {org.name[0]}
              </div>
              {org.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search (centered) */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="検索..."
            className="h-9 pl-9 rounded-full border-border bg-accent/50 focus:bg-white focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Avatar className="h-8 w-8 ml-2">
          <AvatarFallback className="bg-purple-600 text-white text-xs font-medium">
            A
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
