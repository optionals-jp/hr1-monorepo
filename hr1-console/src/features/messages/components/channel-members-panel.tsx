"use client";

import React, { useState } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  useChannelMembers,
  useOrgUsersForChannel,
  addChannelMember,
  removeChannelMember,
} from "@/lib/hooks/use-messages-page";
import type { MessageThread } from "@/types/database";
import { Search, X, UserMinus, UserPlus } from "lucide-react";

export function ChannelMembersPanel({
  thread,
  onClose,
  onMembersChanged,
}: {
  thread: MessageThread;
  onClose: () => void;
  onMembersChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: members = [], isLoading, mutate: mutateMembers } = useChannelMembers(thread.id);

  const { data: orgUsers = [] } = useOrgUsersForChannel(showAddMember);

  const memberIds = new Set(members.map((m) => m.user_id));
  const availableUsers = orgUsers.filter((u) => !memberIds.has(u.id));

  const filteredAvailable = availableUsers.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (u.display_name?.toLowerCase() ?? "").includes(s) ||
      (u.email?.toLowerCase() ?? "").includes(s)
    );
  });

  const handleAddMember = async (userId: string) => {
    if (adding) return;
    setAdding(true);
    await addChannelMember(thread.id, userId);
    await mutateMembers();
    onMembersChanged();
    setAdding(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm("このメンバーをチャンネルから削除しますか？")) return;
    await removeChannelMember(thread.id, userId);
    await mutateMembers();
    onMembersChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">
            {thread.channel_name} - メンバー管理 ({members.length}人)
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <Button
            variant={showAddMember ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowAddMember(!showAddMember);
              setSearch("");
            }}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            メンバー追加
          </Button>
        </div>

        {showAddMember && (
          <div className="border-b">
            <div className="flex items-center h-10 px-3 border-b bg-gray-50">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                placeholder="名前・メールで検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ml-2"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredAvailable.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  追加可能なメンバーがいません
                </div>
              ) : (
                filteredAvailable.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleAddMember(u.id)}
                    disabled={adding}
                    className="w-full text-left px-4 py-2 hover:bg-accent/50 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-gray-100">
                        {(u.display_name ?? u.email ?? "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{u.display_name ?? u.email}</span>
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                    {(member.display_name ?? member.email ?? "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{member.display_name ?? member.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.user_id)}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                  title="削除"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
