import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";

// vi.hoisted で vi.mock ファクトリーから参照可能なモックを定義
const mockSupabase = vi.hoisted(() => {
  function createQueryBuilder(data: unknown, error: unknown) {
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order", "single"]) {
      builder[m] = vi.fn().mockReturnValue(builder);
    }
    builder["then"] = (resolve: (v: unknown) => void) => resolve({ data, error });
    return builder;
  }

  return {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi
        .fn()
        .mockImplementation((cb: (event: string, session: unknown) => void) => {
          Promise.resolve().then(() => cb("INITIAL_SESSION", null));
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
    },
    from: vi.fn().mockReturnValue(createQueryBuilder(null, { message: "Not found" })),
    _createQueryBuilder: createQueryBuilder,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
}));

import { AuthProvider, useAuth } from "@/lib/auth-context";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function mockProfileQuery(profile: { role: string; id?: string; email?: string } | null) {
  const data = profile
    ? {
        id: profile.id ?? "user-1",
        email: profile.email ?? "test@example.com",
        display_name: "Test User",
        role: profile.role,
        avatar_url: null,
        department: null,
        position: null,
        hiring_type: null,
        graduation_year: null,
        created_at: "2024-01-01",
      }
    : null;
  mockSupabase.from.mockReturnValue(
    mockSupabase._createQueryBuilder(data, profile ? null : { message: "Not found" })
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue(
      mockSupabase._createQueryBuilder(null, { message: "Not found" })
    );
    mockSupabase.auth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        Promise.resolve().then(() => cb("INITIAL_SESSION", null));
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );
  });

  it("初期状態でセッションなし → user/profile は null", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("signIn: 認証成功 + admin ロール → user と profile が設定される", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", email: "admin@example.com" } },
      error: null,
    });
    mockProfileQuery({ role: "admin", id: "user-1", email: "admin@example.com" });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: { error: string | null } | undefined;
    await act(async () => {
      signInResult = await result.current.signIn("admin@example.com", "password");
    });

    expect(signInResult?.error).toBeNull();
    expect(result.current.user).toEqual({ id: "user-1", email: "admin@example.com" });
    expect(result.current.profile?.role).toBe("admin");
  });

  it("signIn: 認証成功 + employee ロール → アクセス許可", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-2", email: "emp@example.com" } },
      error: null,
    });
    mockProfileQuery({ role: "employee", id: "user-2", email: "emp@example.com" });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: { error: string | null } | undefined;
    await act(async () => {
      signInResult = await result.current.signIn("emp@example.com", "password");
    });

    expect(signInResult?.error).toBeNull();
    expect(result.current.profile?.role).toBe("employee");
  });

  it("signIn: 認証成功 + applicant ロール → エラー + サインアウト", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-3", email: "applicant@example.com" } },
      error: null,
    });
    mockProfileQuery({ role: "applicant", id: "user-3" });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: { error: string | null } | undefined;
    await act(async () => {
      signInResult = await result.current.signIn("applicant@example.com", "password");
    });

    expect(signInResult?.error).toContain("アクセス権限がありません");
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it("signIn: 認証失敗 → エラーメッセージを返す", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: { error: string | null } | undefined;
    await act(async () => {
      signInResult = await result.current.signIn("bad@example.com", "wrong");
    });

    expect(signInResult?.error).toBe("Invalid login credentials");
    expect(result.current.user).toBeNull();
  });

  it("onAuthStateChange: SIGNED_IN で user/profile が設定される", async () => {
    // onAuthStateChange のコールバックを保持
    let authCb: ((event: string, session: unknown) => void) | null = null;
    mockSupabase.auth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        authCb = cb;
        Promise.resolve().then(() => cb("INITIAL_SESSION", null));
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockProfileQuery({ role: "admin", id: "user-1", email: "admin@example.com" });

    await act(async () => {
      authCb!("SIGNED_IN", { user: { id: "user-1", email: "admin@example.com" } });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual({ id: "user-1", email: "admin@example.com" });
      expect(result.current.profile?.role).toBe("admin");
    });
  });

  it("signOut: user と profile がクリアされる", async () => {
    // セッションありの初期状態を作る
    mockProfileQuery({ role: "admin", id: "user-1", email: "admin@example.com" });
    mockSupabase.auth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        Promise.resolve().then(() =>
          cb("INITIAL_SESSION", { user: { id: "user-1", email: "admin@example.com" } })
        );
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).not.toBeNull();
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});

describe("useAuth", () => {
  it("AuthProvider 外で使用すると throw する", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");
  });
});
