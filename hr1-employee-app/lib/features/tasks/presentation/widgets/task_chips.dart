import 'package:flutter/material.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_meta.dart';
import 'package:hr1_shared/hr1_shared.dart';

Color taskPriorityColor(TaskPriority p) => switch (p) {
  TaskPriority.urgent => const Color(0xFF9B1C1C),
  TaskPriority.high => const Color(0xFFC8430E),
  TaskPriority.mid => const Color(0xFFA66A00),
  TaskPriority.low => AppColors.brand,
};

Color taskSourceColor(TaskSource s) => switch (s) {
  TaskSource.crm => AppColors.brand,
  TaskSource.project => const Color(0xFF6B46C1),
  TaskSource.workflow => const Color(0xFFC8430E),
  TaskSource.mention => const Color(0xFFA66A00),
  TaskSource.dev => const Color(0xFF1F6FEB),
  TaskSource.self => const Color(0xFF1F8B4C),
};

Color taskStatusColor(TaskStatus s) => switch (s) {
  TaskStatus.backlog => const Color(0xFF6B7280),
  TaskStatus.todo => const Color(0xFF374151),
  TaskStatus.inprogress => AppColors.brand,
  TaskStatus.review => const Color(0xFFA66A00),
  TaskStatus.qa => const Color(0xFF6B46C1),
  TaskStatus.done => const Color(0xFF1F8B4C),
};

Color taskTypeColor(DevTaskType t) => switch (t) {
  DevTaskType.epic => const Color(0xFF6B46C1),
  DevTaskType.story => const Color(0xFF1F8B4C),
  DevTaskType.task => AppColors.brand,
  DevTaskType.bug => const Color(0xFFC8430E),
  DevTaskType.subtask => const Color(0xFF6B7280),
};

Color taskRelationColor(BuildContext context, RelationKind k) => switch (k) {
  RelationKind.blocks || RelationKind.blockedBy => const Color(0xFFC8430E),
  RelationKind.duplicates ||
  RelationKind.duplicatedBy => const Color(0xFFA66A00),
  RelationKind.relatesTo => AppColors.textSecondary(context),
};

const _taskLabelColorMap = <String, Color>{
  'frontend': Color(0xFF1F6FEB),
  'backend': Color(0xFF6B46C1),
  'mobile': Color(0xFFC8430E),
  'infra': Color(0xFF6B7280),
  'design': Color(0xFFD946EF),
  'security': Color(0xFF9B1C1C),
  'perf': Color(0xFFA66A00),
  'a11y': Color(0xFF1F8B4C),
  'tech-debt': Color(0xFF4B5563),
  'docs': Color(0xFF14B8A6),
};

Color taskLabelColor(BuildContext context, String id) =>
    _taskLabelColorMap[id] ?? AppColors.textSecondary(context);

class PriorityChip extends StatelessWidget {
  const PriorityChip({super.key, required this.priority});

  final TaskPriority priority;

  @override
  Widget build(BuildContext context) {
    return CommonLabel(
      text: TaskMeta.priorityLabel(priority),
      color: taskPriorityColor(priority),
    );
  }
}

class SourceChip extends StatelessWidget {
  const SourceChip({super.key, required this.source});

  final TaskSource source;

  @override
  Widget build(BuildContext context) {
    return CommonLabel(
      text: TaskMeta.sourceLabel(source),
      color: taskSourceColor(source),
      variant: CommonLabelVariant.outlined,
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status, this.dense = false});

  final TaskStatus status;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    return CommonLabel(
      text: TaskMeta.statusLabel(status),
      color: taskStatusColor(status),
      dense: dense,
    );
  }
}

/// タスク ID 表示（例: `#42`）。typography トークンであり chip ではないが、
/// 4 callsite で同じスタイルを使うためコンポーネント化。
class TaskIdText extends StatelessWidget {
  const TaskIdText({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context) {
    return Text(
      id,
      style: AppTextStyles.label1.copyWith(
        letterSpacing: 0.1,
        color: AppColors.textSecondary(context),
      ),
    );
  }
}

class SPChip extends StatelessWidget {
  const SPChip({super.key, required this.sp});

  final int? sp;

  @override
  Widget build(BuildContext context) {
    if (sp == null) return const SizedBox.shrink();
    return Container(
      constraints: const BoxConstraints(minWidth: 20, minHeight: 18),
      padding: const EdgeInsets.symmetric(horizontal: 6),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.surfaceTertiary(context),
        borderRadius: BorderRadius.circular(9),
      ),
      child: Text(
        '$sp',
        style: AppTextStyles.caption2.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.textSecondary(context),
        ),
      ),
    );
  }
}

class DevTypeIcon extends StatelessWidget {
  const DevTypeIcon({super.key, required this.type, this.size = 16});

  final DevTaskType type;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: taskTypeColor(type),
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        TaskMeta.typeGlyph(type),
        style: AppTextStyles.caption2.copyWith(
          fontWeight: FontWeight.w800,
          color: Colors.white,
          height: 1,
        ),
      ),
    );
  }
}
