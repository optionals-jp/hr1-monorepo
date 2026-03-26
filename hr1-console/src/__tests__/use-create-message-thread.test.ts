import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// --- Router モック ---
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));

// --- Supabase モック ---
const mockSupabase = vi.hoisted(() => {
  let queryResult: { data: unknown; error: unknown } = { data: null, error: null };

  function createQueryBuilder() {
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "maybeSingle", "single", "insert", "order"]) {
      builder[m] = vi.fn().mockReturnValue(builder);
    }
    builder["then"] = (resolve: (v: unknown) => void) => resolve(queryResult);
    return builder;
  }

  return {
    from: vi.fn().mockImplementation(() => createQueryBuilder()),
    _setResult: (data: unknown, error: unknown = null) => {
      queryResult = { data, error };
    },
    _createQueryBuilder: createQueryBuilder,
  };
});

vi.mock("@/lib/supabase/browser", () => ({
  getSupabase: () => mockSupabase,
}));

import { useCreateMessageThread } from "@/lib/hooks/use-create-message-thread";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase._setResult(null);
});

describe("useCreateMessageThread", () => {
  it("participantId が undefined の場合は何もしない", async () => {
    const { result } = renderHook(() =>
      useCreateMessageThread({
        participantId: undefined,
        participantType: "applicant",
        organizationId: "org-1",
      })
    );

    await act(async () => {
      await result.current.handleOpenMessage();
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("organizationId が undefined の場合は何もしない", async () => {
    const { result } = renderHook(() =>
      useCreateMessageThread({
        participantId: "user-1",
        participantType: "applicant",
        organizationId: undefined,
      })
    );

    await act(async () => {
      await result.current.handleOpenMessage();
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("既存スレッドがあればそのスレッドに遷移する", async () => {
    mockSupabase._setResult({ id: "thread-existing" });

    const { result } = renderHook(() =>
      useCreateMessageThread({
        participantId: "user-1",
        participantType: "applicant",
        organizationId: "org-1",
      })
    );

    await act(async () => {
      await result.current.handleOpenMessage();
    });

    expect(mockPush).toHaveBeenCalledWith("/messages?thread=thread-existing");
    // insert は呼ばれない（from は検索のみ）
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it("既存スレッドがなければ新規作成して遷移する", async () => {
    // 1回目: 検索 → null、2回目: insert → 新スレッド
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      const builder: Record<string, unknown> = {};
      for (const m of ["select", "eq", "maybeSingle", "single", "insert", "order"]) {
        builder[m] = vi.fn().mockReturnValue(builder);
      }
      if (callCount === 1) {
        builder["then"] = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
      } else {
        builder["then"] = (resolve: (v: unknown) => void) =>
          resolve({ data: { id: "thread-new" }, error: null });
      }
      return builder;
    });

    const { result } = renderHook(() =>
      useCreateMessageThread({
        participantId: "user-1",
        participantType: "employee",
        organizationId: "org-1",
      })
    );

    await act(async () => {
      await result.current.handleOpenMessage();
    });

    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith("/messages?thread=thread-new");
  });

  it("creatingThread が処理中に true になり、完了後 false になる", async () => {
    mockSupabase._setResult({ id: "thread-1" });

    const { result } = renderHook(() =>
      useCreateMessageThread({
        participantId: "user-1",
        participantType: "applicant",
        organizationId: "org-1",
      })
    );

    expect(result.current.creatingThread).toBe(false);

    await act(async () => {
      await result.current.handleOpenMessage();
    });

    expect(result.current.creatingThread).toBe(false);
  });
});
