import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";

// --- Supabase モック ---
const mockSupabase = vi.hoisted(() => {
  function createQueryBuilder(data: unknown, error: unknown = null) {
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order", "single", "maybeSingle"]) {
      builder[m] = vi.fn().mockReturnValue(builder);
    }
    builder["then"] = (resolve: (v: unknown) => void) => resolve({ data, error });
    return builder;
  }

  return {
    auth: {
      onAuthStateChange: vi.fn().mockImplementation(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn().mockReturnValue(createQueryBuilder(null)),
    _createQueryBuilder: createQueryBuilder,
  };
});

vi.mock("@/lib/supabase/browser", () => ({
  getSupabase: () => mockSupabase,
}));

// AuthProvider のモック — user を制御できるようにする
let mockUser: { id: string } | null = null;

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockUser ? { id: mockUser.id, role: "admin" } : null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { OrgProvider, useOrg } from "@/lib/org-context";

function wrapper({ children }: { children: ReactNode }) {
  return <OrgProvider>{children}</OrgProvider>;
}

const orgA = { id: "org-a", name: "企業A", created_at: "2024-01-01" };
const orgB = { id: "org-b", name: "企業B", created_at: "2024-01-02" };

function mockOrgQuery(orgs: Array<{ id: string; name: string; created_at: string }>) {
  mockSupabase.from.mockReturnValue(
    mockSupabase._createQueryBuilder(orgs.map((o) => ({ organization_id: o.id, organizations: o })))
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = null;
  localStorage.clear();
});

// ---------------------------------------------------------------------------
describe("OrgProvider", () => {
  it("ユーザー未ログイン時は loading=false, organization=null", async () => {
    mockUser = null;
    const { result } = renderHook(() => useOrg(), { wrapper });
    // ユーザーがいない場合、useEffect は発火しないが render 中に loading=false に
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organization).toBeNull();
    expect(result.current.organizations).toHaveLength(0);
  });

  it("ログイン時に組織を取得し、最初の組織を選択する", async () => {
    mockUser = { id: "user-1" };
    mockOrgQuery([orgA, orgB]);

    const { result } = renderHook(() => useOrg(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organizations).toHaveLength(2);
    expect(result.current.organization?.id).toBe("org-a");
  });

  it("localStorage に保存された組織を復元する", async () => {
    localStorage.setItem("hr1_org_id", "org-b");
    mockUser = { id: "user-1" };
    mockOrgQuery([orgA, orgB]);

    const { result } = renderHook(() => useOrg(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organization?.id).toBe("org-b");
  });

  it("localStorage の ID が無効な場合は最初の組織にフォールバック", async () => {
    localStorage.setItem("hr1_org_id", "org-nonexistent");
    mockUser = { id: "user-1" };
    mockOrgQuery([orgA, orgB]);

    const { result } = renderHook(() => useOrg(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organization?.id).toBe("org-a");
  });

  it("setOrganization で組織を切り替えると localStorage に保存される", async () => {
    mockUser = { id: "user-1" };
    mockOrgQuery([orgA, orgB]);

    const { result } = renderHook(() => useOrg(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organization?.id).toBe("org-a");

    act(() => {
      result.current.setOrganization(orgB as never);
    });

    expect(result.current.organization?.id).toBe("org-b");
    expect(localStorage.getItem("hr1_org_id")).toBe("org-b");
  });

  it("組織が0件の場合は organization=null のまま", async () => {
    mockUser = { id: "user-1" };
    mockOrgQuery([]);

    const { result } = renderHook(() => useOrg(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organization).toBeNull();
    expect(result.current.organizations).toHaveLength(0);
  });
});
