"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";

type ParticipantType = "applicant" | "employee";

interface UseCreateMessageThreadParams {
  participantId: string | undefined;
  participantType: ParticipantType;
  organizationId: string | undefined;
}

/**
 * メッセージスレッドの作成・既存スレッドへの遷移を行うフック。
 * 既存スレッドがあればそこへ、なければ新規作成して遷移する。
 */
export function useCreateMessageThread({
  participantId,
  participantType,
  organizationId,
}: UseCreateMessageThreadParams) {
  const router = useRouter();
  const [creatingThread, setCreatingThread] = useState(false);

  const handleOpenMessage = async () => {
    if (!participantId || !organizationId) return;

    setCreatingThread(true);

    // 既存スレッドを検索
    const { data: existing } = await getSupabase()
      .from("message_threads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("participant_id", participantId)
      .eq("participant_type", participantType)
      .maybeSingle();

    if (existing) {
      router.push(`/messages?thread=${existing.id}`);
      setCreatingThread(false);
      return;
    }

    // 新規スレッド作成
    const { data: newThread } = await getSupabase()
      .from("message_threads")
      .insert({
        organization_id: organizationId,
        participant_id: participantId,
        participant_type: participantType,
      })
      .select("id")
      .single();

    setCreatingThread(false);

    if (newThread) {
      router.push(`/messages?thread=${newThread.id}`);
    }
  };

  return { handleOpenMessage, creatingThread };
}
