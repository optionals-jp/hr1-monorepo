"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { getSupabase } from "./supabase/browser";
import { useAuth } from "./auth-context";
import type { Organization } from "@/types/database";

interface OrgContextValue {
  organization: Organization | null;
  organizations: Organization[];
  setOrganization: (org: Organization) => void;
  loading: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  organization: null,
  organizations: [],
  setOrganization: () => {},
  loading: true,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserId = useRef<string | null>(null);

  // ユーザーが変わったらリセット（React 18+ render-time setState パターン）
  if (user?.id !== prevUserId.current) {
    prevUserId.current = user?.id ?? null;
    if (!user) {
      if (organizations.length > 0) setOrganizations([]);
      if (organization !== null) setOrganization(null);
      if (loading) setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadOrgs() {
      const { data } = await getSupabase()
        .from("user_organizations")
        .select("organization_id, organizations(*)")
        .eq("user_id", user!.id)
        .order("organization_id");

      if (cancelled) return;

      if (data && data.length > 0) {
        const orgs = data
          .map((uo) => uo.organizations as unknown as Organization | null)
          .filter((o): o is Organization => o !== null);

        setOrganizations(orgs);

        const savedId = localStorage.getItem("hr1_org_id");
        const saved = orgs.find((o) => o.id === savedId);
        setOrganization(saved || orgs[0]);
      }
      setLoading(false);
    }

    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSetOrg = (org: Organization) => {
    setOrganization(org);
    localStorage.setItem("hr1_org_id", org.id);
  };

  return (
    <OrgContext.Provider
      value={{ organization, organizations, setOrganization: handleSetOrg, loading }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
