"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import {
  getSupabaseClient,
  fetchMessagesPage,
  fetchMessagesSince,
  markAsRead,
  fetchOlderMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  fetchSenderProfile,
  markSingleAsRead,
} from "@/lib/hooks/use-messages-page";
import type { MessageThread, Message } from "@/types/database";
import { Send, ArrowLeft, X, Pencil, Trash2, Check, Loader2, Hash, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@hr1/shared-ui/lib/utils";

export const PAGE_SIZE = 30;

export type MessageCache = Map<string, { messages: Message[]; hasMore: boolean }>;

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  const isChannel = thread.is_channel === true;
  const displayName = isChannel
    ? (thread.channel_name ?? "無題")
    : (thread.participant?.display_name ?? thread.participant?.email ?? "不明");
  const isEmployee = thread.participant_type === "employee";

  // --- キャッシュをメッセージ・hasMore の変化に合わせて同期 ---
  useEffect(() => {
    if (messages.length > 0) {
      messageCache.current.set(thread.id, { messages, hasMore });
    }
  }, [messages, hasMore, thread.id, messageCache]);

  // --- 初回メッセージ取得 ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasCached = (messageCache.current.get(thread.id)?.messages.length ?? 0) > 0;

      if (!hasCached) {
        // キャッシュなし: 最新 PAGE_SIZE 件をフルフェッチ
        setLoading(true);
        const { data, count } = await fetchMessagesPage(thread.id, 0, PAGE_SIZE - 1);

        if (cancelled) return;
        const fetched = ((data ?? []) as Message[]).reverse();
        setMessages(fetched);
        setHasMore((count ?? 0) > PAGE_SIZE);
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      } else {
        // キャッシュあり: キャッシュ最終メッセージ以降の差分のみ取得
        const cachedMsgs = messageCache.current.get(thread.id)!.messages;
        const lastCreatedAt = cachedMsgs[cachedMsgs.length - 1].created_at;
        const { data } = await fetchMessagesSince(thread.id, lastCreatedAt);

        if (cancelled) return;
        const newMsgs = (data ?? []) as Message[];
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            return [...prev, ...newMsgs.filter((m) => !ids.has(m.id))];
          });
        }
      }

      // 未読を既読にする
      if (user) {
        markAsRead(thread.id, user.id).then(({ error }) => {
          if (error) console.error("既読更新エラー:", error);
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id, user]);

  // --- ページネーション: 古いメッセージを読み込み ---
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);

    const oldest = messages[0];
    const { data } = await fetchOlderMessages(thread.id, oldest.created_at, PAGE_SIZE - 1);

    const older = ((data ?? []) as Message[]).reverse();

    // スクロール位置を保持
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;

    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length >= PAGE_SIZE);
    setLoadingMore(false);

    // 古いメッセージ挿入後、スクロール位置を復元
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }, [loadingMore, hasMore, messages, thread.id]);

  // スクロール上端でページネーション
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  // --- Realtime: INSERT / UPDATE / DELETE + Presence ---
  useEffect(() => {
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`chat:${thread.id}`)
      // INSERT
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        async (payload) => {
          const { data: sender } = await fetchSenderProfile((payload.new as Message).sender_id);

          const msg = { ...payload.new, sender } as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          if (user && msg.sender_id !== user.id) {
            await markSingleAsRead(msg.id);
          }
        }
      )
      // UPDATE (編集)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, content: updated.content, edited_at: updated.edited_at }
                : m
            )
          );
        }
      )
      // DELETE
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    // Presence (タイピングインジケーター)
    const presenceChannel = supabase.channel(`presence:${thread.id}`, {
      config: { presence: { key: user?.id ?? "anon" } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const typing: string[] = [];
        for (const [uid, presences] of Object.entries(state)) {
          if (uid === user?.id) continue;
          const latest = (presences as { typing?: boolean; display_name?: string }[])?.[0];
          if (latest?.typing) {
            typing.push(latest.display_name ?? "不明");
          }
        }
        setTypingUsers(typing);
      })
      .subscribe();

    channelRef.current = presenceChannel as typeof channelRef.current;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
      channelRef.current = null;
    };
  }, [thread.id, user]);

  // 新着メッセージで自動スクロール（下にいる場合のみ）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // --- タイピングインジケーター送信 ---
  const broadcastTyping = useCallback(
    (typing: boolean) => {
      const ch = channelRef.current;
      if (!ch || !user) return;
      ch.track({
        typing,
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

  // --- メッセージ送信 ---
  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || !user || sending) return;
    if (content.length > 5000) return;

    setSending(true);
    setNewMessage("");
    isTypingRef.current = false;
    broadcastTyping(false);

    const { error } = await sendMessage({
      thread_id: thread.id,
      content,
    });

    if (error) {
      setNewMessage(content);
      console.error("メッセージ送信エラー:", error);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  // --- メッセージ編集 ---
  const handleEditStart = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleEditSave = async () => {
    if (!editingId || !editContent.trim()) return;
    const content = editContent.trim();
    if (content.length > 5000) return;

    const { error } = await editMessage(editingId, user!.id, content);

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

  // --- メッセージ削除 ---
  const handleDelete = async (msgId: string) => {
    if (!window.confirm("削除してもよろしいですか？")) return;
    setDeletingId(null);
    const { error } = await deleteMessage(msgId, user!.id);
    if (error) {
      console.error("メッセージ削除エラー:", error);
    }
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
                  {isEmployee ? "社員" : "応募者"}
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
        {/* ページネーション: もっと読み込む */}
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
            const senderName =
              (msg.sender as unknown as { display_name?: string | null })?.display_name ?? "不明";
            const isEditing = editingId === msg.id;
            const isDeleting = deletingId === msg.id;

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
                    /* 編集モード */
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
                  ) : isDeleting ? (
                    /* 削除確認 */
                    <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
                      <span className="text-xs text-muted-foreground">削除しますか？</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleDelete(msg.id)}
                      >
                        削除
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setDeletingId(null)}
                      >
                        キャンセル
                      </Button>
                    </div>
                  ) : (
                    /* 通常表示 */
                    <div className="relative">
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                          isMe ? "bg-primary text-primary-foreground" : "bg-white border shadow-sm"
                        )}
                      >
                        {msg.content}
                      </div>

                      {/* 自分のメッセージに編集・削除ボタン */}
                      {isMe && (
                        <div className="absolute -left-16 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
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
                            onClick={() => setDeletingId(msg.id)}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                            title="削除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-1 mx-1">
                    {format(new Date(msg.created_at), "HH:mm")}
                    {msg.edited_at && " (編集済み)"}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* タイピングインジケーター */}
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

      {/* メッセージ入力 */}
      <div className="border-t bg-white px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
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
              disabled={sending}
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
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
