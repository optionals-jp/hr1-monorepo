import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_activity.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 活動（アポ・メモ等）登録画面
class ActivityFormScreen extends HookConsumerWidget {
  const ActivityFormScreen({
    super.key,
    this.companyId,
    this.contactId,
    this.dealId,
    this.initialType = 'memo',
  });

  final String? companyId;
  final String? contactId;
  final String? dealId;
  final String initialType;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final titleCtl = useTextEditingController();
    final descriptionCtl = useTextEditingController();
    final selectedType = useState(ActivityType.fromString(initialType));
    final activityDate = useState<DateTime?>(
      selectedType.value == ActivityType.appointment ? DateTime.now() : null,
    );
    final isSaving = useState(false);

    Future<void> save() async {
      if (titleCtl.text.trim().isEmpty) {
        CommonSnackBar.error(context, 'タイトルは必須です');
        return;
      }

      isSaving.value = true;
      try {
        final repo = ref.read(bcRepositoryProvider);
        await repo.createActivity({
          'activity_type': selectedType.value.name,
          'title': titleCtl.text.trim(),
          'description': descriptionCtl.text.trim().isEmpty
              ? null
              : descriptionCtl.text.trim(),
          'activity_date': activityDate.value?.toIso8601String(),
          'company_id': companyId,
          'contact_id': contactId,
          'deal_id': dealId,
        });

        if (contactId != null) {
          ref.invalidate(bcActivitiesByContactProvider(contactId!));
        }
        if (companyId != null) {
          ref.invalidate(bcActivitiesByCompanyProvider(companyId!));
        }
        if (dealId != null) {
          ref.invalidate(bcActivitiesByDealProvider(dealId!));
        }

        if (context.mounted) {
          CommonSnackBar.show(context, '活動を登録しました');
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

    Future<void> pickDate() async {
      final picked = await showDatePicker(
        context: context,
        initialDate: activityDate.value ?? DateTime.now(),
        firstDate: DateTime(2020),
        lastDate: DateTime(2030),
      );
      if (picked != null) {
        final time = await showTimePicker(
          context: context,
          initialTime: TimeOfDay.now(),
        );
        if (time != null) {
          activityDate.value = DateTime(
            picked.year,
            picked.month,
            picked.day,
            time.hour,
            time.minute,
          );
        } else {
          activityDate.value = picked;
        }
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('活動登録')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 活動種別
            Text('種別', style: AppTextStyles.headline),
            const SizedBox(height: AppSpacing.xs),
            Wrap(
              spacing: AppSpacing.xs,
              children: ActivityType.values.map((type) {
                final isSelected = selectedType.value == type;
                return ChoiceChip(
                  label: Text(type.label),
                  selected: isSelected,
                  onSelected: (_) => selectedType.value = type,
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.md),

            TextField(
              controller: titleCtl,
              decoration: const InputDecoration(
                labelText: 'タイトル *',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: AppSpacing.sm),

            // 日時
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today),
              title: Text(
                activityDate.value != null
                    ? '${activityDate.value!.year}/${activityDate.value!.month}/${activityDate.value!.day} ${activityDate.value!.hour}:${activityDate.value!.minute.toString().padLeft(2, '0')}'
                    : '日時を設定',
                style: AppTextStyles.body1,
              ),
              trailing: activityDate.value != null
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => activityDate.value = null,
                    )
                  : null,
              onTap: pickDate,
            ),

            const SizedBox(height: AppSpacing.sm),

            TextField(
              controller: descriptionCtl,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: '詳細メモ',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),

            const SizedBox(height: AppSpacing.xxl),
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
