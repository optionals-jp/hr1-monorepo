"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { MessageThread, Message, Profile } from "@/types/database";
import {
  Search,
  Send,
  MessageSquare,
  ArrowLeft,
  Plus,
  X,
  Pencil,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

export default function MessagesPage() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get("thread")
  );
  const [search, setSearch] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);

  // --- スレッド一覧 (RPC で1回のクエリで取得) ---
  const {
    data: threads = [],
    isLoading: threadsLoading,
    mutate: mutateThreads,
  } = useQuery<MessageThread[]>(
    organization && user ? `message-threads-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase().rpc("get_threads_with_details", {
        p_org_id: organization!.id,
        p_user_id: user!.id,
      });

      if (!data) return [];

      return (data as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        organization_id: row.organization_id as string,
        participant_id: row.participant_id as string,
        participant_type: (row.participant_type as "applicant" | "employee") ?? "applicant",
        title: row.title as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        participant: {
          id: row.participant_id as string,
          display_name: row.participant_display_name as string | null,
          email: row.participant_email as string,
          avatar_url: row.participant_avatar_url as string | null,
          department: row.participant_department as string | null,
          position: row.participant_position as string | null,
        },
        job_titles: (row.job_titles as string | null) ?? null,
        application_count: Number(row.application_count ?? 0),
        latest_message: row.latest_message_id
          ? {
              id: row.latest_message_id as string,
              thread_id: row.id as string,
              sender_id: row.latest_message_sender_id as string,
              content: row.latest_message_content as string,
              read_at: null,
              created_at: row.latest_message_created_at as string,
              sender: { display_name: row.latest_message_sender_name as string | null },
            }
          : undefined,
        unread_count: Number(row.unread_count ?? 0),
      })) as MessageThread[];
    }
  );

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = t.participant?.display_name?.toLowerCase() ?? "";
    const email = t.participant?.email?.toLowerCase() ?? "";
    const jobTitles = t.job_titles?.toLowerCase() ?? "";
    return name.includes(s) || email.includes(s) || jobTitles.includes(s);
  });

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <PageHeader
        title="メッセージ"
        description="応募者・社員とのメッセージ管理"
        sticky={false}
        action={
          <Button size="sm" onClick={() => setShowNewThread(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            新規メッセージ
          </Button>
        }
      />

      {showNewThread && (
        <NewThreadPanel
          onCreated={async (threadId) => {
            setShowNewThread(false);
            await mutateThreads();
            setSelectedThreadId(threadId);
          }}
          onClose={() => setShowNewThread(false)}
        />
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden bg-white border-t">
        {/* スレッド一覧（左パネル） */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r flex flex-col shrink-0",
            selectedThreadId ? "hidden md:flex" : "flex"
          )}
        >
          <div className="px-3 py-3">
            <div className="flex items-center rounded-full bg-gray-100 px-4 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                placeholder="検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ml-2"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">読み込み中...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search ? "一致するスレッドがありません" : "メッセージスレッドがありません"}
                </p>
              </div>
            ) : (
              filtered.map((thread) => {
                const displayName =
                  thread.participant?.display_name ?? thread.participant?.email ?? "不明";
                const initial = displayName[0]?.toUpperCase() ?? "?";
                const isSelected = thread.id === selectedThreadId;
                const hasUnread = (thread.unread_count ?? 0) > 0;
                const isEmployee = thread.participant_type === "employee";
                const subtitleText = isEmployee
                  ? [thread.participant?.department, thread.participant?.position]
                      .filter(Boolean)
                      .join(" / ") ||
                    (thread.title ?? "社員")
                  : (thread.job_titles ?? "");

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent/50",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                        <AvatarFallback
                          className={cn(
                            "text-xs font-medium",
                            isEmployee
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          )}
                        >
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn(
                                "text-sm truncate",
                                hasUnread ? "font-semibold" : "font-medium"
                              )}
                            >
                              {displayName}
                            </span>
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
                          </span>
                          {thread.latest_message && (
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {format(new Date(thread.latest_message.created_at), "MM/dd")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {subtitleText}
                        </p>
                        {thread.latest_message && (
                          <p
                            className={cn(
                              "text-xs truncate mt-1",
                              hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                            )}
                          >
                            {thread.latest_message.content}
                          </p>
                        )}
                      </div>
                      {hasUnread && (
                        <Badge
                          variant="default"
                          className="h-5 min-w-5 px-1.5 text-[10px] shrink-0 mt-1"
                        >
                          {thread.unread_count}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* チャット詳細（右パネル） */}
        <div className={cn("flex-1 flex flex-col", !selectedThreadId ? "hidden md:flex" : "flex")}>
          {selectedThread ? (
            <ThreadChat
              key={selectedThread.id}
              thread={selectedThread}
              onBack={() => setSelectedThreadId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">スレッドを選択してください</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// スレッドチャットコンポーネント
// ---------------------------------------------------------------------------

function ThreadChat({ thread, onBack }: { thread: MessageThread; onBack: () => void }) {
  const { user, profile: myProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
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

  const displayName = thread.participant?.display_name ?? thread.participant?.email ?? "不明";
  const isEmployee = thread.participant_type === "employee";

  // --- 初回メッセージ取得 (最新 PAGE_SIZE 件) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, count } = await getSupabase()
        .from("messages")
        .select("*, sender:sender_id(id, display_name, avatar_url, role)", { count: "exact" })
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (cancelled) return;
      const fetched = ((data ?? []) as Message[]).reverse();
      setMessages(fetched);
      setHasMore((count ?? 0) > PAGE_SIZE);
      setLoading(false);

      // 未読を既読にする
      if (user) {
        getSupabase()
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("thread_id", thread.id)
          .neq("sender_id", user.id)
          .is("read_at", null)
          .then();
      }

      // 初回は一番下へスクロール
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    })();
    return () => {
      cancelled = true;
    };
  }, [thread.id, user]);

  // --- ページネーション: 古いメッセージを読み込み ---
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);

    const oldest = messages[0];
    const { data, count } = await getSupabase()
      .from("messages")
      .select("*, sender:sender_id(id, display_name, avatar_url, role)", { count: "exact" })
      .eq("thread_id", thread.id)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

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
    const supabase = getSupabase();

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
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, role")
            .eq("id", (payload.new as Message).sender_id)
            .single();

          const msg = { ...payload.new, sender } as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          if (user && msg.sender_id !== user.id) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", msg.id);
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

    const { error } = await getSupabase().from("messages").insert({
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

    await getSupabase()
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", editingId);

    setEditingId(null);
    setEditContent("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  // --- メッセージ削除 ---
  const handleDelete = async (msgId: string) => {
    setDeletingId(null);
    await getSupabase().from("messages").delete().eq("id", msgId);
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 h-14 border-b px-4 shrink-0">
        <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
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
                isEmployee ? "border-emerald-300 text-emerald-700" : "border-blue-300 text-blue-700"
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

// ---------------------------------------------------------------------------
// 新規スレッド作成パネル
// ---------------------------------------------------------------------------

function NewThreadPanel({
  onCreated,
  onClose,
}: {
  onCreated: (threadId: string) => void;
  onClose: () => void;
}) {
  const { organization } = useOrg();
  const [tab, setTab] = useState<"applicant" | "employee">("applicant");
  const [appSearch, setAppSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // スレッドが未作成の応募者一覧を取得（応募者単位で重複排除）
  type ApplicantWithJobs = Profile & { job_titles: string };
  const { data: applicants = [], isLoading: appsLoading } = useQuery<ApplicantWithJobs[]>(
    organization ? `unthreaded-applicants-${organization.id}` : null,
    async () => {
      // 既存スレッドの participant_id を取得
      const { data: existingThreads } = await getSupabase()
        .from("message_threads")
        .select("participant_id")
        .eq("organization_id", organization!.id)
        .eq("participant_type", "applicant");

      const existingIds = (existingThreads ?? []).map((t) => t.participant_id);

      // アクティブな応募を持つ応募者を取得
      const { data: apps } = await getSupabase()
        .from("applications")
        .select(
          "applicant_id, profiles:applicant_id(id, display_name, email, avatar_url, role), jobs(title)"
        )
        .eq("organization_id", organization!.id)
        .eq("status", "active")
        .order("applied_at", { ascending: false });

      // 応募者単位で集約
      const map = new Map<string, ApplicantWithJobs>();
      for (const app of (apps ?? []) as unknown as {
        applicant_id: string;
        profiles: Profile;
        jobs: { title: string };
      }[]) {
        if (!app.profiles || existingIds.includes(app.applicant_id)) continue;
        const existing = map.get(app.applicant_id);
        if (existing) {
          existing.job_titles += `, ${app.jobs?.title ?? ""}`;
        } else {
          map.set(app.applicant_id, { ...app.profiles, job_titles: app.jobs?.title ?? "" });
        }
      }
      return Array.from(map.values());
    }
  );

  // スレッドが未作成の社員一覧を取得
  const { data: employees = [], isLoading: empsLoading } = useQuery<Profile[]>(
    organization ? `unthreaded-emps-${organization.id}` : null,
    async () => {
      // 既存の社員スレッドの participant_id を取得
      const { data: existingThreads } = await getSupabase()
        .from("message_threads")
        .select("participant_id")
        .eq("organization_id", organization!.id)
        .eq("participant_type", "employee");

      const existingParticipantIds = (existingThreads ?? []).map((t) => t.participant_id);

      // 組織に所属する社員を取得
      const { data: orgUsers } = await getSupabase()
        .from("user_organizations")
        .select(
          "user_id, profiles:user_id(id, display_name, email, role, avatar_url, department, position)"
        )
        .eq("organization_id", organization!.id);

      const empProfiles = (orgUsers ?? [])
        .map((u) => (u as unknown as { profiles: Profile }).profiles)
        .filter((p) => p && p.role === "employee");

      // 既存スレッドがある社員を除外
      if (existingParticipantIds.length > 0) {
        return empProfiles.filter((p) => !existingParticipantIds.includes(p.id));
      }
      return empProfiles;
    }
  );

  const filteredApplicants = applicants.filter((a) => {
    if (!appSearch) return true;
    const s = appSearch.toLowerCase();
    const name = a.display_name?.toLowerCase() ?? "";
    const email = a.email?.toLowerCase() ?? "";
    const jobs = a.job_titles?.toLowerCase() ?? "";
    return name.includes(s) || email.includes(s) || jobs.includes(s);
  });

  const filteredEmps = employees.filter((emp) => {
    if (!appSearch) return true;
    const s = appSearch.toLowerCase();
    const name = emp.display_name?.toLowerCase() ?? "";
    const email = emp.email?.toLowerCase() ?? "";
    const dept = emp.department?.toLowerCase() ?? "";
    return name.includes(s) || email.includes(s) || dept.includes(s);
  });

  const handleCreateApplicant = async (applicantId: string) => {
    if (!organization || creating) return;
    setCreating(true);

    const { data: newThread } = await getSupabase()
      .from("message_threads")
      .insert({
        organization_id: organization.id,
        participant_id: applicantId,
        participant_type: "applicant",
      })
      .select("id")
      .single();

    setCreating(false);
    if (newThread) onCreated(newThread.id);
  };

  const handleCreateEmployee = async (employeeId: string) => {
    if (!organization || creating) return;
    setCreating(true);

    const { data: newThread } = await getSupabase()
      .from("message_threads")
      .insert({
        organization_id: organization.id,
        participant_id: employeeId,
        participant_type: "employee",
      })
      .select("id")
      .single();

    setCreating(false);
    if (newThread) onCreated(newThread.id);
  };

  const isLoading = tab === "applicant" ? appsLoading : empsLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">新規メッセージ — 送信先を選択</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 pt-2">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as "applicant" | "employee");
              setAppSearch("");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="applicant" className="flex-1">
                応募者
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex-1">
                社員
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center h-11 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder={tab === "applicant" ? "応募者名・求人名で検索" : "社員名・部署で検索"}
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-11"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : tab === "applicant" ? (
            filteredApplicants.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {applicants.length === 0
                  ? "スレッド未作成の応募者がいません"
                  : "一致する応募者がいません"}
              </div>
            ) : (
              filteredApplicants.map((applicant) => {
                const name = applicant.display_name ?? applicant.email ?? "不明";

                return (
                  <button
                    key={applicant.id}
                    type="button"
                    onClick={() => handleCreateApplicant(applicant.id)}
                    disabled={creating}
                    className="w-full text-left px-4 py-3 border-b hover:bg-accent/50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                          {name[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {applicant.job_titles}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )
          ) : filteredEmps.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {employees.length === 0 ? "スレッド未作成の社員がいません" : "一致する社員がいません"}
            </div>
          ) : (
            filteredEmps.map((emp) => {
              const name = emp.display_name ?? emp.email ?? "不明";

              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleCreateEmployee(emp.id)}
                  disabled={creating}
                  className="w-full text-left px-4 py-3 border-b hover:bg-accent/50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                        {name[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[emp.department, emp.position].filter(Boolean).join(" / ") || "社員"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
