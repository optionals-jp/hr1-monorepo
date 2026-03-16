import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../domain/entities/task.dart';
import '../providers/task_providers.dart';

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

    final repo = ref.read(taskRepositoryProvider);
    final filter = ref.read(taskFilterProvider);

    final now = DateTime.now();
    final todayStr =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

    await repo.createTask(Task(
      id: '',
      userId: '',
      organizationId: '',
      title: title,
      isMyDay: filter == TaskFilter.myDay,
      myDayDate: filter == TaskFilter.myDay ? DateTime.parse(todayStr) : null,
      isImportant: filter == TaskFilter.important,
      dueDate: filter == TaskFilter.planned ? DateTime.parse(todayStr) : null,
      createdAt: now,
      updatedAt: now,
    ));

    _addController.clear();
    _invalidateAll();
  }

  void _invalidateAll() {
    ref.invalidate(myDayTasksProvider);
    ref.invalidate(importantTasksProvider);
    ref.invalidate(plannedTasksProvider);
    ref.invalidate(allTasksProvider);
    ref.invalidate(filteredTasksProvider);
  }

  Future<void> _toggleComplete(Task task) async {
    final repo = ref.read(taskRepositoryProvider);
    await repo.toggleComplete(task.id, !task.isCompleted);
    _invalidateAll();
  }

  Future<void> _toggleImportant(Task task) async {
    final repo = ref.read(taskRepositoryProvider);
    await repo.toggleImportant(task.id, !task.isImportant);
    _invalidateAll();
  }

  Future<void> _deleteTask(Task task) async {
    final repo = ref.read(taskRepositoryProvider);
    await repo.deleteTask(task.id);
    _invalidateAll();
  }

  void _showTaskDetail(Task task) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _TaskDetailSheet(
          task: task,
          onChanged: _invalidateAll,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(taskFilterProvider);
    final tasksAsync = ref.watch(filteredTasksProvider);

    return Scaffold(
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
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('エラー: $e')),
              data: (tasks) {
                final incomplete =
                    tasks.where((t) => !t.isCompleted).toList();
                final completed =
                    tasks.where((t) => t.isCompleted).toList();

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
            horizontal: AppSpacing.screenHorizontal),
        children: TaskFilter.values.map((f) {
          final isActive = f == selected;
          final (icon, color) = switch (f) {
            TaskFilter.myDay => (Icons.wb_sunny_outlined, const Color(0xFFE8912D)),
            TaskFilter.important => (Icons.star_outline_rounded, AppColors.error),
            TaskFilter.planned => (Icons.calendar_today_rounded, AppColors.success),
            TaskFilter.all => (Icons.list_rounded, AppColors.brandPrimary),
          };

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Material(
              color: isActive
                  ? color.withValues(alpha: 0.12)
                  : theme.colorScheme.onSurface.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(20),
              child: InkWell(
                onTap: () => onSelected(f),
                borderRadius: BorderRadius.circular(20),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  child: Row(
                    children: [
                      Icon(icon,
                          size: 16,
                          color: isActive
                              ? color
                              : theme.colorScheme.onSurface
                                  .withValues(alpha: 0.55)),
                      const SizedBox(width: 6),
                      Text(
                        f.label,
                        style: AppTextStyles.caption.copyWith(
                          color: isActive
                              ? color
                              : theme.colorScheme.onSurface
                                  .withValues(alpha: 0.7),
                          fontWeight:
                              isActive ? FontWeight.w600 : FontWeight.w500,
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
              child: Icon(Icons.wb_sunny_rounded,
                  size: 24, color: const Color(0xFFE8912D)),
            ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTextStyles.heading2),
              if (subtitle != null)
                Text(
                  subtitle,
                  style: AppTextStyles.caption.copyWith(
                    color: theme.colorScheme.onSurface
                        .withValues(alpha: 0.55),
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
        child: const Icon(Icons.delete_rounded, color: Colors.white),
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
                          ? AppColors.brandPrimary
                          : theme.colorScheme.onSurface
                              .withValues(alpha: 0.35),
                      width: 1.5,
                    ),
                    color: task.isCompleted
                        ? AppColors.brandPrimary
                        : Colors.transparent,
                  ),
                  child: task.isCompleted
                      ? const Icon(Icons.check_rounded,
                          size: 14, color: Colors.white)
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
                      style: AppTextStyles.bodySmall.copyWith(
                        decoration: task.isCompleted
                            ? TextDecoration.lineThrough
                            : null,
                        color: task.isCompleted
                            ? theme.colorScheme.onSurface
                                .withValues(alpha: 0.4)
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
                        : theme.colorScheme.onSurface
                            .withValues(alpha: 0.3),
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
      items.add(Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.wb_sunny_outlined,
              size: 12,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
          const SizedBox(width: 3),
          Text('My Day',
              style: AppTextStyles.label.copyWith(
                color:
                    theme.colorScheme.onSurface.withValues(alpha: 0.5),
              )),
        ],
      ));
    }

    if (task.dueDate != null) {
      final isOverdue = task.isOverdue;
      final label = _formatDueDate(task.dueDate!);
      items.add(Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.calendar_today_rounded,
              size: 12,
              color: isOverdue
                  ? AppColors.error
                  : theme.colorScheme.onSurface.withValues(alpha: 0.5)),
          const SizedBox(width: 3),
          Text(label,
              style: AppTextStyles.label.copyWith(
                color: isOverdue
                    ? AppColors.error
                    : theme.colorScheme.onSurface
                        .withValues(alpha: 0.5),
              )),
        ],
      ));
    }

    if (task.steps != null && task.steps!.isNotEmpty) {
      final done = task.steps!.where((s) => s.isCompleted).length;
      items.add(Text('$done/${task.steps!.length}',
          style: AppTextStyles.label.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          )));
    }

    return Wrap(
      spacing: 10,
      children: items,
    );
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
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
                const SizedBox(width: 8),
                Text(
                  '完了済み (${widget.tasks.length})',
                  style: AppTextStyles.caption.copyWith(
                    color: theme.colorScheme.onSurface
                        .withValues(alpha: 0.55),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_isExpanded)
          ...widget.tasks.map((task) => _TaskItem(
                task: task,
                onToggleComplete: () => widget.onToggleComplete(task),
                onToggleImportant: () {},
                onTap: () => widget.onTap(task),
                onDismissed: () {},
              )),
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
            width: 0.5,
          ),
        ),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, -1),
                ),
              ],
      ),
      child: showField
          ? Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: controller,
                    focusNode: focusNode,
                    style: AppTextStyles.bodySmall,
                    onSubmitted: (_) => onSubmit(),
                    decoration: InputDecoration(
                      hintText: 'タスクを追加',
                      hintStyle: AppTextStyles.bodySmall.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.4),
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close_rounded,
                      size: 20,
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.45)),
                  onPressed: onCancel,
                ),
                IconButton(
                  icon: const Icon(Icons.send_rounded,
                      size: 20, color: AppColors.brandPrimary),
                  onPressed: onSubmit,
                ),
              ],
            )
          : InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    Icon(Icons.add_rounded,
                        size: 22, color: AppColors.brandPrimary),
                    const SizedBox(width: 12),
                    Text(
                      'タスクを追加',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.brandPrimary,
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
    final (icon, title, subtitle) = switch (filter) {
      TaskFilter.myDay => (
          Icons.wb_sunny_outlined,
          '今日のタスクはありません',
          'タスクを追加して今日の集中ポイントを設定しましょう',
        ),
      TaskFilter.important => (
          Icons.star_outline_rounded,
          '重要なタスクはありません',
          'スターを付けたタスクがここに表示されます',
        ),
      TaskFilter.planned => (
          Icons.calendar_today_rounded,
          '計画済みのタスクはありません',
          '期限付きのタスクがここに表示されます',
        ),
      TaskFilter.all => (
          Icons.check_circle_outline_rounded,
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
            Icon(icon,
                size: 48,
                color: theme.colorScheme.onSurface
                    .withValues(alpha: 0.2)),
            const SizedBox(height: AppSpacing.lg),
            Text(title,
                style: AppTextStyles.subtitle,
                textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.sm),
            Text(
              subtitle,
              style: AppTextStyles.caption.copyWith(
                color: theme.colorScheme.onSurface
                    .withValues(alpha: 0.45),
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
  const _TaskDetailSheet({required this.task, required this.onChanged});
  final Task task;
  final VoidCallback onChanged;

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
      final repo = ref.read(taskRepositoryProvider);
      final today = DateTime.now();
      final todayStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

      await repo.updateTask(widget.task.copyWith(
        title: title,
        note: _noteController.text.trim().isEmpty
            ? null
            : _noteController.text.trim(),
        isMyDay: _isMyDay,
        myDayDate: _isMyDay ? DateTime.parse(todayStr) : null,
        dueDate: _dueDate,
      ));
      widget.onChanged();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('エラー: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
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

    final repo = ref.read(taskRepositoryProvider);
    await repo.createStep(TaskStep(
      id: '',
      taskId: widget.task.id,
      title: title,
      createdAt: DateTime.now(),
    ));
    _stepController.clear();
    ref.invalidate(taskStepsProvider(widget.task.id));
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
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    '保存',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.brandPrimary,
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
            style: AppTextStyles.heading3,
            decoration: InputDecoration(
              hintText: 'タスク名',
              border: InputBorder.none,
              contentPadding: EdgeInsets.zero,
              hintStyle: AppTextStyles.heading3.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
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
                    onToggle: () async {
                      final repo = ref.read(taskRepositoryProvider);
                      await repo.toggleStepComplete(
                          step.id, !step.isCompleted);
                      ref.invalidate(
                          taskStepsProvider(widget.task.id));
                    },
                    onDelete: () async {
                      final repo = ref.read(taskRepositoryProvider);
                      await repo.deleteStep(step.id);
                      ref.invalidate(
                          taskStepsProvider(widget.task.id));
                    },
                  ),
              ],
            ),
          ),
          // ステップ追加
          Row(
            children: [
              Icon(Icons.add_rounded,
                  size: 18,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _stepController,
                  style: AppTextStyles.bodySmall,
                  onSubmitted: (_) => _addStep(),
                  decoration: InputDecoration(
                    hintText: 'ステップを追加',
                    hintStyle: AppTextStyles.bodySmall.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.35),
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
            icon: Icons.wb_sunny_outlined,
            label: 'My Day に追加',
            isActive: _isMyDay,
            onTap: () => setState(() => _isMyDay = !_isMyDay),
          ),

          // 期限
          _DetailActionRow(
            icon: Icons.calendar_today_rounded,
            label: _dueDate != null
                ? '期限: ${DateFormat('M/d').format(_dueDate!)}'
                : '期限日を追加',
            isActive: _dueDate != null,
            onTap: _pickDueDate,
            trailing: _dueDate != null
                ? IconButton(
                    icon: Icon(Icons.close_rounded,
                        size: 16,
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.4)),
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
                child: Icon(Icons.notes_rounded,
                    size: 20,
                    color: theme.colorScheme.onSurface
                        .withValues(alpha: 0.5)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: _noteController,
                  style: AppTextStyles.bodySmall,
                  maxLines: 6,
                  minLines: 3,
                  decoration: InputDecoration(
                    hintText: 'メモを追加',
                    hintStyle: AppTextStyles.bodySmall.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.35),
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
                      ? AppColors.brandPrimary
                      : theme.colorScheme.onSurface.withValues(alpha: 0.3),
                  width: 1.5,
                ),
                color: step.isCompleted
                    ? AppColors.brandPrimary
                    : Colors.transparent,
              ),
              child: step.isCompleted
                  ? const Icon(Icons.check_rounded,
                      size: 12, color: Colors.white)
                  : null,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              step.title,
              style: AppTextStyles.bodySmall.copyWith(
                decoration:
                    step.isCompleted ? TextDecoration.lineThrough : null,
                color: step.isCompleted
                    ? theme.colorScheme.onSurface.withValues(alpha: 0.4)
                    : null,
              ),
            ),
          ),
          GestureDetector(
            onTap: onDelete,
            child: Icon(Icons.close_rounded,
                size: 16,
                color:
                    theme.colorScheme.onSurface.withValues(alpha: 0.3)),
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

  final IconData icon;
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
            Icon(icon,
                size: 20,
                color: isActive
                    ? AppColors.brandPrimary
                    : theme.colorScheme.onSurface.withValues(alpha: 0.5)),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: AppTextStyles.bodySmall.copyWith(
                  color: isActive
                      ? AppColors.brandPrimary
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
