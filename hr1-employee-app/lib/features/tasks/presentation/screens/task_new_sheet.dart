import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_meta.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_list_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_chips.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// タスク追加ハーフシート — CommonSheet で表示する新規タスク作成フォーム。
class TaskNewSheet {
  TaskNewSheet._();

  static Future<void> show(BuildContext context, WidgetRef ref) {
    return CommonSheet.show(
      context: context,
      title: '新規タスク',
      heightFactor: 0.75,
      child: _TaskNewForm(
        onSubmit:
            ({
              required String title,
              String? desc,
              required TaskPriority priority,
              required TaskSource source,
              required TaskStatus status,
              String? due,
            }) async {
              final me = ref.read(currentTaskUserProvider);
              if (me == null) {
                throw StateError('addTask requires an authenticated user');
              }
              // id / seq はサーバ側で採番する。
              // - id: uuid (gen_random_uuid)
              // - seq: per-organization 連番（DB トリガ）
              // クライアントは optimistic 表示用 placeholder を入れ、
              // controller.add() の戻り値で真の値に置き換わる。
              final activeKey = (
                showDone: false,
                source: ref.read(taskSourceFilterProvider),
              );
              await ref
                  .read(taskItemListControllerProvider(activeKey).notifier)
                  .add(
                    TaskItem(
                      id: 'optimistic-${DateTime.now().microsecondsSinceEpoch}',
                      // `0` は「まだ DB 採番されていない」placeholder。
                      // controller.add() の戻り値で 1 以上の正規値に置換される。
                      seq: 0,
                      type: DevTaskType.task,
                      title: title,
                      desc: desc ?? '',
                      priority: priority,
                      status: status,
                      source: source,
                      assigner: me,
                      assignee: me,
                      due: due,
                    ),
                  );
            },
      ),
    );
  }
}

class _TaskNewForm extends StatefulWidget {
  const _TaskNewForm({required this.onSubmit});

  final Future<void> Function({
    required String title,
    String? desc,
    required TaskPriority priority,
    required TaskSource source,
    required TaskStatus status,
    String? due,
  })
  onSubmit;

  @override
  State<_TaskNewForm> createState() => _TaskNewFormState();
}

class _TaskNewFormState extends State<_TaskNewForm> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  TaskPriority _priority = TaskPriority.mid;
  TaskSource _source = TaskSource.self;
  TaskStatus _status = TaskStatus.todo;
  DateTime? _due;
  bool _submitting = false;

  Future<void> _pickDue() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _due ?? now,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365 * 2)),
    );
    if (picked != null) setState(() => _due = picked);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      CommonSnackBar.error(context, 'タイトルを入力してください');
      return;
    }
    setState(() => _submitting = true);
    final navigator = Navigator.of(context);
    try {
      await widget.onSubmit(
        title: title,
        desc: _descController.text.trim().isEmpty
            ? null
            : _descController.text.trim(),
        priority: _priority,
        source: _source,
        status: _status,
        due: _due == null ? null : TaskMeta.formatIso(_due!),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      CommonSnackBar.error(context, 'タスクの追加に失敗しました');
      return;
    }
    if (!mounted) return;
    CommonSnackBar.show(context, 'タスクを追加しました');
    navigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
        AppSpacing.screenHorizontal,
        AppSpacing.lg,
      ),
      children: [
        TextField(
          controller: _titleController,
          autofocus: true,
          style: AppTextStyles.body2,
          decoration: InputDecoration(
            hintText: 'タイトルを入力',
            hintStyle: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _descController,
          style: AppTextStyles.body2,
          maxLines: 3,
          minLines: 1,
          decoration: InputDecoration(
            hintText: '説明（任意）',
            hintStyle: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          '優先度',
          style: AppTextStyles.caption2.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: AppSpacing.xs,
          runSpacing: AppSpacing.xs,
          children: [
            for (final p in TaskPriority.values)
              CommonSelectPill(
                label: TaskMeta.priorityLabel(p),
                color: taskPriorityColor(p),
                selected: _priority == p,
                onTap: () => setState(() => _priority = p),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'ステータス',
          style: AppTextStyles.caption2.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: AppSpacing.xs,
          runSpacing: AppSpacing.xs,
          children: [
            for (final s in TaskStatus.values)
              CommonSelectPill(
                label: TaskMeta.statusLabel(s),
                color: taskStatusColor(s),
                selected: _status == s,
                onTap: () => setState(() => _status = s),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          '期限',
          style: AppTextStyles.caption2.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        InkWell(
          onTap: _pickDue,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
            child: Row(
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  size: 16,
                  color: AppColors.textSecondary(context),
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  _due == null
                      ? '期限日を設定'
                      : '${_due!.year}/${_due!.month}/${_due!.day}',
                  style: _due == null
                      ? AppTextStyles.body2.copyWith(
                          color: AppColors.textSecondary(context),
                        )
                      : AppTextStyles.body2,
                ),
                if (_due != null) ...[
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () => setState(() => _due = null),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          '分類',
          style: AppTextStyles.caption2.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: AppSpacing.xs,
          runSpacing: AppSpacing.xs,
          children: [
            for (final s in TaskMeta.userSelectableSources)
              CommonSelectPill(
                label: TaskMeta.sourceLabel(s),
                color: taskSourceColor(s),
                selected: _source == s,
                onTap: () => setState(() => _source = s),
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
