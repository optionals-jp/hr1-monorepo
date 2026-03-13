import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";

// テスト用コンポーネント
function TestTrigger({ message, type }: { message: string; type?: "success" | "error" }) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast(message, type)} data-testid="trigger">
      show
    </button>
  );
}

function renderWithToast(ui: ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe("ToastProvider", () => {
  it("showToast でトーストが表示される", () => {
    renderWithToast(<TestTrigger message="保存しました" />);
    act(() => {
      screen.getByTestId("trigger").click();
    });
    expect(screen.getByText("保存しました")).toBeInTheDocument();
  });

  it("デフォルトは success タイプ", () => {
    const { container } = renderWithToast(<TestTrigger message="成功" />);
    act(() => {
      screen.getByTestId("trigger").click();
    });
    // success は green 系のクラスを持つ
    const toast = container.querySelector(".border-green-200");
    expect(toast).not.toBeNull();
  });

  it("error タイプで赤いトーストが表示される", () => {
    const { container } = renderWithToast(<TestTrigger message="失敗しました" type="error" />);
    act(() => {
      screen.getByTestId("trigger").click();
    });
    const toast = container.querySelector(".border-red-200");
    expect(toast).not.toBeNull();
    expect(screen.getByText("失敗しました")).toBeInTheDocument();
  });

  it("3秒後にトーストが自動で消える", () => {
    renderWithToast(<TestTrigger message="一時メッセージ" />);
    act(() => {
      screen.getByTestId("trigger").click();
    });
    expect(screen.getByText("一時メッセージ")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText("一時メッセージ")).toBeNull();
  });

  it("閉じるボタンでトーストを手動で消せる", async () => {
    vi.useRealTimers(); // userEvent に必要
    const user = userEvent.setup();
    renderWithToast(<TestTrigger message="手動で閉じる" />);

    await user.click(screen.getByTestId("trigger"));
    expect(screen.getByText("手動で閉じる")).toBeInTheDocument();

    // 閉じるボタンをクリック（トースト内のボタン）
    const closeButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn !== screen.getByTestId("trigger"));
    await user.click(closeButtons[0]);
    expect(screen.queryByText("手動で閉じる")).toBeNull();
  });

  it("複数トーストを同時表示できる", () => {
    function MultiTrigger() {
      const { showToast } = useToast();
      return (
        <>
          <button onClick={() => showToast("メッセージ1")} data-testid="t1">
            1
          </button>
          <button onClick={() => showToast("メッセージ2", "error")} data-testid="t2">
            2
          </button>
        </>
      );
    }

    renderWithToast(<MultiTrigger />);
    act(() => {
      screen.getByTestId("t1").click();
      screen.getByTestId("t2").click();
    });

    expect(screen.getByText("メッセージ1")).toBeInTheDocument();
    expect(screen.getByText("メッセージ2")).toBeInTheDocument();
  });

  it("useToast を ToastProvider 外で使うとエラーになる", () => {
    function BadComponent() {
      useToast();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow("useToast must be used within a ToastProvider");
  });
});
