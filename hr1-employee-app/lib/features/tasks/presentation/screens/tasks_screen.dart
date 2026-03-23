import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_providers.dart';

/// タスク画面 — Microsoft To Do スタイル
class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  final _addController = TextEditingController();
  final _addFocusNode = FocusNode();
  bool _showAddField = false;

  @override
  void dispose() {
    _addController.dispose();
    _addFocusNode.dispose();
    super.dispose();
  }

  Future<void> _addTask() async {
    final title = _addController.text.trim();
    if (title.isEmpty) return;
    await ref.read(taskListControllerProvider.notifier).addTask(title);
    _addController.clear();
  }

  Future<void> _toggleComplete(Task task) async {
    await ref
        .read(taskListControllerProvider.notifier)
        .toggleComplete(task.id, task.isCompleted);
  }

  Future<void> _toggleImportant(Task task) async {
    await ref
        .read(taskListControllerProvider.notifier)
        .toggleImportant(task.id, task.isImportant);
  }

  Future<void> _deleteTask(Task task) async {
    await ref.read(taskListControllerProvider.notifier).deleteTask(task.id);
  }

  void _showTaskDetail(Task task) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => _TaskDetailSheet(task: task)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(taskFilterProvider);
    final tasksAsync = ref.watch(taskListControllerProvider);
    final user = ref.watch(appUserProvider);

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
          // フィルタタブ（横スクロール）
          _FilterTabs(
            selected: filter,
            onSelected: (f) {
              ref.read(taskFilterProvider.notifier).state = f;
            },
          ),
          // フィルタヘッダー
          _FilterHeader(filter: filter),
          // タスクリスト
          Expanded(
            child: tasksAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorState(
                onRetry: () => ref.invalidate(taskListControllerProvider),
              ),
              data: (tasks) {
                final incomplete = tasks.where((t) => !t.isCompleted).toList();
                final completed = tasks.where((t) => t.isCompleted).toList();

                if (incomplete.isEmpty && completed.isEmpty) {
                  return _EmptyTaskState(filter: filter);
                }

                return ListView(
                  padding: const EdgeInsets.only(bottom: 100),
                  children: [
                    // 未完了タスク
                    for (final task in incomplete)
                      _TaskItem(
                        task: task,
                        onToggleComplete: () => _toggleComplete(task),
                        onToggleImportant: () => _toggleImportant(task),
                        onTap: () => _showTaskDetail(task),
                        onDismissed: () => _deleteTask(task),
                      ),
                    // 完了セクション
                    if (completed.isNotEmpty)
                      _CompletedSection(
                        tasks: completed,
                        onToggleComplete: _toggleComplete,
                        onTap: _showTaskDetail,
                      ),
                  ],
                );
              },
            ),
          ),
          // タスク追加バー
          _AddTaskBar(
            controller: _addController,
            focusNode: _addFocusNode,
            showField: _showAddField,
            onTap: () => setState(() {
              _showAddField = true;
              _addFocusNode.requestFocus();
            }),
            onSubmit: () async {
              await _addTask();
              setState(() => _showAddField = false);
            },
            onCancel: () => setState(() {
              _showAddField = false;
              _addController.clear();
            }),
          ),
        ],
      ),
    );
  }
}

