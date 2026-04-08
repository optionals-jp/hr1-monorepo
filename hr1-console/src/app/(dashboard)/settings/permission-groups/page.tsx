"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import { EditPanel } from "@/components/ui/edit-panel";
import { usePermissionGroupsPage } from "@/lib/hooks/use-permission-groups-page";
import {
  PERMISSION_RESOURCES,
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_RESOURCE_CATEGORIES,
} from "@/lib/constants/permissions";
import type { PermissionAction } from "@/types/database";
import { Shield, Plus } from "lucide-react";

export default function PermissionGroupsPage() {
  const h = usePermissionGroupsPage();

  if (h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="権限グループ"
        description="メンバーに割り当てる権限グループを管理します"
        sticky={false}
        border={false}
        action={
          <Button onClick={h.startCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            グループを作成
          </Button>
        }
      />

      <PageContent>
        <div className="max-w-2xl space-y-4">
          {h.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              権限グループがありません
            </p>
          ) : (
            h.groups.map((group) => (
              <Card key={group.id}>
                <CardContent>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{group.name}</span>
                      {group.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          システム
                        </Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => h.startEdit(group)}>
                      編集
                    </Button>
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground ml-6">{group.description}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </PageContent>

      <EditPanel
        open={h.editing}
        onOpenChange={h.setEditing}
        title={h.editingGroup ? "権限グループを編集" : "権限グループを作成"}
        onSave={h.handleSave}
        saving={h.saving}
        saveDisabled={!h.editName.trim()}
        onDelete={h.editingGroup && !h.editingGroup.is_system ? h.handleDelete : undefined}
        confirmDeleteMessage="この権限グループを削除しますか？割り当てられたメンバーからも自動的に外れます。"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>グループ名 *</Label>
              <Input
                value={h.editName}
                onChange={(e) => h.setEditName(e.target.value)}
                placeholder="人事担当"
              />
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Input
                value={h.editDescription}
                onChange={(e) => h.setEditDescription(e.target.value)}
                placeholder="採用・人事管理の担当者"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">権限設定</h3>

            {PERMISSION_RESOURCE_CATEGORIES.map((category) => {
              const resources = PERMISSION_RESOURCES.filter((r) => r.category === category);
              const allFull = resources.every(
                (r) =>
                  h.editPermissions[r.key] &&
                  h.editPermissions[r.key].size === PERMISSION_ACTIONS.length
              );

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allFull}
                      onCheckedChange={() => h.toggleCategoryAll(category)}
                    />
                    <span className="text-xs font-semibold text-muted-foreground">{category}</span>
                  </div>

                  <div className="ml-6 space-y-1.5">
                    {resources.map((resource) => {
                      const actions = h.editPermissions[resource.key];
                      const allChecked = actions && actions.size === PERMISSION_ACTIONS.length;

                      return (
                        <div key={resource.key} className="flex items-center gap-3">
                          <Checkbox
                            checked={!!allChecked}
                            onCheckedChange={() => h.toggleResourceAll(resource.key)}
                          />
                          <span className="text-sm w-28 shrink-0">{resource.label}</span>
                          <div className="flex items-center gap-3">
                            {PERMISSION_ACTIONS.map((action) => (
                              <label
                                key={action}
                                className="flex items-center gap-1 cursor-pointer"
                              >
                                <Checkbox
                                  checked={actions?.has(action as PermissionAction) ?? false}
                                  onCheckedChange={() =>
                                    h.togglePermission(resource.key, action as PermissionAction)
                                  }
                                />
                                <span className="text-xs text-muted-foreground">
                                  {PERMISSION_ACTION_LABELS[action as PermissionAction]}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
