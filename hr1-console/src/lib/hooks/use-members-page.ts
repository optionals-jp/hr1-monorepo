"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as memberRepo from "@/lib/repositories/member-repository";
import * as permRepo from "@/lib/repositories/permission-group-repository";
import type { MemberWithRole } from "@/lib/repositories/member-repository";
import type { PermissionGroup } from "@/types/database";

export type { MemberWithRole };

export function useMembersPage() {
  const { organization } = useOrg();
  const { profile } = useAuth();
  const [members, setMembers] = useState<MemberWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "employee">("employee");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Permission group assignment
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [groupEditUserId, setGroupEditUserId] = useState<string | null>(null);
  const [groupEditSelected, setGroupEditSelected] = useState<string[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);
  const [memberGroupMap, setMemberGroupMap] = useState<
    Record<string, { id: string; name: string }[]>
  >({});

  const isAdmin = profile?.role === "admin";

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const [data, groups] = await Promise.all([
      memberRepo.findMembers(getSupabase(), organization.id),
      permRepo.findGroups(getSupabase(), organization.id),
    ]);
    setMembers(data);
    setPermissionGroups(groups);

    // Load group assignments for all members in a single query
    const allMemberGroups = await permRepo.findMemberGroupsBulk(
      getSupabase(),
      data.map((m) => m.id)
    );
    const groupMap: Record<string, { id: string; name: string }[]> = {};
    for (const mg of allMemberGroups) {
      if (!groupMap[mg.user_id]) groupMap[mg.user_id] = [];
      groupMap[mg.user_id].push(mg.permission_groups);
    }
    setMemberGroupMap(groupMap);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    if (organization) void load();
  }, [organization, load]);

  const openInvite = () => {
    setInviteEmail("");
    setInviteRole("employee");
    setInviteError(null);
    setInviteSuccess(false);
    setInviteOpen(true);
  };

  const handleInvite = async () => {
    if (!organization || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await memberRepo.inviteMember(getSupabase(), {
        email: inviteEmail.trim(),
        role: inviteRole,
        organization_id: organization.id,
      });
      setInviteSuccess(true);
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "招待に失敗しました");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: "admin" | "employee") => {
    await memberRepo.updateMemberRole(getSupabase(), userId, role);
    await load();
  };

  const openGroupEdit = (userId: string) => {
    const current = memberGroupMap[userId] ?? [];
    setGroupEditUserId(userId);
    setGroupEditSelected(current.map((g) => g.id));
    setGroupEditOpen(true);
  };

  const toggleGroupSelection = (groupId: string) => {
    setGroupEditSelected((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const saveGroupAssignment = async () => {
    if (!groupEditUserId) return;
    setGroupSaving(true);
    try {
      await permRepo.replaceMemberGroups(getSupabase(), groupEditUserId, groupEditSelected);
      setGroupEditOpen(false);
      await load();
    } finally {
      setGroupSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.email.toLowerCase().includes(q) ||
        (m.display_name && m.display_name.toLowerCase().includes(q)) ||
        (m.position && m.position.toLowerCase().includes(q))
    );
  }, [members, search]);

  return {
    organization,
    members,
    filtered,
    loading,
    isAdmin,
    currentUserId: profile?.id,
    search,
    setSearch,
    inviteOpen,
    setInviteOpen,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviting,
    inviteError,
    inviteSuccess,
    openInvite,
    handleInvite,
    handleRoleChange,
    permissionGroups,
    memberGroupMap,
    groupEditOpen,
    setGroupEditOpen,
    groupEditUserId,
    groupEditSelected,
    toggleGroupSelection,
    groupSaving,
    openGroupEdit,
    saveGroupAssignment,
  };
}
