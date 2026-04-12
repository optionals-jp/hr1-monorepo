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
import { AuthEvent } from "@hr1/shared-ui/lib/auth-events";
import type { Profile } from "@/types/database";

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ALLOWED_ROLES: Profile["role"][] = ["hr1_admin"];

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  if (!ALLOWED_ROLES.includes(data.role)) return null;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const signingIn = useRef(false);
  const signingOut = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      // onAuthStateChange は内部ロックを保持するため、
      // コールバック内で await してはいけない（デッドロックになる）。
      if (signingIn.current) {
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
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
            setUser({ id: sessionUser.id, email: sessionUser.email ?? "" });
            setProfile(prof);
          } else {
            await getSupabase().auth.signOut();
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
          error: "このアカウントには管理サイトへのアクセス権限がありません。",
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
    signingOut.current = true;
    await getSupabase().auth.signOut();
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
