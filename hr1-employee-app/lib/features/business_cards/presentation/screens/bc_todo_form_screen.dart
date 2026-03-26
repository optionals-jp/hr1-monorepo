import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/bc_todo_controller.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// CRM TODO登録画面
class BcTodoFormScreen extends HookConsumerWidget {
  const BcTodoFormScreen({
    super.key,
    this.companyId,
    this.contactId,
    this.dealId,
  });

  final String? companyId;
  final String? contactId;
  final String? dealId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final titleCtl = useTextEditingController();
    final descriptionCtl = useTextEditingController();
    final dueDate = useState<DateTime?>(null);
    final isSaving = useState(false);

    Future<void> pickDueDate() async {
      final picked = await showDatePicker(
        context: context,
        initialDate: dueDate.value ?? DateTime.now(),
        firstDate: DateTime.now().subtract(const Duration(days: 1)),
        lastDate: DateTime(2030),
      );
      if (picked != null) dueDate.value = picked;
    }

    Future<void> save() async {
      if (titleCtl.text.trim().isEmpty) {
        CommonSnackBar.error(context, 'タイトルは必須です');
        return;
      }

      isSaving.value = true;
      try {
        final controller = ref.read(bcTodoControllerProvider.notifier);
        final userId = Supabase.instance.client.auth.currentUser!.id;

        await controller.createTodo({
          'title': titleCtl.text.trim(),
          'description': descriptionCtl.text.trim().isEmpty
              ? null
              : descriptionCtl.text.trim(),
          'due_date': dueDate.value?.toIso8601String().split('T').first,
          'assigned_to': userId,
          'company_id': companyId,
          'contact_id': contactId,
          'deal_id': dealId,
        });

        if (context.mounted) {
          CommonSnackBar.show(context, 'TODOを登録しました');
          context.pop();
        }
      } catch (e) {
        if (context.mounted) {
          CommonSnackBar.error(context, '登録に失敗しました');
        }
      } finally {
        isSaving.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('CRM TODO登録')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: titleCtl,
              decoration: const InputDecoration(
                labelText: 'タイトル *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today),
              title: Text(
                dueDate.value != null
                    ? '${dueDate.value!.year}/${dueDate.value!.month}/${dueDate.value!.day}'
                    : '期限日を設定',
                style: AppTextStyles.body1,
              ),
              trailing: dueDate.value != null
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => dueDate.value = null,
                    )
                  : null,
              onTap: pickDueDate,
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: descriptionCtl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: '詳細メモ',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: CommonButton(
            onPressed: isSaving.value ? null : save,
            child: Text(isSaving.value ? '保存中...' : '保存'),
          ),
        ),
      ),
    );
  }
}
