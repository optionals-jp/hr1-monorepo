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
import { getSupabase } from "./supabase";
import type { Profile } from "@/types/database";

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const signingIn = useRef(false);

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
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // セッション情報を保持し、ロック解放後にプロフィール取得を実行
      const sessionUser = session.user;
      fetchProfile(sessionUser.id)
        .then((prof) => {
          if (prof) {
            setUser({ id: sessionUser.id, email: sessionUser.email ?? "" });
            setProfile(prof);
          } else {
            getSupabase().auth.signOut();
            setUser(null);
            setProfile(null);
          }
        })
        .catch(() => {
          setUser(null);
          setProfile(null);
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

      setUser({ id: authData.user.id, email: authData.user.email ?? "" });
      setProfile(prof);
      return { error: null };
    } finally {
      setTimeout(() => {
        signingIn.current = false;
      }, 0);
    }
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const prof = await fetchProfile(user.id);
    if (prof) setProfile(prof);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
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
