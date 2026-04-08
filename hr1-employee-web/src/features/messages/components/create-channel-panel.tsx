"use client";

import React, { useState } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useOrg } from "@/lib/org-context";
import {
  useDepartmentsForChannel,
  useProjectsForChannel,
  createChannel,
  addChannelMembers,
  fetchDeptMembers,
  createDepartmentChannels,
} from "@/lib/hooks/use-messages-page";
import { X, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";

export function CreateChannelPanel({
  onCreated,
  onClose,
}: {
  onCreated: (threadId: string) => void;
  onClose: () => void;
}) {
  const { organization } = useOrg();
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"department" | "project" | "custom">("custom");
  const [sourceId, setSourceId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [generatingDept, setGeneratingDept] = useState(false);

  const { data: departments = [] } = useDepartmentsForChannel(channelType === "department");

  const { data: projects = [] } = useProjectsForChannel(channelType === "project");

  const handleCreate = async () => {
    if (!organization || !channelName.trim() || creating) return;
    setCreating(true);

    const { data: newThread } = await createChannel({
      organization_id: organization.id,
      is_channel: true,
      channel_name: channelName.trim(),
      channel_type: channelType,
      channel_source_id: sourceId || null,
      title: channelName.trim() + " チャンネル",
    });

    if (newThread && channelType === "department" && sourceId) {
      const deptMembers = await fetchDeptMembers(sourceId);

      if (deptMembers.length > 0) {
        await addChannelMembers(
          deptMembers.map((m) => ({
            thread_id: newThread.id,
            user_id: m.user_id,
          }))
        );
      }
    }

    setCreating(false);
    if (newThread) onCreated(newThread.id);
  };

  const handleGenerateDeptChannels = async () => {
    if (!organization || generatingDept) return;
    setGeneratingDept(true);
    await createDepartmentChannels(organization.id);
    setGeneratingDept(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">チャンネル作成</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">チャンネル名</label>
            <Input
              placeholder="例: 営業部、プロジェクトA"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium">種別</label>
            <Select
              value={channelType}
              onValueChange={(v) => {
                setChannelType(v as "department" | "project" | "custom");
                setSourceId("");
                if (v === "department" && departments.length > 0) {
                  setChannelName(departments[0].name);
                } else if (v === "project" && projects.length > 0) {
                  setChannelName(projects[0].name);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">部署</SelectItem>
                <SelectItem value="project">プロジェクト</SelectItem>
                <SelectItem value="custom">カスタム</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {channelType === "department" && departments.length > 0 && (
            <div>
              <label className="text-sm font-medium">部署</label>
              <Select
                value={sourceId}
                onValueChange={(v) => {
                  if (!v) return;
                  setSourceId(v);
                  const dept = departments.find((d) => d.id === v);
                  if (dept) setChannelName(dept.name);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="部署を選択" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {channelType === "project" && projects.length > 0 && (
            <div>
              <label className="text-sm font-medium">プロジェクト</label>
              <Select
                value={sourceId}
                onValueChange={(v) => {
                  if (!v) return;
                  setSourceId(v);
                  const proj = projects.find((p) => p.id === v);
                  if (proj) setChannelName(proj.name);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="プロジェクトを選択" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateDeptChannels}
            disabled={generatingDept}
          >
            {generatingDept && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            全部署チャンネルを一括作成
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              キャンセル
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!channelName.trim() || creating}>
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              作成
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
