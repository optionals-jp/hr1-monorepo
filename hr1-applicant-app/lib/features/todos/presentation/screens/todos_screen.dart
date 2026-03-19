import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/router/app_router.dart';
import 'package:hr1_applicant_app/core/constants/app_colors.dart';
import 'package:hr1_applicant_app/core/constants/app_spacing.dart';
import 'package:hr1_applicant_app/core/constants/app_text_styles.dart';
import 'package:hr1_applicant_app/shared/widgets/common_button.dart';
import 'package:hr1_applicant_app/shared/widgets/common_sheet.dart';
import 'package:hr1_applicant_app/shared/widgets/common_snackbar.dart';
import 'package:hr1_applicant_app/shared/widgets/loading_indicator.dart';
import 'package:hr1_applicant_app/shared/widgets/error_state.dart';
import '../../domain/entities/todo.dart';
import '../controllers/todo_controller.dart';
import '../providers/todo_providers.dart';

/// やること画面
class TodosScreen extends ConsumerWidget {
  const TodosScreen({super.key});

  void _showAddSheet(BuildContext context, WidgetRef ref) {
    CommonSheet.show(
      context: context,
      title: 'やることを追加',
      child: _AddTodoForm(
        onSubmit:
            ({
              required String title,
              String? note,
              DateTime? dueDate,
              bool isImportant = false,
            }) async {
              await ref
                  .read(todoListControllerProvider.notifier)
                  .addTodo(
                    title,
                    note: note,
                    dueDate: dueDate,
                    isImportant: isImportant,
                  );
            },
      ),
    );
  }

