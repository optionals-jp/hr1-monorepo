import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// HR-28 follow-up: ユーザーが所属する組織を切り替える UI。
///
/// 所属が 1 組織のみの場合は何も表示しない (SizedBox.shrink)。
/// 2 組織以上の場合のみ MenuRow を表示し、タップで bottom sheet を開く。
class OrganizationSwitcherTile extends ConsumerWidget {
  const OrganizationSwitcherTile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);
    if (user == null || user.organizations.length < 2) {
      return const SizedBox.shrink();
    }

    return MenuRow(
      icon: const Icon(Icons.business_outlined),
      title: '組織を切り替える',
      subtitle: user.activeOrganizationName,
      showChevron: true,
      onTap: () => _showPicker(context, ref),
    );
  }

  Future<void> _showPicker(BuildContext context, WidgetRef ref) async {
    final user = ref.read(appUserProvider);
    if (user == null) return;

    final selected = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Text('組織を選択', style: AppTextStyles.headline),
            ),
            for (final org in user.organizations)
              ListTile(
                leading: Icon(
                  org.id == user.activeOrganizationId
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: org.id == user.activeOrganizationId
                      ? AppColors.brand
                      : AppColors.textTertiary(ctx),
                ),
                title: Text(org.name, style: AppTextStyles.body1),
                onTap: () => Navigator.of(ctx).pop(org.id),
              ),
            const SizedBox(height: AppSpacing.md),
          ],
        ),
      ),
    );

    if (selected == null || !context.mounted) return;

    final ok = await ref
        .read(authControllerProvider.notifier)
        .switchActiveOrganization(selected);

    if (!context.mounted) return;
    if (ok) {
      CommonSnackBar.show(context, '組織を切り替えました');
    } else {
      final err = ref.read(authControllerProvider).error ?? '切り替えに失敗しました';
      CommonSnackBar.error(context, err);
    }
  }
}
