"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "./supabase/browser";
import type { Profile, PermissionAction } from "@/types/database";
import { fetchMyPermissions } from "@/lib/repositories/permission-group-repository";

/** null = admin（全権限バイパス）, Map = employee の権限マップ */
type PermissionMap = Map<string, Set<string>> | null;

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  /** admin は常に true。employee は permissionMap を参照 */
  hasPermission: (resource: string, action: PermissionAction) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CONSOLE_ROLES: Profile["role"][] = ["admin", "employee"];

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  if (!CONSOLE_ROLES.includes(data.role)) return null;
  return data;
}

async function loadPermissions(role: string): Promise<PermissionMap> {
  if (role === "admin") return null;
  try {
    const rows = await fetchMyPermissions(getSupabase());
    const map = new Map<string, Set<string>>();
    for (const row of rows) {
      map.set(row.resource, new Set(row.actions));
    }
    return map;
  } catch {
    return new Map();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissionMap, setPermissionMap] = useState<PermissionMap>(new Map());
  const [loading, setLoading] = useState(true);
  const signingIn = useRef(false);
  // 認証済み状態を追跡するためのフラグ。
  // セッション切れを「ログイン後のセッション切れ」と「未ログイン時の初期化」で区別するために使用。
  const wasAuthenticated = useRef(false);
  // useEffect の依存配列から router を除外しつつ常に最新の router を参照するための ref
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      // onAuthStateChange は内部ロックを保持するため、
      // コールバック内で await してはいけない（デッドロックになる）。
      // 非同期処理はコールバックの外で実行する。
      if (signingIn.current) {
        setLoading(false);
        return;
      }

      if (!session?.user) {
        // 認証済みだった場合のみセッション切れとしてログインページへリダイレクト
        if (wasAuthenticated.current) {
          wasAuthenticated.current = false;
          routerRef.current.push("/login");
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // セッション情報を保持し、ロック解放後にプロフィール取得を実行
      const sessionUser = session.user;
      fetchProfile(sessionUser.id)
        .then(async (prof) => {
          if (prof) {
            const perms = await loadPermissions(prof.role);
            wasAuthenticated.current = true;
            setUser({ id: sessionUser.id, email: sessionUser.email ?? "" });
            setProfile(prof);
            setPermissionMap(perms);
          } else {
            getSupabase().auth.signOut();
            setUser(null);
            setProfile(null);
            setPermissionMap(new Map());
          }
        })
        .catch(() => {
          setUser(null);
          setProfile(null);
          setPermissionMap(new Map());
        })
        .finally(() => {
          setLoading(false);
        });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    signingIn.current = true;
    try {
      const { data: authData, error: authError } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { error: authError.message };
      }

      const prof = await fetchProfile(authData.user.id);
      if (!prof) {
        await getSupabase().auth.signOut();
        return {
          error: "このアカウントにはコンソールへのアクセス権限がありません。",
        };
      }

      const perms = await loadPermissions(prof.role);
      wasAuthenticated.current = true;
      setUser({ id: authData.user.id, email: authData.user.email ?? "" });
      setProfile(prof);
      setPermissionMap(perms);
      return { error: null };
    } finally {
      setTimeout(() => {
        signingIn.current = false;
      }, 0);
    }
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.signInWithOtp({ email });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    signingIn.current = true;
    try {
      const { data: authData, error: authError } = await getSupabase().auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (authError) {
        return { error: authError.message };
      }

      if (!authData.user) {
        return { error: "認証に失敗しました" };
      }

      const prof = await fetchProfile(authData.user.id);
      if (!prof) {
        await getSupabase().auth.signOut();
        return {
          error: "このアカウントにはコンソールへのアクセス権限がありません。",
        };
      }

      const perms = await loadPermissions(prof.role);
      wasAuthenticated.current = true;
      setUser({ id: authData.user.id, email: authData.user.email ?? "" });
      setProfile(prof);
      setPermissionMap(perms);
      return { error: null };
    } finally {
      setTimeout(() => {
        signingIn.current = false;
      }, 0);
    }
  }, []);

  const signOut = useCallback(async () => {
    // onAuthStateChange が null セッションで発火した際に
    // 二重リダイレクトされないよう、先にフラグをクリアする
    wasAuthenticated.current = false;
    await getSupabase().auth.signOut();
    setUser(null);
    setProfile(null);
    setPermissionMap(new Map());
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const prof = await fetchProfile(user.id);
    if (prof) {
      setProfile(prof);
      const perms = await loadPermissions(prof.role);
      setPermissionMap(perms);
    }
  }, [user]);

  const hasPermission = useCallback(
    (resource: string, action: PermissionAction): boolean => {
      if (profile?.role === "admin") return true;
      if (!permissionMap) return false;
      const actions = permissionMap.get(resource);
      return actions?.has(action) ?? false;
    },
    [profile, permissionMap]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        hasPermission,
        signIn,
        signInWithOtp,
        verifyOtp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
