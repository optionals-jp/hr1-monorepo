import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockReplace = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@example.com" },
    profile: {
      id: "user-1",
      email: "admin@example.com",
      display_name: "管理者ユーザー",
      role: "admin",
    },
    loading: false,
    signIn: vi.fn(),
    signOut: mockSignOut,
  }),
}));

vi.mock("@/lib/org-context", () => ({
  useOrg: () => ({
    organization: { id: "org-1", name: "テスト企業" },
    organizations: [{ id: "org-1", name: "テスト企業" }],
    setOrganization: vi.fn(),
    loading: false,
  }),
}));

vi.mock("./sidebar", () => ({
  SidebarNav: () => <nav>SidebarNav</nav>,
}));

import { Header } from "@/components/layout/header";

describe("Header signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ログアウトボタンをクリックすると signOut が呼ばれ /login にリダイレクトされる", async () => {
    const user = userEvent.setup();

    render(<Header />);

    // アバターをクリックしてドロップダウンを開く
    const avatar = screen.getByText("管");
    await user.click(avatar);

    // ログアウトメニューをクリック
    const logoutButton = await screen.findByText("ログアウト");
    await user.click(logoutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("ロールに応じたラベルが表示される", async () => {
    const user = userEvent.setup();

    render(<Header />);

    const avatar = screen.getByText("管");
    await user.click(avatar);

    await waitFor(() => {
      expect(screen.getByText("管理者")).toBeInTheDocument();
      expect(screen.getByText("管理者ユーザー")).toBeInTheDocument();
    });
  });
});
