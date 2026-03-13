import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableEmptyState } from "@/components/ui/table-empty-state";

// TableRow/TableCell は <table><tbody> 内に配置する必要がある
function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>
  );
}

describe("TableEmptyState", () => {
  it("isLoading=true で '読み込み中...' を表示する", () => {
    renderInTable(
      <TableEmptyState colSpan={3} isLoading={true} isEmpty={false} emptyMessage="データなし">
        <tr>
          <td>子要素</td>
        </tr>
      </TableEmptyState>
    );
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    expect(screen.queryByText("子要素")).toBeNull();
    expect(screen.queryByText("データなし")).toBeNull();
  });

  it("isLoading=false, isEmpty=true で emptyMessage を表示する", () => {
    renderInTable(
      <TableEmptyState
        colSpan={4}
        isLoading={false}
        isEmpty={true}
        emptyMessage="フォームがありません"
      >
        <tr>
          <td>子要素</td>
        </tr>
      </TableEmptyState>
    );
    expect(screen.getByText("フォームがありません")).toBeInTheDocument();
    expect(screen.queryByText("読み込み中...")).toBeNull();
    expect(screen.queryByText("子要素")).toBeNull();
  });

  it("isLoading=false, isEmpty=false で children を表示する", () => {
    renderInTable(
      <TableEmptyState colSpan={3} isLoading={false} isEmpty={false} emptyMessage="データなし">
        <tr>
          <td>実際のデータ</td>
        </tr>
      </TableEmptyState>
    );
    expect(screen.getByText("実際のデータ")).toBeInTheDocument();
    expect(screen.queryByText("読み込み中...")).toBeNull();
    expect(screen.queryByText("データなし")).toBeNull();
  });

  it("isLoading が isEmpty より優先される", () => {
    renderInTable(
      <TableEmptyState colSpan={3} isLoading={true} isEmpty={true} emptyMessage="空です">
        <tr>
          <td>子</td>
        </tr>
      </TableEmptyState>
    );
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    expect(screen.queryByText("空です")).toBeNull();
  });

  it("colSpan が TableCell に正しく設定される", () => {
    const { container } = renderInTable(
      <TableEmptyState colSpan={5} isLoading={true} isEmpty={false} emptyMessage="">
        <tr>
          <td>子</td>
        </tr>
      </TableEmptyState>
    );
    const td = container.querySelector("td");
    expect(td?.getAttribute("colspan")).toBe("5");
  });
});
