import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/deal_controller.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 商談登録画面
class DealFormScreen extends HookConsumerWidget {
  const DealFormScreen({super.key, this.companyId, this.contactId});

  final String? companyId;
  final String? contactId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final titleCtl = useTextEditingController();
    final amountCtl = useTextEditingController();
    final descriptionCtl = useTextEditingController();
    final stagesAsync = ref.watch(crmPipelineStagesProvider);
    final selectedStageId = useState<String?>(null);
    final closeDate = useState<DateTime?>(null);
    final isSaving = useState(false);

    // ステージ取得後に最初のステージを既定値に
    stagesAsync.whenData((stages) {
      if (selectedStageId.value == null && stages.isNotEmpty) {
        selectedStageId.value = stages.first.id;
      }
    });

    Future<void> pickCloseDate() async {
      final picked = await showDatePicker(
        context: context,
        initialDate: closeDate.value ?? DateTime.now(),
        firstDate: DateTime(2020),
        lastDate: DateTime(2030),
      );
      if (picked != null) closeDate.value = picked;
    }

    Future<void> save() async {
      if (titleCtl.text.trim().isEmpty) {
        CommonSnackBar.error(context, '商談名は必須です');
        return;
      }

      isSaving.value = true;
      try {
        final controller = ref.read(dealListControllerProvider.notifier);
        final userId = Supabase.instance.client.auth.currentUser!.id;

        await controller.createDeal({
          'title': titleCtl.text.trim(),
          'amount': amountCtl.text.isNotEmpty
              ? int.tryParse(amountCtl.text.replaceAll(',', ''))
              : null,
          'stage_id': selectedStageId.value,
          'expected_close_date': closeDate.value
              ?.toIso8601String()
              .split('T')
              .first,
          'description': descriptionCtl.text.trim().isEmpty
              ? null
              : descriptionCtl.text.trim(),
          'company_id': companyId,
          'contact_id': contactId,
          'assigned_to': userId,
        });

        if (context.mounted) {
          CommonSnackBar.show(context, '商談を登録しました');
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
      appBar: AppBar(title: const Text('商談登録')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: titleCtl,
              decoration: const InputDecoration(
                labelText: '商談名 *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: amountCtl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: '金額（円）',
                border: OutlineInputBorder(),
                prefixText: '¥',
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            Text('ステージ', style: AppTextStyles.headline),
            const SizedBox(height: AppSpacing.xs),
            stagesAsync.when(
              loading: () => const LoadingIndicator(size: 20),
              error: (_, __) => const Text('ステージの読み込みに失敗しました'),
              data: (stages) {
                if (stages.isEmpty) {
                  return const Text('パイプラインが未設定です');
                }
                return Wrap(
                  spacing: AppSpacing.xs,
                  children: stages.map((stage) {
                    return ChoiceChip(
                      label: Text(stage.name),
                      selected: selectedStageId.value == stage.id,
                      onSelected: (_) => selectedStageId.value = stage.id,
                    );
                  }).toList(),
                );
              },
            ),

            const SizedBox(height: AppSpacing.md),

            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today),
              title: Text(
                closeDate.value != null
                    ? '${closeDate.value!.year}/${closeDate.value!.month}/${closeDate.value!.day}'
                    : '見込み日を設定',
                style: AppTextStyles.body1,
              ),
              trailing: closeDate.value != null
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => closeDate.value = null,
                    )
                  : null,
              onTap: pickCloseDate,
            ),

            const SizedBox(height: AppSpacing.sm),

            TextField(
              controller: descriptionCtl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: '説明',
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
