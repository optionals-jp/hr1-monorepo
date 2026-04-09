import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// @supabase/ssr モジュールをモック
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
    from: mockFrom,
  }),
}));

vi.mock("@hr1/shared-ui/lib/role-cache", () => ({
  getCachedRole: vi.fn().mockResolvedValue(null),
  setCachedRole: vi.fn().mockResolvedValue(undefined),
  clearCachedRole: vi.fn(),
}));

import { middleware } from "@/middleware";

function createRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function createProfileQuery(role: string | null) {
  const builder: Record<string, unknown> = {};
  const resolved = {
    data: role ? { role } : null,
    error: role ? null : { message: "Not found" },
  };
  for (const m of ["select", "eq", "single"]) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder["then"] = (resolve: (v: unknown) => void) => resolve(resolved);
  mockFrom.mockReturnValue(builder);
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("/login パスはそのまま通過する", async () => {
    const response = await middleware(createRequest("/login"));
    expect(response.status).toBe(200);
    // auth チェックは呼ばれない
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("未認証のリクエストは /login にリダイレクトされる", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const response = await middleware(createRequest("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("admin ロールのリクエストは通過する", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    createProfileQuery("admin");

    const response = await middleware(createRequest("/"));
    expect(response.status).toBe(200);
  });

  it("employee ロールのリクエストは通過する", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-2" } } },
    });
    createProfileQuery("employee");

    const response = await middleware(createRequest("/applicants"));
    expect(response.status).toBe(200);
  });

  it("applicant ロールのリクエストは /login?error=unauthorized にリダイレクトされる", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-3" } } },
    });
    createProfileQuery("applicant");

    const response = await middleware(createRequest("/"));
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("/login");
    expect(location).toContain("error=unauthorized");
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("プロフィールが存在しないリクエストはリダイレクトされる", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-4" } } },
    });
    createProfileQuery(null);

    const response = await middleware(createRequest("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=unauthorized");
  });

  it("/login-other のような類似パスは公開パスとして扱わない", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const response = await middleware(createRequest("/login-other"));
    // 未認証なのでリダイレクトされるはず（公開パスとしてスキップされない）
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });
});
