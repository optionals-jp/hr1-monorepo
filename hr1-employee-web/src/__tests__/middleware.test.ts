import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
    from: mockFrom,
  }),
}));

import { middleware } from "@/middleware";

function createRequest(path: string, host = "localhost:3003") {
  const url = new URL(path, "http://localhost:3003");
  const req = new NextRequest(url, {
    headers: { host },
  });
  return req;
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
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("未認証のリクエストは /login にリダイレクトされる", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await middleware(createRequest("/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("employee ロールのリクエストは通過する", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    createProfileQuery("employee");

    const response = await middleware(createRequest("/dashboard"));
    expect(response.status).toBe(200);
  });

  it("admin ロールのリクエストは通過する", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-2" } },
    });
    createProfileQuery("admin");

    const response = await middleware(createRequest("/dashboard"));
    expect(response.status).toBe(200);
  });

  it("applicant ロールは /login?error=unauthorized にリダイレクトされる", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-3" } },
    });
    createProfileQuery("applicant");

    const response = await middleware(createRequest("/dashboard"));
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("/login");
    expect(location).toContain("error=unauthorized");
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("プロフィールが存在しないリクエストはリダイレクトされる", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-4" } },
    });
    createProfileQuery(null);

    const response = await middleware(createRequest("/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=unauthorized");
  });
});

describe("middleware - プロダクト別ルート制限", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    createProfileQuery("employee");
  });

  it("working プロダクトは /payslips にアクセスできる", async () => {
    const req = createRequest("/payslips?product=working");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("recruiting プロダクトは /payslips にアクセスできない", async () => {
    const req = createRequest("/payslips?product=recruiting");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("client プロダクトは /crm にアクセスできる", async () => {
    const req = createRequest("/crm?product=client");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("recruiting プロダクトは /crm にアクセスできない", async () => {
    const req = createRequest("/crm?product=recruiting");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("全プロダクト共通のルート（/dashboard）はアクセスできる", async () => {
    for (const product of ["recruiting", "working", "client"]) {
      const req = createRequest(`/dashboard?product=${product}`);
      const response = await middleware(req);
      expect(response.status).toBe(200);
    }
  });

  it("ホスト名からプロダクトを検出する", async () => {
    const req = createRequest("/crm", "client.hr1.jp");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});
