import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// サブタスク追加ハーフシート — タイトルのみを入力し、親タスクから
/// kind / source / priority / assignee を継承して新規 TaskItem を作る。
class TaskSubtaskAddSheet {
  TaskSubtaskAddSheet._();

  static Future<void> show(
    BuildContext context,
    WidgetRef ref, {
    required TaskItem parent,
  }) {
    return CommonSheet.show(
      context: context,
      title: 'サブタスクを追加',
      heightFactor: 0.35,
      child: _Form(parent: parent, ref: ref),
    );
  }
}

class _Form extends StatefulWidget {
  const _Form({required this.parent, required this.ref});

  final TaskItem parent;
  final WidgetRef ref;

  @override
  State<_Form> createState() => _FormState();
}

class _FormState extends State<_Form> {
  final _titleController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      CommonSnackBar.error(context, 'タイトルを入力してください');
      return;
    }
    setState(() => _submitting = true);
    final parent = widget.parent;
    final subtask = TaskItem(
      id: 'optimistic-${DateTime.now().microsecondsSinceEpoch}',
      // `0` は「まだ DB 採番されていない」placeholder。
      // repo.addSubtask の戻り値で 1 以上の正規値に置換される。
      seq: 0,
      type: DevTaskType.subtask,
      title: title,
      desc: '',
      priority: parent.priority,
      status: TaskStatus.todo,
      source: parent.source,
      assigner: parent.assigner,
      assignee: parent.assignee,
      parent: parent.id,
    );
    try {
      await widget.ref
          .read(taskItemDetailControllerProvider(parent.id).notifier)
          .addSubtask(subtask);
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      CommonSnackBar.error(context, 'サブタスクの追加に失敗しました');
      return;
    }
    if (!mounted) return;
    Navigator.pop(context);
    CommonSnackBar.show(context, 'サブタスクを追加しました');
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
          onSubmitted: (_) => _submit(),
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
