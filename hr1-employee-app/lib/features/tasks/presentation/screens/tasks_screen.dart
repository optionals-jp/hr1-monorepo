import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_providers.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_todo.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';

class TasksScreen extends HookConsumerWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addController = useTextEditingController();
    final addFocusNode = useFocusNode();
    final showAddField = useState(false);

    final filter = ref.watch(taskFilterProvider);
    final tasksAsync = ref.watch(taskListControllerProvider);
    final user = ref.watch(appUserProvider);

    Future<void> addTask() async {
      final title = addController.text.trim();
      if (title.isEmpty) return;
      await ref.read(taskListControllerProvider.notifier).addTask(title);
      addController.clear();
    }

    Future<void> toggleComplete(Task task) async {
      await ref
          .read(taskListControllerProvider.notifier)
          .toggleComplete(task.id, task.isCompleted);
    }

    Future<void> toggleImportant(Task task) async {
      await ref
          .read(taskListControllerProvider.notifier)
          .toggleImportant(task.id, task.isImportant);
    }

    Future<void> deleteTask(Task task) async {
      await ref.read(taskListControllerProvider.notifier).deleteTask(task.id);
    }

    void showTaskDetail(Task task) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => _TaskDetailSheet(task: task)),
      );
    }

    return CommonScaffold(
      appBar: AppBar(
        titleSpacing: AppSpacing.screenHorizontal,
        title: Row(
          children: [
            OrgIcon(
              initial: (user?.organizationName ?? 'H').substring(0, 1),
              size: 32,
            ),
            const SizedBox(width: 10),
            Text(
              'タスク',
              style: AppTextStyles.title1.copyWith(letterSpacing: -0.2),
            ),
          ],
        ),
        centerTitle: false,
        actions: [
          GestureDetector(
            onTap: () => context.push(AppRoutes.profileFullscreen),
            child: Padding(
              padding: const EdgeInsets.only(
                right: AppSpacing.screenHorizontal,
              ),
              child: UserAvatar(
                initial: (user?.displayName ?? user?.email ?? 'U').substring(
                  0,
                  1,
                ),
                size: 32,
                imageUrl: user?.avatarUrl,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _FilterTabs(
            selected: filter,
            onSelected: (f) {
              ref.read(taskFilterProvider.notifier).state = f;
            },
          ),
          _FilterHeader(filter: filter),
          Expanded(
            child: filter == TaskFilter.crm
                ? _CrmTodoList()
                : tasksAsync.when(
                    loading: () => const LoadingIndicator(),
                    error: (e, _) => ErrorState(
                      onRetry: () => ref.invalidate(taskListControllerProvider),
                    ),
                    data: (tasks) {
                      final incomplete = tasks
                          .where((t) => !t.isCompleted)
                          .toList();
                      final completed = tasks
                          .where((t) => t.isCompleted)
                          .toList();

                      if (incomplete.isEmpty && completed.isEmpty) {
                        return _EmptyTaskState(filter: filter);
                      }

                      return ListView(
                        padding: const EdgeInsets.only(bottom: 100),
                        children: [
                          for (final task in incomplete)
                            _TaskItem(
                              task: task,
                              onToggleComplete: () => toggleComplete(task),
                              onToggleImportant: () => toggleImportant(task),
                              onTap: () => showTaskDetail(task),
                              onDismissed: () => deleteTask(task),
                            ),
                          if (completed.isNotEmpty)
                            _CompletedSection(
                              tasks: completed,
                              onToggleComplete: toggleComplete,
                              onToggleImportant: toggleImportant,
                              onDelete: deleteTask,
                              onTap: showTaskDetail,
                            ),
                        ],
                      );
                    },
                  ),
          ),
          if (filter != TaskFilter.crm)
            _AddTaskBar(
              controller: addController,
              focusNode: addFocusNode,
              showField: showAddField.value,
              onTap: () {
                showAddField.value = true;
                addFocusNode.requestFocus();
              },
              onSubmit: () async {
                await addTask();
                showAddField.value = false;
              },
              onCancel: () {
                showAddField.value = false;
                addController.clear();
              },
            ),
        ],
      ),
    );
  }
}

class _FilterTabs extends StatelessWidget {
  const _FilterTabs({required this.selected, required this.onSelected});
  final TaskFilter selected;
  final ValueChanged<TaskFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
        ),
        children: TaskFilter.values.map((f) {
          final isActive = f == selected;
          final (icon, color) = switch (f) {
            TaskFilter.myDay => (Icons.wb_sunny_outlined, AppColors.sunOrange),
            TaskFilter.important => (
              Icons.star_outline_rounded,
              AppColors.error,
            ),
            TaskFilter.planned => (
              Icons.calendar_today_rounded,
              AppColors.success,
            ),
            TaskFilter.all => (Icons.list_rounded, AppColors.brand),
            TaskFilter.crm => (Icons.credit_card_rounded, AppColors.warning),
          };

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Material(
              color: isActive
                  ? color.withValues(alpha: 0.12)
                  : AppColors.divider(context),

              borderRadius: AppRadius.radiusCircular,
              child: InkWell(
                onTap: () => onSelected(f),
                borderRadius: AppRadius.radiusCircular,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 4,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        icon,
                        size: 16,
                        color: isActive
                            ? color
                            : AppColors.textSecondary(context),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        f.label,
                        style: AppTextStyles.caption2.copyWith(
                          color: isActive
                              ? color
                              : AppColors.textSecondary(context),
                          fontWeight: isActive
                              ? FontWeight.w600
                              : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _FilterHeader extends StatelessWidget {
  const _FilterHeader({required this.filter});
  final TaskFilter filter;

  @override
  Widget build(BuildContext context) {
    final (title, subtitle) = switch (filter) {
      TaskFilter.myDay => (
        'My Day',
        DateFormat('M月d日（E）', 'ja').format(DateTime.now()),
      ),
      TaskFilter.important => ('重要', null),
      TaskFilter.planned => ('計画済み', null),
      TaskFilter.all => ('すべてのタスク', null),
      TaskFilter.crm => ('CRM TODO', null),
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.md,
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
      ),
      child: Row(
        children: [
          if (filter == TaskFilter.myDay)
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: Icon(
                Icons.wb_sunny_rounded,
                size: 24,
                color: AppColors.sunOrange,
              ),
            ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTextStyles.title1),
              if (subtitle != null)
                Text(
                  subtitle,
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TaskItem extends StatelessWidget {
  const _TaskItem({
    required this.task,
    required this.onToggleComplete,
    required this.onToggleImportant,
    required this.onTap,
    required this.onDismissed,
  });

  final Task task;
  final VoidCallback onToggleComplete;
  final VoidCallback onToggleImportant;
  final VoidCallback onTap;
  final VoidCallback onDismissed;

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(task.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppColors.error,
        child: AppIcons.trashFill(size: 24, color: Colors.white),
      ),
      onDismissed: (_) => onDismissed(),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: 10,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: onToggleComplete,
                child: Container(
                  width: 22,
                  height: 22,
                  margin: const EdgeInsets.only(top: 1),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: task.isCompleted
                          ? AppColors.brand
                          : AppColors.textTertiary(context),
                      width: 1.5,
                    ),
                    color: task.isCompleted
                        ? AppColors.brand
                        : Colors.transparent,
                  ),
                  child: task.isCompleted
                      ? const Icon(
                          Icons.check_rounded,
                          size: 14,
                          color: Colors.white,
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      style: AppTextStyles.caption1.copyWith(
                        decoration: task.isCompleted
                            ? TextDecoration.lineThrough
                            : null,
                        color: task.isCompleted
                            ? AppColors.textSecondary(context)
                            : null,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (_hasMetadata) ...[
                      const SizedBox(height: 3),
                      _MetadataRow(task: task),
                    ],
                  ],
                ),
              ),
              GestureDetector(
                onTap: onToggleImportant,
                child: Padding(
                  padding: const EdgeInsets.only(left: 8, top: 1),
                  child: Icon(
                    task.isImportant
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    size: 22,
                    color: task.isImportant
                        ? AppColors.error
                        : AppColors.textTertiary(context),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  bool get _hasMetadata =>
      task.dueDate != null || task.isActiveMyDay || task.steps != null;
}

class _MetadataRow extends StatelessWidget {
  const _MetadataRow({required this.task});
  final Task task;

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];

    if (task.isActiveMyDay) {
      items.add(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.wb_sunny_outlined,
              size: 12,
              color: AppColors.textSecondary(context),
            ),
            const SizedBox(width: 3),
            Text(
              'My Day',
              style: AppTextStyles.caption1.copyWith(
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary(context),
              ),
            ),
          ],
        ),
      );
    }

    if (task.dueDate != null) {
      final isOverdue = task.isOverdue;
      final label = _formatDueDate(task.dueDate!);
      items.add(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcons.calendar(
              size: 12,
              color: isOverdue
                  ? AppColors.error
                  : AppColors.textSecondary(context),
            ),
            const SizedBox(width: 3),
            Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                fontWeight: FontWeight.w500,
                color: isOverdue
                    ? AppColors.error
                    : AppColors.textSecondary(context),
              ),
            ),
          ],
        ),
      );
    }

    if (task.steps != null && task.steps!.isNotEmpty) {
      final done = task.steps!.where((s) => s.isCompleted).length;
      items.add(
        Text(
          '$done/${task.steps!.length}',
          style: AppTextStyles.caption1.copyWith(
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary(context),
          ),
        ),
      );
    }

    return Wrap(spacing: 10, children: items);
  }

  String _formatDueDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final d = DateTime(date.year, date.month, date.day);
    final diff = d.difference(today).inDays;

    if (diff < 0) return '期限切れ';
    if (diff == 0) return '今日';
    if (diff == 1) return '明日';
    return DateFormat('M/d').format(date);
  }
}

class _CompletedSection extends StatefulWidget {
  const _CompletedSection({
    required this.tasks,
    required this.onToggleComplete,
    required this.onToggleImportant,
    required this.onDelete,
    required this.onTap,
  });

  final List<Task> tasks;
  final ValueChanged<Task> onToggleComplete;
  final ValueChanged<Task> onToggleImportant;
  final ValueChanged<Task> onDelete;
  final ValueChanged<Task> onTap;

  @override
  State<_CompletedSection> createState() => _CompletedSectionState();
}

class _CompletedSectionState extends State<_CompletedSection> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        InkWell(
          onTap: () => setState(() => _isExpanded = !_isExpanded),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
              vertical: AppSpacing.md,
            ),
            child: Row(
              children: [
                Icon(
                  _isExpanded
                      ? Icons.keyboard_arrow_down_rounded
                      : Icons.keyboard_arrow_right_rounded,
                  size: 20,
                  color: AppColors.textSecondary(context),
                ),
                const SizedBox(width: 8),
                Text(
                  '完了済み (${widget.tasks.length})',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_isExpanded)
          ...widget.tasks.map(
            (task) => _TaskItem(
              task: task,
              onToggleComplete: () => widget.onToggleComplete(task),
              onToggleImportant: () => widget.onToggleImportant(task),
              onTap: () => widget.onTap(task),
              onDismissed: () => widget.onDelete(task),
            ),
          ),
      ],
    );
  }
}

