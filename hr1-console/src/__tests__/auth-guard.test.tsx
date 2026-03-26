import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockReplace = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

let mockAuthValue = {
  user: null as { id: string; email: string } | null,
  profile: null as { role: string } | null,
  loading: true,
  signIn: vi.fn(),
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuthValue,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/org-context", () => ({
  OrgProvider: ({ children }: { children: React.ReactNode }) => children,
  useOrg: () => ({
    organization: { id: "org-1", name: "Test Org" },
    organizations: [{ id: "org-1", name: "Test Org" }],
    setOrganization: vi.fn(),
    loading: false,
  }),
}));

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
  SidebarNav: () => <nav>SidebarNav</nav>,
}));

vi.mock("@/components/layout/header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

import DashboardLayout from "@/app/(dashboard)/layout";
import { ClientLayout } from "@/app/client-layout";

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockAuthValue = {
      user: null,
      profile: null,
      loading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    };
  });

  it("loading 中は読み込み画面を表示する", () => {
    mockAuthValue.loading = true;

    render(
      <DashboardLayout>
        <div>Protected Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("未認証時は /login にリダイレクトする", async () => {
    mockAuthValue.loading = false;
    mockAuthValue.user = null;

    render(
      <DashboardLayout>
        <div>Protected Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("認証済みの場合はメインレイアウトを表示する", () => {
    mockAuthValue.loading = false;
    mockAuthValue.user = { id: "user-1", email: "admin@example.com" };
    mockAuthValue.profile = { role: "admin" };

    render(
      <DashboardLayout>
        <div>Protected Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("user はあるが profile がない場合は読み込み画面を表示する", () => {
    mockAuthValue.loading = false;
    mockAuthValue.user = { id: "user-1", email: "test@example.com" };
    mockAuthValue.profile = null;

    render(
      <DashboardLayout>
        <div>Protected Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("公開ページ（login等）は ClientLayout 経由で認証チェックなしにレンダリングされる", () => {
    mockAuthValue.loading = false;
    mockAuthValue.user = null;

    render(
      <ClientLayout>
        <div>Login Form</div>
      </ClientLayout>
    );

    expect(screen.getByText("Login Form")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
