import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// タスクの説明を編集するハーフシート。空文字列の保存も許容する
/// （= 説明を削除する操作）。
class TaskDescEditSheet {
  TaskDescEditSheet._();

  static Future<void> show(
    BuildContext context,
    WidgetRef ref, {
    required TaskItem task,
  }) {
    return CommonSheet.show(
      context: context,
      title: '説明を編集',
      heightFactor: 0.6,
      child: _DescForm(task: task),
    );
  }
}

class _DescForm extends ConsumerStatefulWidget {
  const _DescForm({required this.task});

  final TaskItem task;

  @override
  ConsumerState<_DescForm> createState() => _DescFormState();
}

class _DescFormState extends ConsumerState<_DescForm> {
  late final _controller = TextEditingController(text: widget.task.desc);
  bool _submitting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await ref
          .read(taskItemDetailControllerProvider(widget.task.id).notifier)
          .updateDesc(_controller.text);
      if (!mounted) return;
      navigator.pop();
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('説明を更新しました'),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      CommonSnackBar.error(context, '説明の更新に失敗しました');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
        AppSpacing.screenHorizontal,
        AppSpacing.lg,
      ),
      child: Column(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              autofocus: true,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              style: AppTextStyles.body2,
              // border / fillColor は app_theme.dart の inputDecorationTheme
              // が提供するため、ここでは hint のみ指定する。
              decoration: InputDecoration(
                hintText: '説明を入力',
                hintStyle: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          CommonButton(
            onPressed: _submit,
            loading: _submitting,
            enabled: !_submitting,
            child: const Text('保存'),
          ),
        ],
      ),
    );
  }
}
