import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants/crm";
import { formatJpy } from "@/features/crm/rules";
import { fmtDate } from "@/features/crm/components/detail-helpers";
import { Building2, Briefcase } from "lucide-react";
import type { BcDeal } from "@/types/database";

interface Props {
  deals: BcDeal[] | undefined;
  onDealClick: (dealId: string) => void;
  title?: string;
  icon?: "building" | "briefcase";
}

export function DealTable({
  deals,
  onDealClick,
  title = "関連する商談",
  icon = "building",
}: Props) {
  const Icon = icon === "briefcase" ? Briefcase : Building2;
  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          {deals && deals.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {deals.length}
            </Badge>
          )}
        </h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>商談名</TableHead>
            <TableHead className="text-right">金額</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>予定日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmptyState
            colSpan={4}
            isLoading={!deals}
            isEmpty={(deals ?? []).length === 0}
            emptyMessage="関連する商談がありません"
          >
            {(deals ?? []).map((d) => (
              <TableRow
                key={d.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onDealClick(d.id)}
              >
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {d.amount != null ? formatJpy(d.amount) : "---"}
                </TableCell>
                <TableCell>
                  <Badge variant={dealStatusColors[d.status] ?? "default"}>
                    {dealStatusLabels[d.status] ?? d.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {fmtDate(d.expected_close_date)}
                </TableCell>
              </TableRow>
            ))}
          </TableEmptyState>
        </TableBody>
      </Table>
    </SectionCard>
  );
}
