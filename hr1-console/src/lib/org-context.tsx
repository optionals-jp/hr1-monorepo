"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";
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
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrgs() {
      const { data } = await supabase.from("organizations").select("*").order("name");

      if (data && data.length > 0) {
        setOrganizations(data);
        // Restore saved org or use first
        const savedId = localStorage.getItem("hr1_org_id");
        const saved = data.find((o: Organization) => o.id === savedId);
        setOrganization(saved || data[0]);
      }
      setLoading(false);
    }
    loadOrgs();
  }, []);

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