/// フィルタタブ — To Do スタイル
class _FilterTabs extends StatelessWidget {
  const _FilterTabs({required this.selected, required this.onSelected});
  final TaskFilter selected;
  final ValueChanged<TaskFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
          };

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Material(
              color: isActive
                  ? color.withValues(alpha: 0.12)
                  : AppColors.divider(theme.brightness),

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
                            : AppColors.textSecondary(theme.brightness),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        f.label,
                        style: AppTextStyles.caption2.copyWith(
                          color: isActive
                              ? color
                              : AppColors.textSecondary(theme.brightness),
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

/// フィルタヘッダー
class _FilterHeader extends StatelessWidget {
  const _FilterHeader({required this.filter});
  final TaskFilter filter;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (title, subtitle) = switch (filter) {
      TaskFilter.myDay => (
        'My Day',
        DateFormat('M月d日（E）', 'ja').format(DateTime.now()),
      ),
      TaskFilter.important => ('重要', null),
      TaskFilter.planned => ('計画済み', null),
      TaskFilter.all => ('すべてのタスク', null),
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
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// タスクアイテム — To Do スタイル
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
    final theme = Theme.of(context);

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
              // 完了チェックボックス
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
                          : AppColors.textTertiary(theme.brightness),
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
              // コンテンツ
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
                            ? AppColors.textSecondary(theme.brightness)
                            : null,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    // メタデータ行
                    if (_hasMetadata) ...[
                      const SizedBox(height: 3),
                      _MetadataRow(task: task),
                    ],
                  ],
                ),
              ),
              // 重要フラグ
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
                        : AppColors.textTertiary(theme.brightness),
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

/// メタデータ行（期限、My Day、ステップ数）
class _MetadataRow extends StatelessWidget {
  const _MetadataRow({required this.task});
  final Task task;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final items = <Widget>[];

    if (task.isActiveMyDay) {
      items.add(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.wb_sunny_outlined,
              size: 12,
              color: AppColors.textSecondary(theme.brightness),
            ),
            const SizedBox(width: 3),
            Text(
              'My Day',
              style: AppTextStyles.caption1.copyWith(
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary(theme.brightness),
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
                  : AppColors.textSecondary(theme.brightness),
            ),
            const SizedBox(width: 3),
            Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                fontWeight: FontWeight.w500,
                color: isOverdue
                    ? AppColors.error
                    : AppColors.textSecondary(theme.brightness),
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
            color: AppColors.textSecondary(theme.brightness),
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

/// 完了セクション（折りたたみ可能）
class _CompletedSection extends StatefulWidget {
  const _CompletedSection({
    required this.tasks,
    required this.onToggleComplete,
    required this.onTap,
  });

  final List<Task> tasks;
  final ValueChanged<Task> onToggleComplete;
  final ValueChanged<Task> onTap;

  @override
  State<_CompletedSection> createState() => _CompletedSectionState();
}

class _CompletedSectionState extends State<_CompletedSection> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                  color: AppColors.textSecondary(theme.brightness),
                ),
                const SizedBox(width: 8),
                Text(
                  '完了済み (${widget.tasks.length})',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
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
              onToggleImportant: () {},
              onTap: () => widget.onTap(task),
              onDismissed: () {},
            ),
          ),
      ],
    );
  }
}

/// タスク追加バー（画面下部）
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
        AppSpacing.screenHorizontal,
        MediaQuery.of(context).padding.bottom + AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: theme.colorScheme.outlineVariant,
            width: AppStroke.strokeWidth05,
          ),
        ),
        boxShadow: isDark ? null : AppShadows.shadow4,
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
                        color: AppColors.textSecondary(theme.brightness),
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
                    color: AppColors.textSecondary(theme.brightness),
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

/// 空状態
class _EmptyTaskState extends StatelessWidget {
  const _EmptyTaskState({required this.filter});
  final TaskFilter filter;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final emptyColor = AppColors.textTertiary(theme.brightness);
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
                color: AppColors.textSecondary(theme.brightness),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// タスク詳細シート
class _TaskDetailSheet extends ConsumerStatefulWidget {
  const _TaskDetailSheet({required this.task});
  final Task task;

