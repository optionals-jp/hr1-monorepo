"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery, useEmployees } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import {
  fetchLead,
  fetchActivitiesByLead,
  createActivity,
  createCompany,
  createContact,
  createDeal,
  updateLead,
  deleteLead,
  deleteCompany,
  deleteContact,
} from "@/lib/repositories/crm-repository";
import type { BcLead, BcActivity } from "@/types/database";

export function useCrmLeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: employees } = useEmployees();

  const { data: lead, mutate: mutateLead } = useOrgQuery<BcLead | null>(`crm-lead-${id}`, (orgId) =>
    fetchLead(getSupabase(), id, orgId)
  );

  const { data: activities, mutate: mutateActivities } = useOrgQuery<BcActivity[]>(
    `crm-lead-activities-${id}`,
    (orgId) => fetchActivitiesByLead(getSupabase(), id, orgId)
  );

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Activity state
  const [actOpen, setActOpen] = useState(false);
  const [actType, setActType] = useState("call");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actDate, setActDate] = useState(new Date().toISOString().slice(0, 10));

  // Convert state
  const [convertOpen, setConvertOpen] = useState(false);
  const [convCompanyName, setConvCompanyName] = useState("");
  const [convLastName, setConvLastName] = useState("");
  const [convEmail, setConvEmail] = useState("");
  const [convPhone, setConvPhone] = useState("");
  const [convDealTitle, setConvDealTitle] = useState("");
  const [converting, setConverting] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openEdit = useCallback(() => {
    if (!lead) return;
    setEditName(lead.name);
    setEditContactName(lead.contact_name ?? "");
    setEditContactEmail(lead.contact_email ?? "");
    setEditContactPhone(lead.contact_phone ?? "");
    setEditSource(lead.source);
    setEditAssignedTo(lead.assigned_to ?? "");
    setEditNotes(lead.notes ?? "");
    setEditOpen(true);
  }, [lead]);

  const openConvert = useCallback(() => {
    if (!lead) return;
    setConvCompanyName(lead.name);
    setConvLastName(lead.contact_name ?? "");
    setConvEmail(lead.contact_email ?? "");
    setConvPhone(lead.contact_phone ?? "");
    setConvDealTitle("");
    setConvertOpen(true);
  }, [lead]);

  const handleUpdate = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !id) return { success: false };
    try {
      await updateLead(getSupabase(), id, organization.id, {
        name: editName,
        contact_name: editContactName || null,
        contact_email: editContactEmail || null,
        contact_phone: editContactPhone || null,
        source: editSource as BcLead["source"],
        assigned_to: editAssignedTo || null,
        notes: editNotes || null,
      });
      setEditOpen(false);
      mutateLead();
      return { success: true };
    } catch {
      return { success: false, error: "更新に失敗しました" };
    }
  }, [
    organization,
    id,
    editName,
    editContactName,
    editContactEmail,
    editContactPhone,
    editSource,
    editAssignedTo,
    editNotes,
    mutateLead,
  ]);

  const handleStatusChange = useCallback(
    async (
      newStatus: string
    ): Promise<{ success: boolean; error?: string; statusLabel?: string }> => {
      if (!organization || !id) return { success: false };
      try {
        await updateLead(getSupabase(), id, organization.id, {
          status: newStatus as BcLead["status"],
        });
        mutateLead();
        return { success: true, statusLabel: newStatus };
      } catch {
        return { success: false, error: "ステータス変更に失敗しました" };
      }
    },
    [organization, id, mutateLead]
  );

  const handleDelete = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization) return { success: false };
    try {
      await deleteLead(getSupabase(), id, organization.id);
      return { success: true };
    } catch {
      return { success: false, error: "削除に失敗しました" };
    }
  }, [organization, id]);

  const handleAddActivity = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !actTitle.trim()) return { success: false };
    try {
      await createActivity(getSupabase(), {
        organization_id: organization.id,
        lead_id: id,
        activity_type: actType,
        title: actTitle,
        description: actDesc || null,
        activity_date: actDate,
        created_by: user?.id ?? null,
      });
      setActOpen(false);
      setActTitle("");
      setActDesc("");
      setActType("call");
      mutateActivities();
      return { success: true };
    } catch {
      return { success: false, error: "記録に失敗しました" };
    }
  }, [organization, id, actType, actTitle, actDesc, actDate, user, mutateActivities]);

  const handleConvert = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
    companyId?: string;
  }> => {
    if (!organization || !convCompanyName.trim() || !convLastName.trim()) {
      return { success: false, error: "企業名と担当者姓は必須です" };
    }
    setConverting(true);
    try {
      // 1. Create company
      const newCompany = await createCompany(getSupabase(), {
        organization_id: organization.id,
        name: convCompanyName,
        phone: convPhone || null,
        created_by: user?.id ?? null,
      });

      try {
        // 2. Create contact
        const newContact = await createContact(getSupabase(), {
          organization_id: organization.id,
          company_id: newCompany.id,
          last_name: convLastName,
          email: convEmail || null,
          phone: convPhone || null,
          created_by: user?.id ?? null,
        });

        try {
          // 3. Optionally create deal
          let newDealId: string | null = null;
          if (convDealTitle.trim()) {
            const newDeal = await createDeal(getSupabase(), {
              organization_id: organization.id,
              title: convDealTitle,
              company_id: newCompany.id,
              contact_id: newContact.id,
              assigned_to: lead?.assigned_to ?? user?.id ?? null,
              created_by: user?.id ?? null,
            });
            newDealId = newDeal.id;
          }

          // 4. Update lead as converted
          await updateLead(getSupabase(), id, organization.id, {
            status: "converted",
            converted_company_id: newCompany.id,
            converted_contact_id: newContact.id,
            converted_deal_id: newDealId,
            converted_at: new Date().toISOString(),
          });

          setConvertOpen(false);
          return { success: true, companyId: newCompany.id };
        } catch {
          // Rollback: delete contact and company
          await deleteContact(getSupabase(), newContact.id, organization.id);
          await deleteCompany(getSupabase(), newCompany.id, organization.id);
          throw new Error("conversion_failed");
        }
      } catch (e) {
        if (e instanceof Error && e.message !== "conversion_failed") {
          // Rollback: delete company only (contact creation failed)
          await deleteCompany(getSupabase(), newCompany.id, organization.id);
        }
        throw e;
      }
    } catch {
      return { success: false, error: "コンバートに失敗しました" };
    } finally {
      setConverting(false);
    }
  }, [
    organization,
    id,
    convCompanyName,
    convLastName,
    convEmail,
    convPhone,
    convDealTitle,
    lead,
    user,
  ]);

  return {
    id,
    lead,
    activities,
    employees,

    // Edit state
    editOpen,
    setEditOpen,
    editName,
    setEditName,
    editContactName,
    setEditContactName,
    editContactEmail,
    setEditContactEmail,
    editContactPhone,
    setEditContactPhone,
    editSource,
    setEditSource,
    editAssignedTo,
    setEditAssignedTo,
    editNotes,
    setEditNotes,

    // Activity state
    actOpen,
    setActOpen,
    actType,
    setActType,
    actTitle,
    setActTitle,
    actDesc,
    setActDesc,
    actDate,
    setActDate,

    // Convert state
    convertOpen,
    setConvertOpen,
    convCompanyName,
    setConvCompanyName,
    convLastName,
    setConvLastName,
    convEmail,
    setConvEmail,
    convPhone,
    setConvPhone,
    convDealTitle,
    setConvDealTitle,
    converting,

    // Delete state
    deleteOpen,
    setDeleteOpen,

    // Actions
    openEdit,
    openConvert,
    handleUpdate,
    handleStatusChange,
    handleDelete,
    handleAddActivity,
    handleConvert,
  };
}
