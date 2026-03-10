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
import { supabase } from "./supabase";
import type { Profile } from "@/types/database";

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CONSOLE_ROLES: Profile["role"][] = ["admin", "employee"];

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error || !data) return null;
  if (!CONSOLE_ROLES.includes(data.role)) return null;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // signIn 処理中は onAuthStateChange での状態更新をスキップ
  const signingIn = useRef(false);

  // onAuthStateChange はセッション復元（ページリロード、トークンリフレッシュ）を担当
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // signIn が処理中の場合はスキップ（signIn 内で直接状態を設定する）
      if (signingIn.current) {
        setLoading(false);
        return;
      }

      try {
        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (prof) {
            setUser({
              id: session.user.id,
              email: session.user.email ?? "",
            });
            setProfile(prof);
          } else {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch {
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // signIn は認証・ロールチェック・状態更新をすべて担当
  const signIn = useCallback(async (email: string, password: string) => {
    signingIn.current = true;
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { error: authError.message };
      }

      const prof = await fetchProfile(authData.user.id);
      if (!prof) {
        await supabase.auth.signOut();
        return {
          error: "このアカウントにはコンソールへのアクセス権限がありません。",
        };
      }

      setUser({ id: authData.user.id, email: authData.user.email ?? "" });
      setProfile(prof);
      return { error: null };
    } finally {
      // onAuthStateChange の pending コールバックが処理されてからリセット
      setTimeout(() => {
        signingIn.current = false;
      }, 0);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
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