  @override
  ConsumerState<_TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends ConsumerState<_TaskDetailSheet> {
  late final TextEditingController _titleController;
  late final TextEditingController _noteController;
  late final TextEditingController _stepController;
  late bool _isMyDay;
  late DateTime? _dueDate;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.task.title);
    _noteController = TextEditingController(text: widget.task.note ?? '');
    _stepController = TextEditingController();
    _isMyDay = widget.task.isActiveMyDay;
    _dueDate = widget.task.dueDate;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _noteController.dispose();
    _stepController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    setState(() => _isSaving = true);
    try {
      final today = DateTime.now();
      final todayStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

      await ref
          .read(taskDetailControllerProvider(widget.task.id).notifier)
          .updateTask(
            widget.task.copyWith(
              title: title,
              note: _noteController.text.trim().isEmpty
                  ? null
                  : _noteController.text.trim(),
              isMyDay: _isMyDay,
              myDayDate: _isMyDay ? DateTime.parse(todayStr) : null,
              dueDate: _dueDate,
            ),
          );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) CommonSnackBar.error(context, 'エラー: $e');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _dueDate = picked);
    }
  }

  Future<void> _addStep() async {
    final title = _stepController.text.trim();
    if (title.isEmpty) return;

    await ref
        .read(taskDetailControllerProvider(widget.task.id).notifier)
        .addStep(widget.task.id, title);
    _stepController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stepsAsync = ref.watch(taskStepsProvider(widget.task.id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('タスクの詳細'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
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
          // タイトル
          TextField(
            controller: _titleController,
            style: AppTextStyles.title3,
            decoration: InputDecoration(
              hintText: 'タスク名',
              border: InputBorder.none,
              contentPadding: EdgeInsets.zero,
              hintStyle: AppTextStyles.title3.copyWith(
                color: AppColors.textTertiary(theme.brightness),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // ステップ
          stepsAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (steps) => Column(
              children: [
                for (final step in steps)
                  _StepRow(
                    step: step,
                    onToggle: () => ref
                        .read(
                          taskDetailControllerProvider(widget.task.id).notifier,
                        )
                        .toggleStepComplete(step.id, step.isCompleted),
                    onDelete: () => ref
                        .read(
                          taskDetailControllerProvider(widget.task.id).notifier,
                        )
                        .deleteStep(step.id),
                  ),
              ],
            ),
          ),
          // ステップ追加
          Row(
            children: [
              Icon(
                Icons.add_rounded,
                size: 18,
                color: AppColors.textSecondary(theme.brightness),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _stepController,
                  style: AppTextStyles.caption1,
                  onSubmitted: (_) => _addStep(),
                  decoration: InputDecoration(
                    hintText: 'ステップを追加',
                    hintStyle: AppTextStyles.caption1.copyWith(
                      color: AppColors.textTertiary(theme.brightness),
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
          const Divider(height: AppSpacing.xl),

          // My Day
          _DetailActionRow(
            icon: Icon(
              Icons.wb_sunny_outlined,
              size: 20,
              color: _isMyDay
                  ? AppColors.brand
                  : AppColors.textSecondary(theme.brightness),
            ),
            label: 'My Day に追加',
            isActive: _isMyDay,
            onTap: () => setState(() => _isMyDay = !_isMyDay),
          ),

          // 期限
          _DetailActionRow(
            icon: AppIcons.calendar(
              size: 20,
              color: _dueDate != null
                  ? AppColors.brand
                  : AppColors.textSecondary(theme.brightness),
            ),
            label: _dueDate != null
                ? '期限: ${DateFormat('M/d').format(_dueDate!)}'
                : '期限日を追加',
            isActive: _dueDate != null,
            onTap: _pickDueDate,
            trailing: _dueDate != null
                ? IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      size: 16,
                      color: AppColors.textSecondary(theme.brightness),
                    ),
                    onPressed: () => setState(() => _dueDate = null),
                  )
                : null,
          ),
          const Divider(height: AppSpacing.xl),

          // メモ
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: AppIcons.doc(
                  size: 20,
                  color: AppColors.textSecondary(theme.brightness),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: _noteController,
                  style: AppTextStyles.caption1,
                  maxLines: 6,
                  minLines: 3,
                  decoration: InputDecoration(
                    hintText: 'メモを追加',
                    hintStyle: AppTextStyles.caption1.copyWith(
                      color: AppColors.textTertiary(theme.brightness),
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

/// ステップ行
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
    final theme = Theme.of(context);
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
                      : AppColors.textTertiary(theme.brightness),
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
                    ? AppColors.textSecondary(theme.brightness)
                    : null,
              ),
            ),
          ),
          GestureDetector(
            onTap: onDelete,
            child: Icon(
              Icons.close_rounded,
              size: 16,
              color: AppColors.textTertiary(theme.brightness),
            ),
          ),
        ],
      ),
    );
  }
}

/// 詳細アクション行
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
    final theme = Theme.of(context);
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
                      : theme.colorScheme.onSurface,
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
