import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/constants.dart';
import '../../features/auth/presentation/providers/organization_context_provider.dart';
import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/auth/domain/entities/organization.dart';
import 'org_icon.dart';

/// 企業切り替えウィジェット（AppBar用）
/// 応募者が複数企業にエントリーしている場合にのみ表示される
class OrganizationSwitcher extends ConsumerWidget {
  const OrganizationSwitcher({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canSwitch = ref.watch(canSwitchOrganizationProvider);
    final currentOrg = ref.watch(currentOrganizationProvider);

    // 切り替え不要な場合（社員 or 応募先が1社のみ）は企業名だけ表示
    if (!canSwitch) {
      if (currentOrg == null) return const SizedBox.shrink();
      return _OrganizationLabel(organization: currentOrg);
    }

    // 応募者で複数企業の場合はタップで切り替え可能
    return GestureDetector(
      onTap: () => _showOrganizationPicker(context, ref),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          OrgIcon(initial: (currentOrg?.name ?? '?').substring(0, 1), size: 32),
          const SizedBox(width: AppSpacing.sm),
          Flexible(
            child: Text(
              currentOrg?.name ?? '',
              style: AppTextStyles.title3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          const Icon(
            Icons.unfold_more,
            size: 18,
            color: AppColors.primaryLight,
          ),
        ],
      ),
    );
  }

  /// 企業選択ボトムシートを表示
  void _showOrganizationPicker(BuildContext context, WidgetRef ref) {
    final organizations = ref.read(userOrganizationsProvider);
    final currentOrg = ref.read(currentOrganizationProvider);

    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppSpacing.cardRadius),
        ),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ヘッダー
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.lg,
                  AppSpacing.lg,
                  AppSpacing.sm,
                ),
                child: Text('応募先企業を選択', style: AppTextStyles.callout),
              ),
              const Divider(),

              // 企業リスト
              ...organizations.map((org) {
                final isSelected = currentOrg?.id == org.id;
                return _OrganizationListTile(
                  organization: org,
                  isSelected: isSelected,
                  onTap: () {
                    ref
                        .read(currentOrganizationProvider.notifier)
                        .switchOrganization(org);
                    Navigator.pop(context);
                  },
                );
              }),
              const SizedBox(height: AppSpacing.sm),
            ],
          ),
        );
      },
    );
  }
}

/// 企業名ラベル（切り替え不可の場合に表示）
class _OrganizationLabel extends StatelessWidget {
  const _OrganizationLabel({required this.organization});

  final Organization organization;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        OrgIcon(initial: organization.name.substring(0, 1), size: 32),
        const SizedBox(width: AppSpacing.sm),
        Flexible(
          child: Text(
            organization.name,
            style: AppTextStyles.body2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

/// 企業リストのタイル（ボトムシート内）
class _OrganizationListTile extends StatelessWidget {
  const _OrganizationListTile({
    required this.organization,
    required this.isSelected,
    required this.onTap,
  });

  final Organization organization;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: OrgIcon(
        initial: organization.name.substring(0, 1),
        size: 40,
        borderRadius: 10,
        color: isSelected
            ? theme.colorScheme.primary
            : theme.colorScheme.primary.withValues(alpha: 0.3),
      ),
      title: Text(
        organization.name,
        style: AppTextStyles.body2.copyWith(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
      subtitle: organization.industry != null
          ? Text(
              organization.industry!,
              style: AppTextStyles.caption2.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            )
          : null,
      trailing: isSelected
          ? Icon(Icons.check_circle, color: theme.colorScheme.primary)
          : null,
      onTap: onTap,
    );
  }
}
