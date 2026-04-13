"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrgQuery, useEmployees } from "@/lib/hooks/use-org-query";
import * as commentRepo from "@/lib/repositories/crm-comment-repository";
import type { CrmComment } from "@/lib/repositories/crm-comment-repository";
import { Trash2, Send } from "lucide-react";

interface CommentFeedProps {
  entityType: string;
  entityId: string;
}

export function CommentFeed({ entityType, entityId }: CommentFeedProps) {
  const { organization } = useOrg();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const { data: employees } = useEmployees();

  const { data: comments, mutate } = useOrgQuery<CrmComment[]>(
    `crm-comments-${entityType}-${entityId}`,
    (orgId) => commentRepo.fetchComments(getSupabase(), orgId, entityType, entityId)
  );

  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = useMemo(() => {
    if (!employees || !mentionQuery) return employees ?? [];
    const q = mentionQuery.toLowerCase();
    return employees.filter(
      (m) => (m.display_name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [employees, mentionQuery]);

  const handleInput = useCallback((value: string) => {
    setBody(value);
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\S*)$/);
    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  }, []);

  const insertMention = useCallback(
    (member: { id: string; display_name: string | null; email: string }) => {
      const name = member.display_name ?? member.email;
      const cursorPos = textareaRef.current?.selectionStart ?? body.length;
      const textBeforeCursor = body.slice(0, cursorPos);
      const replaced = textBeforeCursor.replace(/@(\S*)$/, `@${name} `);
      setBody(replaced + body.slice(cursorPos));
      setShowMentions(false);
      setMentionQuery("");
      textareaRef.current?.focus();
    },
    [body]
  );

  const handleSubmit = useCallback(async () => {
    if (saving || !body.trim() || !organization || !user) return;
    setSaving(true);
    try {
      const mentionIds = (employees ?? [])
        .filter((m) => body.includes(`@${m.display_name ?? m.email}`))
        .map((m) => m.id);
      await commentRepo.createComment(getSupabase(), {
        organization_id: organization.id,
        entity_type: entityType,
        entity_id: entityId,
        author_id: user.id,
        body: body.trim(),
        mentions: mentionIds,
      });
      setBody("");
      await mutate();
      showToast("コメントを投稿しました");
    } catch {
      showToast("コメントの投稿に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [saving, body, organization, user, employees, entityType, entityId, mutate, showToast]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!organization) return;
      try {
        await commentRepo.deleteComment(getSupabase(), id, organization.id);
        await mutate();
        showToast("コメントを削除しました");
      } catch {
        showToast("コメントの削除に失敗しました", "error");
      }
    },
    [organization, mutate, showToast]
  );

  const initial = (profile?.display_name ?? profile?.email ?? "U")[0].toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      {/* コメント一覧 */}
      <div className="space-y-3">
        {(!comments || comments.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-6">コメントなし</p>
        )}
        {comments?.map((c) => {
          const authorName = c.profiles?.display_name ?? c.profiles?.email ?? "不明";
          const authorInitial = authorName[0].toUpperCase();
          const date = new Date(c.created_at);
          const isOwn = user?.id === c.author_id;
          return (
            <div key={c.id} className="flex gap-3 group">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
                  {authorInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {date.toLocaleString("ja-JP")}
                  </span>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 ml-auto text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 入力エリア */}
      <div className="sticky bottom-0 z-10 bg-white pt-3 pb-1">
        <div className="relative">
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-64 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md z-20">
              {filteredMembers.slice(0, 8).map((m) => (
                <button
                  key={m.id}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(m);
                  }}
                >
                  <span className="font-medium">{m.display_name ?? m.email}</span>
                  {m.display_name && (
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-start">
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 rounded-lg border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-colors">
              <Textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="コメントを入力... @でメンション"
                rows={1}
                className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-[38px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-end px-3 pb-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={saving || !body.trim()}
                  className="h-7 text-xs gap-1"
                >
                  <Send className="size-3" />
                  {saving ? "送信中..." : "送信"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
