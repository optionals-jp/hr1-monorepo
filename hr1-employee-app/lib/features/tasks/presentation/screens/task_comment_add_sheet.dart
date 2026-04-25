import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// コメントを追加するためのハーフシート。
class TaskCommentAddSheet {
  TaskCommentAddSheet._();

  static Future<void> show(
    BuildContext context,
    WidgetRef ref, {
    required TaskItem task,
  }) {
    return CommonSheet.show(
      context: context,
      title: 'コメントを追加',
      heightFactor: 0.5,
      child: _CommentAddForm(task: task),
    );
  }
}

class _CommentAddForm extends ConsumerStatefulWidget {
  const _CommentAddForm({required this.task});

  final TaskItem task;

  @override
  ConsumerState<_CommentAddForm> createState() => _CommentAddFormState();
}

class _CommentAddFormState extends ConsumerState<_CommentAddForm> {
  late final _controller = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      CommonSnackBar.error(context, 'コメントを入力してください');
      return;
    }
    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await ref
          .read(taskItemDetailControllerProvider(widget.task.id).notifier)
          .addComment(text);
      if (!mounted) return;
      navigator.pop();
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('コメントを追加しました'),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      CommonSnackBar.error(context, 'コメントの追加に失敗しました');
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
                hintText: 'コメントを入力',
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
            child: const Text('送信'),
          ),
        ],
      ),
    );
  }
}
