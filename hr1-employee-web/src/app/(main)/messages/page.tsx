"use client";

import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { useMessagesPage } from "@/lib/hooks/use-messages-page";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { Search, MessageSquare, Hash, Users, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@hr1/shared-ui/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@hr1/shared-ui/lib/utils";
import { ThreadChat } from "@/features/messages/components/thread-chat";
import { NewThreadPanel } from "@/features/messages/components/new-thread-panel";
import { CreateChannelPanel } from "@/features/messages/components/create-channel-panel";
import { ChannelMembersPanel } from "@/features/messages/components/channel-members-panel";

export default function MessagesPage() {
  const {
    selectedThreadId,
    setSelectedThreadId,
    search,
    setSearch,
    showNewThread,
    setShowNewThread,
    mainTab,
    setMainTab,
    showCreateChannel,
    setShowCreateChannel,
    showChannelMembers,
    setShowChannelMembers,
    messageCache,
    threadsLoading,
    threadsError,
    mutateThreads,
    channelsLoading,
    channelsError,
    mutateChannels,
    filtered,
    filteredChannels,
    selectedThread,
  } = useMessagesPage();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <QueryErrorBanner error={threadsError} onRetry={() => mutateThreads()} />
      <QueryErrorBanner error={channelsError} onRetry={() => mutateChannels()} />
      <PageHeader
        title="メッセージ"
        description="チームとのコミュニケーション"
        sticky={false}
        action={
          mainTab === "dm" ? (
            <Button size="sm" onClick={() => setShowNewThread(true)}>
              新規メッセージ
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowCreateChannel(true)}>
              <Plus className="h-4 w-4 mr-1" />
              チャンネル作成
            </Button>
          )
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

      {showCreateChannel && (
        <CreateChannelPanel
          onCreated={async (threadId) => {
            setShowCreateChannel(false);
            await mutateChannels();
            setMainTab("channels");
            setSelectedThreadId(threadId);
          }}
          onClose={() => setShowCreateChannel(false)}
        />
      )}

      {showChannelMembers && selectedThread?.is_channel && (
        <ChannelMembersPanel
          thread={selectedThread}
          onClose={() => setShowChannelMembers(false)}
          onMembersChanged={() => mutateChannels()}
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
          <div className="px-3 pt-2 pb-1">
            <Tabs
              value={mainTab}
              onValueChange={(v) => {
                setMainTab(v as "dm" | "channels");
                setSelectedThreadId(null);
                setSearch("");
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="dm" className="flex-1">
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  DM
                </TabsTrigger>
                <TabsTrigger value="channels" className="flex-1">
                  <Hash className="h-3.5 w-3.5 mr-1.5" />
                  チャンネル
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="px-3 py-2">
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
            {mainTab === "dm" ? (
              threadsLoading ? (
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
              )
            ) : channelsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">読み込み中...</div>
            ) : filteredChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Hash className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search ? "一致するチャンネルがありません" : "チャンネルがありません"}
                </p>
              </div>
            ) : (
              filteredChannels.map((channel) => {
                const isSelected = channel.id === selectedThreadId;
                const channelTypeLabel =
                  channel.channel_type === "department"
                    ? "部署"
                    : channel.channel_type === "project"
                      ? "プロジェクト"
                      : "カスタム";

                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedThreadId(channel.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent/50",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 shrink-0 mt-0.5 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Hash className="h-4 w-4 text-violet-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium truncate">
                              {channel.channel_name ?? "無題"}
                            </span>
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px] px-1.5 py-0 h-4 font-normal border-violet-300 text-violet-700"
                            >
                              {channelTypeLabel}
                            </Badge>
                          </span>
                          {channel.latest_message && (
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {format(new Date(channel.latest_message.created_at), "MM/dd")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          <Users className="h-3 w-3 inline mr-1" />
                          {channel.member_count ?? 0}人
                        </p>
                        {channel.latest_message && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {channel.latest_message.content}
                          </p>
                        )}
                      </div>
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
              messageCache={messageCache}
              onShowMembers={
                selectedThread.is_channel ? () => setShowChannelMembers(true) : undefined
              }
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {mainTab === "dm" ? "スレッドを選択してください" : "チャンネルを選択してください"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
