"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@hr1/shared-ui/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as messageRepo from "@/lib/repositories/message-repository";
import type {
  MessageThread,
  Message,
  MessageAttachment,
  MessageReactionSummary,
} from "@/types/database";
import {
  Send,
  ArrowLeft,
  X,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Hash,
  Users,
  Paperclip,
  SmilePlus,
  Download,
  FileIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@hr1/shared-ui/lib/utils";
import { parseMentionTokens, extractMentionedUserIds } from "@/lib/utils/mention-token";
import { MessagesChannels } from "@/lib/constants/messages-channels";
import { EmojiPicker } from "./emoji-picker";

export const PAGE_SIZE = 30;

export type MessageCache = Map<string, { messages: Message[]; hasMore: boolean }>;

type RpcMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  parent_message_id: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  sender_role: string | null;
  attachments: MessageAttachment[] | null;
  reactions: MessageReactionSummary[] | null;
  mentions: { user_id: string }[] | null;
  reply_count: number;
};

function mapRpcRow(row: RpcMessageRow): Message {
  return {
    id: row.id,
    thread_id: row.thread_id,
    sender_id: row.sender_id,
    content: row.content,
    read_at: row.read_at,
    edited_at: row.edited_at,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    parent_message_id: row.parent_message_id,
    sender: {
      id: row.sender_id,
      email: "",
      display_name: row.sender_display_name,
      last_name: null,
      first_name: null,
      last_name_kana: null,
      first_name_kana: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: (row.sender_role ?? "employee") as any,
      avatar_url: row.sender_avatar_url,
      position: null,
      department: null,
      name_kana: null,
      phone: null,
      hire_date: null,
      birth_date: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    attachments: row.attachments ?? [],
    reactions: row.reactions ?? [],
    mentions: row.mentions ?? [],
    reply_count: Number(row.reply_count ?? 0),
  };
}

export function ThreadChat({
  thread,
  onBack,
  messageCache,
  onShowMembers,
}: {
  thread: MessageThread;
  onBack: () => void;
  messageCache: React.MutableRefObject<MessageCache>;
  onShowMembers?: () => void;
}) {
  const { user, profile: myProfile } = useAuth();
  const cached = messageCache.current.get(thread.id);
  const [messages, setMessages] = useState<Message[]>(cached?.messages ?? []);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presenceChannelRef = useRef<any>(null);

  const isChannel = thread.is_channel === true;
  const displayName = isChannel
    ? (thread.channel_name ?? "無題")
    : (thread.participant?.display_name ?? thread.participant?.email ?? "不明");
  const isEmployee = thread.participant_type === "employee";

  // --- キャッシュ同期 ---
  useEffect(() => {
    if (messages.length > 0) {
      messageCache.current.set(thread.id, { messages, hasMore });
    }
  }, [messages, hasMore, thread.id, messageCache]);

  // --- 添付ファイルの signed URL 取得 ---
  useEffect(() => {
    const paths = new Set<string>();
    for (const m of messages) {
      for (const a of m.attachments ?? []) paths.add(a.storage_path);
    }
    const missing = Array.from(paths).filter((p) => !(p in signedUrls));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        missing.map(async (path) => {
          const { data } = await messageRepo.createAttachmentSignedUrl(getSupabase(), path, 3600);
          return [path, data?.signedUrl ?? ""] as const;
        })
      );
      if (cancelled) return;
      setSignedUrls((prev) => {
        const next = { ...prev };
        for (const [path, url] of results) {
          if (url) next[path] = url;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, signedUrls]);

  // --- 最新メッセージ再取得（debounced） ---
  const refreshLatest = useCallback(async () => {
    const { data } = await messageRepo.getThreadMessages(getSupabase(), thread.id, {
      limit: PAGE_SIZE,
    });
    const latest = ((data ?? []) as RpcMessageRow[]).map(mapRpcRow);
    if (latest.length === 0) return;
    setMessages((prev) => {
      const byId = new Map(latest.map((m) => [m.id, m] as const));
      const merged = prev.map((m) => byId.get(m.id) ?? m);
      // latest に残った（ローカルに無い）ものは末尾へ
      const existingIds = new Set(merged.map((m) => m.id));
      for (const m of latest) {
        if (!existingIds.has(m.id)) merged.push(m);
      }
      merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return merged;
    });
  }, [thread.id]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(refreshLatest, 250);
  }, [refreshLatest]);

  // --- 初回メッセージ取得 ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasCached = (messageCache.current.get(thread.id)?.messages.length ?? 0) > 0;

      if (!hasCached) {
        setLoading(true);
        const { data } = await messageRepo.getThreadMessages(getSupabase(), thread.id, {
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        const fetched = ((data ?? []) as RpcMessageRow[]).map(mapRpcRow);
        setMessages(fetched);
        setHasMore(fetched.length >= PAGE_SIZE);
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      } else {
        // キャッシュあり: 最新分を refresh してリアクション/添付の差分を取り込む
        await refreshLatest();
      }

      if (user) {
        await messageRepo.markThreadRead(getSupabase(), thread.id);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id, user]);

  // --- 古いメッセージを読み込み ---
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);

    const oldest = messages[0];
    const { data } = await messageRepo.getThreadMessages(getSupabase(), thread.id, {
      before: oldest.created_at,
      limit: PAGE_SIZE,
    });
    const older = ((data ?? []) as RpcMessageRow[]).map(mapRpcRow);

    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;

    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length >= PAGE_SIZE);
    setLoadingMore(false);

    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }, [loadingMore, hasMore, messages, thread.id]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  // --- Realtime + Presence ---
  useEffect(() => {
    const supabase = getSupabase();

    const channel = supabase
      .channel(MessagesChannels.messages(thread.id))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const newMsg = payload.new as { id: string; sender_id: string };
          // 添付・リアクション等込みで取り込むため refresh（refreshLatest 内で id dedup）
          scheduleRefresh();
          if (user && newMsg.sender_id !== user.id) {
            void messageRepo.markThreadRead(supabase, thread.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            content: string;
            edited_at: string | null;
            deleted_at: string | null;
          };
          // ソフトデリート: 即座に空化
          if (updated.deleted_at) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updated.id
                  ? {
                      ...m,
                      deleted_at: updated.deleted_at,
                      content: "",
                      attachments: [],
                      reactions: [],
                    }
                  : m
              )
            );
            return;
          }
          // 編集 (content / edited_at) を反映
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, content: updated.content, edited_at: updated.edited_at }
                : m
            )
          );
          // リアクション/添付追従は updated_at bump で来る UPDATE を契機に refresh
          scheduleRefresh();
        }
      )
      .subscribe();

    const presenceChannel = supabase.channel(MessagesChannels.typing(thread.id), {
      config: { presence: { key: user?.id ?? "anon" } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const typing: string[] = [];
        for (const [uid, presences] of Object.entries(state)) {
          if (uid === user?.id) continue;
          const latest = (presences as { is_typing?: boolean; display_name?: string }[])?.[0];
          if (latest?.is_typing) typing.push(latest.display_name ?? "不明");
        }
        setTypingUsers(typing);
      })
      .subscribe();
    presenceChannelRef.current = presenceChannel as typeof presenceChannelRef.current;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [thread.id, user, scheduleRefresh]);

  // 新着メッセージで自動スクロール
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // --- Typing ---
  const broadcastTyping = useCallback(
    (typing: boolean) => {
      const ch = presenceChannelRef.current;
      if (!ch || !user) return;
      ch.track({
        [MessagesChannels.payloadUserId]: user.id,
        [MessagesChannels.payloadIsTyping]: typing,
        display_name: myProfile?.display_name ?? user.email ?? "",
      });
    },
    [user, myProfile?.display_name]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setNewMessage(value);
      if (!isTypingRef.current && value.length > 0) {
        isTypingRef.current = true;
        broadcastTyping(true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        broadcastTyping(false);
      }, 2000);
    },
    [broadcastTyping]
  );

  // --- 送信 ---
  const handleSend = async (attachments?: messageRepo.AttachmentInput[]) => {
    const content = newMessage.trim();
    if ((!content && !attachments?.length) || !user || sending) return;
    if (content.length > 5000) return;

    setSending(true);
    setNewMessage("");
    isTypingRef.current = false;
    broadcastTyping(false);

    const mentionedUserIds = extractMentionedUserIds(content);
    const { error } = await messageRepo.sendMessageV2(getSupabase(), {
      thread_id: thread.id,
      content,
      mentioned_user_ids: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      attachments,
    });

    if (error) {
      setNewMessage(content);
      console.error("メッセージ送信エラー:", error);
    } else {
      // Realtime INSERT を待たずに refresh（自分のメッセージも確実に表示される）
      scheduleRefresh();
    }

    setSending(false);
    inputRef.current?.focus();
  };

  // --- ファイル添付 ---
  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを続けて選択可能にする
    if (!file || !user) return;

    if (file.size > 25 * 1024 * 1024) {
      alert("ファイルサイズは 25MB 以下にしてください");
      return;
    }

    setSending(true);
    try {
      const tempKey = String(Date.now());
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      // Storage RLS は segment[2]=thread_id を検査するため最上位は thread.organization_id に揃える
      const path = `${thread.organization_id}/${thread.id}/${tempKey}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await getSupabase()
        .storage.from("message-attachments")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      await handleSend([
        {
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          byte_size: file.size,
        },
      ]);
    } catch (err) {
      console.error("添付アップロードエラー:", err);
      alert("ファイルの添付に失敗しました");
    } finally {
      setSending(false);
    }
  };

  // --- 編集 ---
  const handleEditStart = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleEditSave = async () => {
    if (!editingId || !editContent.trim()) return;
    const content = editContent.trim();
    if (content.length > 5000) return;

    const { error } = await messageRepo.editMessage(getSupabase(), editingId, user!.id, content);
    if (error) {
      console.error("メッセージ編集エラー:", error);
      return;
    }
    setEditingId(null);
    setEditContent("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  // --- ソフト削除 ---
  const handleSoftDelete = async (msgId: string) => {
    if (!window.confirm("このメッセージを削除しますか？")) return;
    const { error } = await messageRepo.softDeleteMessage(getSupabase(), msgId, user!.id);
    if (error) console.error("メッセージ削除エラー:", error);
  };

  // --- リアクショントグル ---
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    setEmojiPickerFor(null);
    const { error } = await messageRepo.toggleMessageReaction(getSupabase(), msgId, emoji);
    if (error) console.error("リアクションエラー:", error);
    else scheduleRefresh();
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 h-14 border-b px-4 shrink-0">
        <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {isChannel ? (
          <>
            <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <Hash className="h-4 w-4 text-violet-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] px-1.5 py-0 h-4 font-normal border-violet-300 text-violet-700"
                >
                  {thread.channel_type === "department"
                    ? "部署"
                    : thread.channel_type === "project"
                      ? "プロジェクト"
                      : "カスタム"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                <Users className="h-3 w-3 inline mr-1" />
                {thread.member_count ?? 0}人のメンバー
              </p>
            </div>
            {onShowMembers && (
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onShowMembers}>
                <Users className="h-4 w-4 mr-1" />
                メンバー
              </Button>
            )}
          </>
        ) : (
          <>
            <Avatar className="h-8 w-8">
              <AvatarFallback
                className={cn(
                  "text-xs font-medium",
                  isEmployee ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                )}
              >
                {displayName[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[10px] px-1.5 py-0 h-4 font-normal",
                    isEmployee
                      ? "border-emerald-300 text-emerald-700"
                      : "border-blue-300 text-blue-700"
                  )}
                >
                  {isEmployee ? "社員" : "候補者"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {isEmployee
                  ? [thread.participant?.department, thread.participant?.position]
                      .filter(Boolean)
                      .join(" / ") ||
                    (thread.title ?? "")
                  : (thread.job_titles ?? "")}
              </p>
            </div>
          </>
        )}
      </div>

      {/* メッセージ一覧 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
      >
        {hasMore && (
          <div className="text-center py-2">
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <button
                type="button"
                onClick={loadMore}
                className="text-xs text-primary hover:underline"
              >
                古いメッセージを読み込む
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">読み込み中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            メッセージはまだありません。最初のメッセージを送信しましょう。
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const senderName = msg.sender?.display_name ?? "不明";
            const isEditing = editingId === msg.id;
            const isDeleted = !!msg.deleted_at;
            const mentionsMe = (msg.mentions ?? []).some((m) => m.user_id === user?.id);

            return (
              <div key={msg.id} className={cn("flex gap-2 group", isMe && "flex-row-reverse")}>
                {!isMe && (
                  <Avatar className="h-7 w-7 shrink-0 mt-1">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-medium">
                      {senderName[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[70%]", isMe && "flex flex-col items-end")}>
                  {!isMe && (
                    <p className="text-[11px] text-muted-foreground mb-0.5 ml-1">{senderName}</p>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        ref={editInputRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        maxLength={5000}
                        className="text-sm h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleEditSave();
                          }
                          if (e.key === "Escape") handleEditCancel();
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleEditSave}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleEditCancel}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                          isMe ? "bg-primary text-primary-foreground" : "bg-white border shadow-sm",
                          mentionsMe && !isMe && "border-l-4 border-l-amber-400",
                          isDeleted && "bg-slate-100 text-muted-foreground italic"
                        )}
                      >
                        {/* 添付プレビュー */}
                        {!isDeleted && (msg.attachments?.length ?? 0) > 0 && (
                          <div className="space-y-2 mb-2">
                            {msg.attachments!.map((a) => (
                              <AttachmentView
                                key={a.id}
                                attachment={a}
                                signedUrl={signedUrls[a.storage_path]}
                              />
                            ))}
                          </div>
                        )}
                        {/* 本文 */}
                        {isDeleted ? (
                          <span>このメッセージは削除されました</span>
                        ) : (
                          <MessageContent content={msg.content} />
                        )}
                      </div>

                      {/* アクション: 自分のメッセージは編集・削除、相手メッセージはリアクション */}
                      {!isDeleted && (
                        <div
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 items-center gap-0.5",
                            emojiPickerFor === msg.id ? "flex" : "hidden group-hover:flex",
                            isMe ? "right-full mr-1" : "left-full ml-1"
                          )}
                        >
                          <Popover
                            open={emojiPickerFor === msg.id}
                            onOpenChange={(open) => setEmojiPickerFor(open ? msg.id : null)}
                          >
                            <PopoverTrigger
                              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                              title="リアクション"
                            >
                              <SmilePlus className="h-3 w-3" />
                            </PopoverTrigger>
                            <PopoverContent
                              className="p-0 w-auto gap-0 rounded-2xl sm:rounded-3xl"
                              align={isMe ? "end" : "start"}
                            >
                              <EmojiPicker
                                onSelect={(emoji) => handleToggleReaction(msg.id, emoji)}
                              />
                            </PopoverContent>
                          </Popover>
                          {isMe && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditStart(msg)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                title="編集"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSoftDelete(msg.id)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                                title="削除"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* リアクションバー */}
                  {!isDeleted && (msg.reactions?.length ?? 0) > 0 && (
                    <div className={cn("flex flex-wrap gap-1 mt-1", isMe && "justify-end")}>
                      {msg.reactions!.map((r) => (
                        <ReactionChip
                          key={r.emoji}
                          reaction={r}
                          reactedBySelf={!!user && r.user_ids.includes(user.id)}
                          onToggle={() => handleToggleReaction(msg.id, r.emoji)}
                        />
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-1 mx-1">
                    {format(new Date(msg.created_at), "HH:mm")}
                    {msg.edited_at && !isDeleted && " (編集済み)"}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-9">
            <span className="inline-flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
            {typingUsers.join("、")}が入力中...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t bg-white px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleAttach}
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
            title="ファイル添付"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <div className="flex-1 flex items-center rounded-3xl border bg-gray-50 px-4 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
            <textarea
              ref={inputRef}
              placeholder="メッセージを入力..."
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              maxLength={5000}
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground resize-none max-h-32 leading-6"
              style={{ height: "auto", minHeight: "24px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={sending}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!newMessage.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

function MessageContent({ content }: { content: string }) {
  const segments = parseMentionTokens(content);
  if (segments.length === 0 || segments.every((s) => !s.userId)) {
    return <span className="whitespace-pre-wrap wrap-break-word">{content}</span>;
  }
  return (
    <span className="whitespace-pre-wrap wrap-break-word">
      {segments.map((seg, idx) =>
        seg.userId ? (
          <span key={idx} className="font-semibold">
            {seg.text}
          </span>
        ) : (
          <React.Fragment key={idx}>{seg.text}</React.Fragment>
        )
      )}
    </span>
  );
}

function ReactionChip({
  reaction,
  reactedBySelf,
  onToggle,
}: {
  reaction: MessageReactionSummary;
  reactedBySelf: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 h-6 px-2 rounded-full border text-xs transition-colors",
        reactedBySelf
          ? "bg-blue-50 border-blue-400 text-blue-700"
          : "bg-muted/60 border-transparent text-muted-foreground hover:bg-muted hover:border-border"
      )}
    >
      <span>{reaction.emoji}</span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  );
}

function AttachmentView({
  attachment,
  signedUrl,
}: {
  attachment: MessageAttachment;
  signedUrl: string | undefined;
}) {
  const isImage = attachment.mime_type.startsWith("image/");

  if (isImage) {
    if (!signedUrl) {
      return (
        <div className="h-40 w-full max-w-xs flex items-center justify-center bg-slate-200 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={attachment.file_name}
          className="max-w-xs max-h-64 rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={signedUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-current/10 border border-current/20 rounded-lg hover:bg-current/20 transition-colors max-w-xs"
    >
      <FileIcon className="h-5 w-5 shrink-0 opacity-80" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{attachment.file_name}</p>
        <p className="text-[10px] opacity-70">{formatBytes(attachment.byte_size)}</p>
      </div>
      {signedUrl && <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />}
    </a>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
