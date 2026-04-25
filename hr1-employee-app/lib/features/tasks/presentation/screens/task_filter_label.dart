import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';

/// 担当者フィルタ chip のラベル。`assignees` の挿入順 (= 選択順) を保つ。
String taskAssigneeChipLabel(Set<String> assignees, List<TaskUser> candidates) {
  if (assignees.isEmpty) return '全員';
  final byId = {for (final u in candidates) u.id: u};
  final selected = <TaskUser>[
    for (final id in assignees)
      if (byId[id] case final u?) u,
  ];
  if (selected.isEmpty) return '${assignees.length}名選択中';
  if (selected.length == 1) return selected.first.name;
  return '${selected.first.name} 他${selected.length - 1}名';
}
