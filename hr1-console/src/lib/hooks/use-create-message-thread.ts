"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";
import * as messageRepository from "@/lib/repositories/message-repository";

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

    const client = getSupabase();

    const { data: existing } = await messageRepository.findThreadByParticipant(
      client,
      organizationId,
      participantId,
      participantType
    );

    if (existing) {
      router.push(`/messages?thread=${existing.id}`);
      setCreatingThread(false);
      return;
    }

    const { data: newThread } = await messageRepository.createThread(client, {
      organization_id: organizationId,
      participant_id: participantId,
      participant_type: participantType,
    });

    setCreatingThread(false);

    if (newThread) {
      router.push(`/messages?thread=${newThread.id}`);
    }
  };

  return { handleOpenMessage, creatingThread };
}
