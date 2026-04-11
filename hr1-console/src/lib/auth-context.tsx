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
import { getSupabase } from "./supabase/browser";
import { AuthEvent } from "@hr1/shared-ui/lib/auth-events";
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
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissionMap, setPermissionMap] = useState<PermissionMap>(new Map());
  const [loading, setLoading] = useState(true);
  const signingIn = useRef(false);
  const signingOut = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      // onAuthStateChange は内部ロックを保持するため、
      // コールバック内で await してはいけない（デッドロックになる）。
      // 非同期処理はコールバックの外で実行する。
      if (signingIn.current) {
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setPermissionMap(new Map());
        setLoading(false);
        // リフレッシュ失敗等でセッションが失われた場合、即座にログイン画面へ遷移
        // 意図的な signOut() の場合は呼び出し元がリダイレクトを制御する
        if (
          event === AuthEvent.SIGNED_OUT &&
          !signingOut.current &&
          typeof window !== "undefined"
        ) {
          window.location.href = "/login";
        }
        signingOut.current = false;
        return;
      }

      const sessionUser = session.user;

      // TOKEN_REFRESHED ではプロフィール再取得不要（セッション維持のみ）
      if (event === AuthEvent.TOKEN_REFRESHED) {
        setUser((prev) =>
          prev?.id === sessionUser.id
            ? prev
            : { id: sessionUser.id, email: sessionUser.email ?? "" }
        );
        setLoading(false);
        return;
      }

      // INITIAL_SESSION / SIGNED_IN でのみプロフィール取得
      fetchProfile(sessionUser.id)
        .then(async (prof) => {
          if (prof) {
            const perms = await loadPermissions(prof.role);
            setUser({ id: sessionUser.id, email: sessionUser.email ?? "" });
            setProfile(prof);
            setPermissionMap(perms);
          } else {
            await getSupabase().auth.signOut();
            // onAuthStateChange(SIGNED_OUT) → /login リダイレクト
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
    signingOut.current = true;
    await getSupabase().auth.signOut();
    // onAuthStateChange(SIGNED_OUT) で state はクリアされる
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
      const actions = permissionMap?.get(resource);
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
