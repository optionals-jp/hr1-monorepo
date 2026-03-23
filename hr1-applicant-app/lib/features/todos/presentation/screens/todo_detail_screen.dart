import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/todos/domain/entities/todo.dart';
import 'package:hr1_applicant_app/features/todos/presentation/controllers/todo_controller.dart';

/// やること詳細画面
class TodoDetailScreen extends HookConsumerWidget {
  const TodoDetailScreen({super.key, required this.todo});
  final Todo todo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final titleController = useTextEditingController(text: todo.title);
    final noteController = useTextEditingController(text: todo.note ?? '');
    final dueDate = useState<DateTime?>(todo.dueDate);
    final isSaving = useState(false);

    final isSystemGenerated = todo.isSystemGenerated;

    Future<void> save() async {
      final title = titleController.text.trim();
      if (title.isEmpty) return;

      isSaving.value = true;
      try {
        await ref
            .read(todoListControllerProvider.notifier)
            .updateTodo(
              todo.copyWith(
                title: title,
                note: noteController.text.trim().isEmpty
                    ? null
                    : noteController.text.trim(),
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
      final picked = await CommonDatePicker.show(
        context: context,
        initialDate: dueDate.value ?? DateTime.now(),
        firstDate: DateTime(2020),
        lastDate: DateTime(2030),
      );
      if (picked != null) dueDate.value = picked;
    }

    return CommonScaffold(
      appBar: AppBar(
        title: const Text('やることの詳細'),
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
                    style: AppTextStyles.body2.copyWith(
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
            controller: titleController,
            readOnly: isSystemGenerated,
            style: AppTextStyles.title3,
            decoration: InputDecoration(
              hintText: 'やること名',
              border: InputBorder.none,
              contentPadding: EdgeInsets.zero,
              hintStyle: AppTextStyles.title3.copyWith(
                color: AppColors.textSecondary(theme.brightness),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // システム生成の場合、アクションボタン表示
          if (isSystemGenerated && todo.actionUrl != null) ...[
            FilledButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                context.push(todo.actionUrl!);
              },
              icon: const Icon(Icons.open_in_new_rounded, size: 18),
              label: const Text('アクションへ移動'),
              style: FilledButton.styleFrom(backgroundColor: AppColors.brand),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],

          // 期限
          _DetailActionRow(
            icon: Icon(
              Icons.calendar_today_rounded,
              size: 20,
              color: dueDate.value != null
                  ? AppColors.brand
                  : AppColors.textSecondary(theme.brightness),
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
                      color: AppColors.textSecondary(theme.brightness),
                    ),
                    onPressed: () => dueDate.value = null,
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
                child: Icon(
                  Icons.notes_rounded,
                  size: 20,
                  color: AppColors.textSecondary(theme.brightness),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: noteController,
                  style: AppTextStyles.body2,
                  maxLines: 6,
                  minLines: 3,
                  decoration: InputDecoration(
                    hintText: 'メモを追加',
                    hintStyle: AppTextStyles.body2.copyWith(
                      color: AppColors.textSecondary(theme.brightness),
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
                style: AppTextStyles.body2.copyWith(
                  color: isActive
                      ? AppColors.brand
                      : Theme.of(context).colorScheme.onSurface,
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
