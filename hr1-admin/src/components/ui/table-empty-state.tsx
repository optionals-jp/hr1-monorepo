import { TableRow, TableCell } from "@/components/ui/table";

interface TableEmptyStateProps {
  colSpan: number;
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}

export function TableEmptyState({
  colSpan,
  isLoading,
  isEmpty,
  emptyMessage,
  children,
}: TableEmptyStateProps) {
  if (isLoading) {
    return (
      <TableRow>
        <TableCell
          colSpan={colSpan}
          className="text-center py-8 text-muted-foreground"
        >
          読み込み中...
        </TableCell>
      </TableRow>
    );
  }
  if (isEmpty) {
    return (
      <TableRow>
        <TableCell
          colSpan={colSpan}
          className="text-center py-8 text-muted-foreground"
        >
          {emptyMessage}
        </TableCell>
      </TableRow>
    );
  }
  return <>{children}</>;
}
