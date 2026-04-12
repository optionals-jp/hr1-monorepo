"use client";

import { Fragment, useState } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { useAnnouncements } from "@/lib/hooks/use-announcements";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Pin, ChevronDown } from "lucide-react";
import { format } from "date-fns";

const TARGET_LABELS: Record<"all" | "employee" | "applicant", string> = {
  all: "全員",
  employee: "社員",
  applicant: "応募者",
};

export default function AnnouncementsPage() {
  const { data: announcements = [], isLoading, error, mutate } = useAnnouncements();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={error} onRetry={() => mutate()} />
      <PageHeader title="お知らせ" description="社内のお知らせ" sticky={false} border={false} />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>公開日</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={isLoading}
              isEmpty={announcements.length === 0}
              emptyMessage="お知らせはありません"
            >
              {announcements.map((a) => {
                const isExpanded = expandedId === a.id;
                return (
                  <Fragment key={a.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          {a.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <span className="font-medium truncate">{a.title}</span>
                          {a.is_pinned && (
                            <Badge variant="default" className="shrink-0 text-[10px]">
                              固定
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TARGET_LABELS[a.target]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {a.published_at ? format(new Date(a.published_at), "yyyy/MM/dd") : "-"}
                      </TableCell>
                      <TableCell>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={4}>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {a.body}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
