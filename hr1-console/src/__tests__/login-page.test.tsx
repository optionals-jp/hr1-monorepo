import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignIn = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signIn: mockSignIn,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    // window.location.search をリセット
    Object.defineProperty(window, "location", {
      value: { search: "", href: "http://localhost:3000/login" },
      writable: true,
    });
  });

  it("ログインフォームが表示される", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ログイン/ })).toBeInTheDocument();
    expect(screen.getByText("HR1 Console")).toBeInTheDocument();
  });

  it("ログイン成功時はエラーが表示されない", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "admin@test.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: /ログイン/ }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("admin@test.com", "password123");
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ログイン失敗時はエラーメッセージが表示される", async () => {
    mockSignIn.mockResolvedValue({ error: "Invalid login credentials" });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "bad@test.com");
    await user.type(screen.getByLabelText("パスワード"), "wrong");
    await user.click(screen.getByRole("button", { name: /ログイン/ }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
  });

  it("送信中はボタンが無効化される", async () => {
    // signIn を遅延させる
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    );
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "admin@test.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: /ログイン/ }));

    expect(screen.getByRole("button", { name: /ログイン中/ })).toBeDisabled();

    // 完了後にボタンが有効に戻る
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /ログイン/ })).toBeEnabled();
    });
  });

  it("サーバーエラーパラメータ ?error=unauthorized が表示される", () => {
    Object.defineProperty(window, "location", {
      value: {
        search: "?error=unauthorized",
        href: "http://localhost:3000/login?error=unauthorized",
      },
      writable: true,
    });

    render(<LoginPage />);

    expect(screen.getByText(/アクセス権限がありません/)).toBeInTheDocument();
  });
});