class _AddTaskBar extends StatelessWidget {
  const _AddTaskBar({
    required this.controller,
    required this.focusNode,
    required this.showField,
    required this.onTap,
    required this.onSubmit,
    required this.onCancel,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool showField;
  final VoidCallback onTap;
  final VoidCallback onSubmit;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
        AppSpacing.screenHorizontal,
        MediaQuery.of(context).padding.bottom + AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        border: Border(
          top: BorderSide(
            color: AppColors.border(context),
            width: AppStroke.strokeWidth05,
          ),
        ),
        boxShadow: AppShadows.of4(context),
      ),
      child: showField
          ? Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: controller,
                    focusNode: focusNode,
                    style: AppTextStyles.caption1,
                    onSubmitted: (_) => onSubmit(),
                    decoration: InputDecoration(
                      hintText: 'タスクを追加',
                      hintStyle: AppTextStyles.caption1.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(
                    Icons.close_rounded,
                    size: 20,
                    color: AppColors.textSecondary(context),
                  ),
                  onPressed: onCancel,
                ),
                IconButton(
                  icon: AppIcons.sendFill(size: 20, color: AppColors.brand),
                  onPressed: onSubmit,
                ),
              ],
            )
          : InkWell(
              onTap: onTap,
              borderRadius: AppRadius.radius80,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    Icon(Icons.add_rounded, size: 22, color: AppColors.brand),
                    const SizedBox(width: 12),
                    Text(
                      'タスクを追加',
                      style: AppTextStyles.caption1.copyWith(
                        color: AppColors.brand,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _EmptyTaskState extends StatelessWidget {
  const _EmptyTaskState({required this.filter});
  final TaskFilter filter;

  @override
  Widget build(BuildContext context) {
    final emptyColor = AppColors.textTertiary(context);
    final (icon, title, subtitle) = switch (filter) {
      TaskFilter.myDay => (
        Icon(Icons.wb_sunny_outlined, size: 48, color: emptyColor) as Widget,
        '今日のタスクはありません',
        'タスクを追加して今日の集中ポイントを設定しましょう',
      ),
      TaskFilter.important => (
        Icon(Icons.star_outline_rounded, size: 48, color: emptyColor) as Widget,
        '重要なタスクはありません',
        'スターを付けたタスクがここに表示されます',
      ),
      TaskFilter.planned => (
        AppIcons.calendar(size: 48, color: emptyColor),
        '計画済みのタスクはありません',
        '期限付きのタスクがここに表示されます',
      ),
      TaskFilter.all => (
        AppIcons.tickCircle(size: 48, color: emptyColor),
        'タスクはありません',
        '下の「+ タスクを追加」から始めましょう',
      ),
      TaskFilter.crm => (
        Icon(Icons.credit_card_rounded, size: 48, color: emptyColor) as Widget,
        'CRM TODOはありません',
        'CRM画面からTODOを追加できます',
      ),
    };

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon,
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              style: AppTextStyles.headline,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              subtitle,
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textSecondary(context),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskDetailSheet extends HookConsumerWidget {
  const _TaskDetailSheet({required this.task});
  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final titleController = useTextEditingController(text: task.title);
    final noteController = useTextEditingController(text: task.note ?? '');
    final stepController = useTextEditingController();
    final isMyDay = useState(task.isActiveMyDay);
    final dueDate = useState<DateTime?>(task.dueDate);
    final isSaving = useState(false);

    final stepsAsync = ref.watch(taskStepsProvider(task.id));

    Future<void> save() async {
      final title = titleController.text.trim();
      if (title.isEmpty) return;

      isSaving.value = true;
      try {
        final today = DateTime.now();
        final todayStr =
            '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

        await ref
            .read(taskDetailControllerProvider(task.id).notifier)
            .updateTask(
              task.copyWith(
                title: title,
                note: noteController.text.trim().isEmpty
                    ? null
                    : noteController.text.trim(),
                isMyDay: isMyDay.value,
                myDayDate: isMyDay.value ? DateTime.parse(todayStr) : null,
                dueDate: dueDate.value,
              ),
            );
        if (context.mounted) Navigator.of(context).pop();
      } catch (e) {
        if (context.mounted) CommonSnackBar.error(context, 'エラー: $e');
      } finally {
        if (context.mounted) isSaving.value = false;
      }
    }

    Future<void> pickDueDate() async {
      final picked = await showDatePicker(
        context: context,
        initialDate: dueDate.value ?? DateTime.now(),
        firstDate: DateTime(2020),
        lastDate: DateTime(2030),
      );
      if (picked != null) {
        dueDate.value = picked;
      }
    }

    Future<void> addStep() async {
      final title = stepController.text.trim();
      if (title.isEmpty) return;

      await ref
          .read(taskDetailControllerProvider(task.id).notifier)
          .addStep(task.id, title);
      stepController.clear();
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('タスクの詳細'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          TextButton(
            onPressed: isSaving.value ? null : save,
            child: isSaving.value
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: LoadingIndicator(size: 16),
                  )
                : Text(
                    '保存',
                    style: AppTextStyles.caption1.copyWith(
                      color: AppColors.brand,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        children: [
          TextField(
            controller: titleController,
            style: AppTextStyles.title3,
            decoration: InputDecoration(
              hintText: 'タスク名',
              border: InputBorder.none,
              contentPadding: EdgeInsets.zero,
              hintStyle: AppTextStyles.title3.copyWith(
                color: AppColors.textTertiary(context),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          stepsAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (steps) => Column(
              children: [
                for (final step in steps)
                  _StepRow(
                    step: step,
                    onToggle: () => ref
                        .read(taskDetailControllerProvider(task.id).notifier)
                        .toggleStepComplete(step.id, step.isCompleted),
                    onDelete: () => ref
                        .read(taskDetailControllerProvider(task.id).notifier)
                        .deleteStep(step.id),
                  ),
              ],
            ),
          ),
          Row(
            children: [
              Icon(
                Icons.add_rounded,
                size: 18,
                color: AppColors.textSecondary(context),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: stepController,
                  style: AppTextStyles.caption1,
                  onSubmitted: (_) => addStep(),
                  decoration: InputDecoration(
                    hintText: 'ステップを追加',
                    hintStyle: AppTextStyles.caption1.copyWith(
                      color: AppColors.textTertiary(context),
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
          const Divider(height: AppSpacing.xl),

          _DetailActionRow(
            icon: Icon(
              Icons.wb_sunny_outlined,
              size: 20,
              color: isMyDay.value
                  ? AppColors.brand
                  : AppColors.textSecondary(context),
            ),
            label: 'My Day に追加',
            isActive: isMyDay.value,
            onTap: () => isMyDay.value = !isMyDay.value,
          ),

          _DetailActionRow(
            icon: AppIcons.calendar(
              size: 20,
              color: dueDate.value != null
                  ? AppColors.brand
                  : AppColors.textSecondary(context),
            ),
            label: dueDate.value != null
                ? '期限: ${DateFormat('M/d').format(dueDate.value!)}'
                : '期限日を追加',
            isActive: dueDate.value != null,
            onTap: pickDueDate,
            trailing: dueDate.value != null
                ? IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      size: 16,
                      color: AppColors.textSecondary(context),
                    ),
                    onPressed: () => dueDate.value = null,
                  )
                : null,
          ),
          const Divider(height: AppSpacing.xl),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: AppIcons.doc(
                  size: 20,
                  color: AppColors.textSecondary(context),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: noteController,
                  style: AppTextStyles.caption1,
                  maxLines: 6,
                  minLines: 3,
                  decoration: InputDecoration(
                    hintText: 'メモを追加',
                    hintStyle: AppTextStyles.caption1.copyWith(
                      color: AppColors.textTertiary(context),
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.step,
    required this.onToggle,
    required this.onDelete,
  });

  final TaskStep step;
  final VoidCallback onToggle;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          GestureDetector(
            onTap: onToggle,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: step.isCompleted
                      ? AppColors.brand
                      : AppColors.textTertiary(context),
                  width: 1.5,
                ),
                color: step.isCompleted ? AppColors.brand : Colors.transparent,
              ),
              child: step.isCompleted
                  ? const Icon(
                      Icons.check_rounded,
                      size: 12,
                      color: Colors.white,
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              step.title,
              style: AppTextStyles.caption1.copyWith(
                decoration: step.isCompleted
                    ? TextDecoration.lineThrough
                    : null,
                color: step.isCompleted
                    ? AppColors.textSecondary(context)
                    : null,
              ),
            ),
          ),
          GestureDetector(
            onTap: onDelete,
            child: Icon(
              Icons.close_rounded,
              size: 16,
              color: AppColors.textTertiary(context),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// CRM TODO リスト
// =============================================================================

class _CrmTodoList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todosAsync = ref.watch(bcMyTodosProvider);

    return todosAsync.when(
      loading: () => const LoadingIndicator(),
      error: (e, _) =>
          ErrorState(onRetry: () => ref.invalidate(bcMyTodosProvider)),
      data: (todos) {
        final incomplete = todos.where((t) => !t.isCompleted).toList();
        final completed = todos.where((t) => t.isCompleted).toList();

        if (incomplete.isEmpty && completed.isEmpty) {
          return const _EmptyTaskState(filter: TaskFilter.crm);
        }

        return ListView(
          padding: const EdgeInsets.only(bottom: 100),
          children: [
            for (final todo in incomplete) _CrmTodoItem(todo: todo),
            if (completed.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenHorizontal,
                  vertical: AppSpacing.md,
                ),
                child: Text(
                  '完了済み (${completed.length})',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              for (final todo in completed) _CrmTodoItem(todo: todo),
            ],
          ],
        );
      },
    );
  }
}

class _CrmTodoItem extends StatelessWidget {
  const _CrmTodoItem({required this.todo});
  final BcTodo todo;

  @override
  Widget build(BuildContext context) {
    final linkedParts = <String>[
      if (todo.companyName != null) todo.companyName!,
      if (todo.contactName != null) todo.contactName!,
      if (todo.dealTitle != null) todo.dealTitle!,
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: 10,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 22,
            height: 22,
            margin: const EdgeInsets.only(top: 1),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: todo.isCompleted
                    ? AppColors.brand
                    : AppColors.textTertiary(context),
                width: 1.5,
              ),
              color: todo.isCompleted ? AppColors.brand : Colors.transparent,
            ),
            child: todo.isCompleted
                ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                : null,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  todo.title,
                  style: AppTextStyles.caption1.copyWith(
                    decoration: todo.isCompleted
                        ? TextDecoration.lineThrough
                        : null,
                    color: todo.isCompleted
                        ? AppColors.textSecondary(context)
                        : null,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (linkedParts.isNotEmpty || todo.dueDate != null) ...[
                  const SizedBox(height: 3),
                  Wrap(
                    spacing: 10,
                    children: [
                      if (todo.dueDate != null)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            AppIcons.calendar(
                              size: 12,
                              color: todo.isOverdue
                                  ? AppColors.error
                                  : AppColors.textSecondary(context),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              DateFormat('M/d').format(todo.dueDate!),
                              style: AppTextStyles.caption1.copyWith(
                                fontWeight: FontWeight.w500,
                                color: todo.isOverdue
                                    ? AppColors.error
                                    : AppColors.textSecondary(context),
                              ),
                            ),
                          ],
                        ),
                      if (linkedParts.isNotEmpty)
                        Text(
                          linkedParts.join(' / '),
                          style: AppTextStyles.caption1.copyWith(
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary(context),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailActionRow extends StatelessWidget {
  const _DetailActionRow({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
    this.trailing,
  });

  final Widget icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            icon,
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: AppTextStyles.caption1.copyWith(
                  color: isActive
                      ? AppColors.brand
                      : AppColors.textPrimary(context),
                ),
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }
}