  void _onTodoTap(BuildContext context, Todo todo) {
    if (todo.isSystemGenerated && todo.actionUrl != null) {
      context.push(todo.actionUrl!);
    } else {
      context.push(AppRoutes.todoDetail, extra: todo);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(todoFilterProvider);
    final todosAsync = ref.watch(todoListControllerProvider);
    final controller = ref.read(todoListControllerProvider.notifier);

    return Column(
      children: [
        _FilterTabs(
          selected: filter,
          onSelected: (f) => ref.read(todoFilterProvider.notifier).state = f,
        ),
        _FilterHeader(filter: filter),
        Expanded(
          child: todosAsync.when(
            loading: () => const LoadingIndicator(),
            error: (e, _) => ErrorState(
              onRetry: () => ref.invalidate(todoListControllerProvider),
            ),
            data: (todos) {
              final incomplete = todos.where((t) => !t.isCompleted).toList();
              final completed = todos.where((t) => t.isCompleted).toList();

              if (incomplete.isEmpty && completed.isEmpty) {
                return _EmptyTodoState(filter: filter);
              }

              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(todoListControllerProvider);
                },
                child: ListView(
                  padding: const EdgeInsets.only(bottom: 100),
                  children: [
                    for (final todo in incomplete)
                      _TodoItem(
                        todo: todo,
                        onToggleComplete: () => controller.toggleComplete(
                          todo.id,
                          todo.isCompleted,
                        ),
                        onToggleImportant: () => controller.toggleImportant(
                          todo.id,
                          todo.isImportant,
                        ),
                        onTap: () => _onTodoTap(context, todo),
                        onDismissed: todo.isSystemGenerated
                            ? null
                            : () => controller.deleteTodo(todo.id),
                      ),
                    if (completed.isNotEmpty)
                      _CompletedSection(
                        todos: completed,
                        onToggleComplete: (todo) => controller.toggleComplete(
                          todo.id,
                          todo.isCompleted,
                        ),
                        onTap: (todo) => _onTodoTap(context, todo),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
        _AddTodoButton(onTap: () => _showAddSheet(context, ref)),
      ],
    );
  }
}

// ─── フィルタタブ ───

class _FilterTabs extends StatelessWidget {
  const _FilterTabs({required this.selected, required this.onSelected});
  final TodoFilter selected;
  final ValueChanged<TodoFilter> onSelected;

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
        children: TodoFilter.values.map((f) {
          final isActive = f == selected;
          final (icon, color) = switch (f) {
            TodoFilter.incomplete => (
              Icons.checklist_rounded,
              AppColors.primaryLight,
            ),
            TodoFilter.important => (
              Icons.star_outline_rounded,
              AppColors.error,
            ),
            TodoFilter.all => (Icons.list_rounded, AppColors.primary),
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 4,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        icon,
                        size: 16,
                        color: isActive ? color : AppColors.textSecondary,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        f.label,
                        style: AppTextStyles.caption2.copyWith(
                          color: isActive
                              ? color
                              : theme.colorScheme.onSurface.withValues(
                                  alpha: 0.7,
                                ),
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

// ─── フィルタヘッダー ───

class _FilterHeader extends StatelessWidget {
  const _FilterHeader({required this.filter});
  final TodoFilter filter;

  @override
  Widget build(BuildContext context) {
    final title = switch (filter) {
      TodoFilter.incomplete => '未完了',
      TodoFilter.important => '重要',
      TodoFilter.all => 'すべてのやること',
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.md,
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
      ),
      child: Row(children: [Text(title, style: AppTextStyles.title3)]),
    );
  }
}

// ─── やることアイテム ───

class _TodoItem extends StatelessWidget {
  const _TodoItem({
    required this.todo,
    required this.onToggleComplete,
    required this.onToggleImportant,
    required this.onTap,
    this.onDismissed,
  });

  final Todo todo;
  final VoidCallback onToggleComplete;
  final VoidCallback onToggleImportant;
  final VoidCallback onTap;
  final VoidCallback? onDismissed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Widget item = InkWell(
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
                    color: todo.isCompleted
                        ? AppColors.primaryLight
                        : theme.colorScheme.onSurface.withValues(alpha: 0.35),
                    width: 1.5,
                  ),
                  color: todo.isCompleted
                      ? AppColors.primaryLight
                      : Colors.transparent,
                ),
                child: todo.isCompleted
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
                    todo.title,
                    style: AppTextStyles.body2.copyWith(
                      decoration: todo.isCompleted
                          ? TextDecoration.lineThrough
                          : null,
                      color: todo.isCompleted
                          ? theme.colorScheme.onSurface.withValues(alpha: 0.4)
                          : null,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (_hasMetadata) ...[
                    const SizedBox(height: 3),
                    _MetadataRow(todo: todo),
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
                  todo.isImportant
                      ? Icons.star_rounded
                      : Icons.star_outline_rounded,
                  size: 22,
                  color: todo.isImportant
                      ? AppColors.error
                      : theme.colorScheme.onSurface.withValues(alpha: 0.3),
                ),
              ),
            ),
          ],
        ),
      ),
    );

    // 手動作成のみスワイプ削除可
    if (onDismissed != null) {
      item = Dismissible(
        key: ValueKey(todo.id),
        direction: DismissDirection.endToStart,
        background: Container(
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 20),
          color: AppColors.error,
          child: const Icon(
            Icons.delete_rounded,
            size: 24,
            color: Colors.white,
          ),
        ),
        onDismissed: (_) => onDismissed!(),
        child: item,
      );
    } else {
      item = KeyedSubtree(key: ValueKey(todo.id), child: item);
    }

    return item;
  }

  bool get _hasMetadata => todo.dueDate != null || todo.isSystemGenerated;
}

// ─── メタデータ行 ───

class _MetadataRow extends StatelessWidget {
  const _MetadataRow({required this.todo});
  final Todo todo;

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];

    // ソースバッジ（システム生成）
    if (todo.isSystemGenerated) {
      items.add(
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
          decoration: BoxDecoration(
            color: _sourceColor(todo.source).withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            todo.source.label,
            style: AppTextStyles.caption2.copyWith(
              color: _sourceColor(todo.source),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
    }

    // 期限
    if (todo.dueDate != null) {
      final isOverdue = todo.isOverdue;
      final label = _formatDueDate(todo.dueDate!);
      items.add(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.calendar_today_rounded,
              size: 12,
              color: isOverdue ? AppColors.error : AppColors.textSecondary,
            ),
            const SizedBox(width: 3),
            Text(
              label,
              style: AppTextStyles.caption2.copyWith(
                fontWeight: FontWeight.w500,
                color: isOverdue ? AppColors.error : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return Wrap(spacing: 10, children: items);
  }

  Color _sourceColor(TodoSource source) {
    return switch (source) {
      TodoSource.survey => AppColors.accent,
      TodoSource.form => AppColors.success,
      TodoSource.interview => AppColors.warning,
      TodoSource.system => AppColors.primaryLight,
      TodoSource.manual => AppColors.textSecondary,
    };
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

// ─── 完了セクション ───

class _CompletedSection extends StatefulWidget {
  const _CompletedSection({
    required this.todos,
    required this.onToggleComplete,
    required this.onTap,
  });

  final List<Todo> todos;
  final ValueChanged<Todo> onToggleComplete;
  final ValueChanged<Todo> onTap;

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
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 8),
                Text(
                  '完了済み (${widget.todos.length})',
                  style: AppTextStyles.caption1.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_isExpanded)
          ...widget.todos.map(
            (todo) => _TodoItem(
              todo: todo,
              onToggleComplete: () => widget.onToggleComplete(todo),
              onToggleImportant: () {},
              onTap: () => widget.onTap(todo),
            ),
          ),
      ],
    );
  }
}

// ─── やること追加ボタン ───

class _AddTodoButton extends StatelessWidget {
  const _AddTodoButton({required this.onTap});
  final VoidCallback onTap;

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
          top: BorderSide(color: theme.colorScheme.outlineVariant, width: 0.5),
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
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Icon(Icons.add_rounded, size: 22, color: AppColors.primaryLight),
              const SizedBox(width: 12),
              Text(
                'やることを追加',
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.primaryLight,
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

// ─── やること追加フォーム ───

class _AddTodoForm extends StatefulWidget {
  const _AddTodoForm({required this.onSubmit});
  final Future<void> Function({
    required String title,
    String? note,
    DateTime? dueDate,
    bool isImportant,
  })
  onSubmit;

  @override
  State<_AddTodoForm> createState() => _AddTodoFormState();
}

class _AddTodoFormState extends State<_AddTodoForm> {
  final _titleController = TextEditingController();
  final _noteController = TextEditingController();
  DateTime? _dueDate;
  bool _isImportant = false;
  bool _submitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    setState(() => _submitting = true);
    try {
      await widget.onSubmit(
        title: title,
        note: _noteController.text.trim().isEmpty
            ? null
            : _noteController.text.trim(),
        dueDate: _dueDate,
        isImportant: _isImportant,
      );
      if (mounted) {
        Navigator.pop(context);
        CommonSnackBar.show(context, 'やることを追加しました');
      }
    } catch (e) {
      if (mounted) CommonSnackBar.error(context, 'エラー: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime(2030),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      children: [
        TextField(
          controller: _titleController,
          autofocus: true,
          style: AppTextStyles.body2,
          decoration: InputDecoration(
            hintText: 'タイトルを入力',
            hintStyle: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _noteController,
          style: AppTextStyles.body2,
          maxLines: 3,
          minLines: 1,
          decoration: InputDecoration(
            hintText: 'メモ（任意）',
            hintStyle: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Row(
          children: [
            _OptionChip(
              icon: Icons.calendar_today_rounded,
              label: _dueDate != null
                  ? '${_dueDate!.month}/${_dueDate!.day}'
                  : '期限',
              isActive: _dueDate != null,
              activeColor: AppColors.primaryLight,
              onTap: _pickDueDate,
              onClear: _dueDate != null
                  ? () => setState(() => _dueDate = null)
                  : null,
            ),
            const SizedBox(width: AppSpacing.sm),
            _OptionChip(
              icon: _isImportant
                  ? Icons.star_rounded
                  : Icons.star_outline_rounded,
              label: '重要',
              isActive: _isImportant,
              activeColor: AppColors.error,
              onTap: () => setState(() => _isImportant = !_isImportant),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        CommonButton(
          onPressed: _submit,
          loading: _submitting,
          enabled: !_submitting,
          child: const Text('追加'),
        ),
      ],
    );
  }
}

/// オプション選択チップ（期限・重要）
class _OptionChip extends StatelessWidget {
  const _OptionChip({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.activeColor,
    required this.onTap,
    this.onClear,
  });

  final IconData icon;
  final String label;
  final bool isActive;
  final Color activeColor;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? activeColor.withValues(alpha: 0.1)
              : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isActive ? activeColor : AppColors.textSecondary,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                color: isActive ? activeColor : AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (onClear != null) ...[
              const SizedBox(width: 4),
              GestureDetector(
                onTap: onClear,
                child: Icon(Icons.close_rounded, size: 14, color: activeColor),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── 空状態 ───

class _EmptyTodoState extends StatelessWidget {
  const _EmptyTodoState({required this.filter});
  final TodoFilter filter;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final emptyColor = theme.colorScheme.onSurface.withValues(alpha: 0.2);
    final (icon, title, subtitle) = switch (filter) {
      TodoFilter.incomplete => (
        Icon(Icons.checklist_rounded, size: 48, color: emptyColor),
        'やることはありません',
        '下の「+ やることを追加」から始めましょう',
      ),
      TodoFilter.important => (
        Icon(Icons.star_outline_rounded, size: 48, color: emptyColor),
        '重要なやることはありません',
        'スターを付けたやることがここに表示されます',
      ),
      TodoFilter.all => (
        Icon(Icons.check_circle_outline_rounded, size: 48, color: emptyColor),
        'やることはありません',
        '下の「+ やることを追加」から始めましょう',
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
              style: AppTextStyles.callout,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              subtitle,
              style: AppTextStyles.caption1.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
