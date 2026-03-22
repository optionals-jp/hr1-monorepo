import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../domain/entities/organization.dart';
import '../controllers/organization_select_controller.dart';
import '../providers/auth_providers.dart';
import '../providers/organization_context_provider.dart';

/// 企業選択画面
class OrganizationSelectScreen extends HookConsumerWidget {
  const OrganizationSelectScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedIds = useState(<String>{});
    final searchController = useTextEditingController();

    final orgsAsync = ref.watch(allOrganizationsProvider);
    final controllerState = ref.watch(organizationSelectControllerProvider);

    Future<void> submit() async {
      await ref
          .read(organizationSelectControllerProvider.notifier)
          .submit(selectedIds.value);

      final state = ref.read(organizationSelectControllerProvider);
      if (!context.mounted) return;
      if (state.submitted) {
        CommonSnackBar.show(context, '企業に登録しました');
        context.go(AppRoutes.companyHome);
      } else if (state.error != null) {
        CommonSnackBar.error(context, '登録に失敗しました: ${state.error}');
      }
    }

    bool canSubmit() =>
        selectedIds.value.isNotEmpty &&
        ref.read(allOrganizationsProvider).hasValue;

    return CommonScaffold(
      appBar: AppBar(title: const Text('おすすめ企業')),
      body: orgsAsync.when(
        data: (orgs) => _Body(
          orgs: orgs,
          selectedIds: selectedIds.value,
          searchController: searchController,
          onToggle: (id) {
            final updated = Set<String>.from(selectedIds.value);
            if (updated.contains(id)) {
              updated.remove(id);
            } else {
              updated.add(id);
            }
            selectedIds.value = updated;
          },
          onSearchChanged: () {
            // Force rebuild by setting value to a new Set
            selectedIds.value = Set<String>.from(selectedIds.value);
          },
        ),
        loading: () => const LoadingIndicator(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(allOrganizationsProvider)),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
            AppSpacing.screenHorizontal,
            AppSpacing.md,
          ),
          child: CommonButton(
            onPressed: canSubmit() ? submit : null,
            loading: controllerState.isSubmitting,
            enabled: canSubmit() && !controllerState.isSubmitting,
            child: const Text('次へ'),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

class _Body extends ConsumerWidget {
  const _Body({
    required this.orgs,
    required this.selectedIds,
    required this.searchController,
    required this.onToggle,
    required this.onSearchChanged,
  });

  final List<Organization> orgs;
  final Set<String> selectedIds;
  final TextEditingController searchController;
  final ValueChanged<String> onToggle;
  final VoidCallback onSearchChanged;

  List<Organization> _filter(List<Organization> orgs) {
    final q = searchController.text.trim().toLowerCase();
    if (q.isEmpty) return orgs;
    return orgs.where((o) {
      return o.name.toLowerCase().contains(q) ||
          (o.industry?.toLowerCase().contains(q) ?? false) ||
          (o.location?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(appUserProvider);
    final joinedIds =
        user?.organizations.map((o) => o.id).toSet() ?? <String>{};
    final available = orgs.where((o) => !joinedIds.contains(o.id)).toList();

    if (available.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.business_outlined,
              size: 48,
              color: AppColors.textTertiaryOf(theme.brightness),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'すべての企業に登録済みです',
              style: AppTextStyles.body2.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            CommonButton.outline(
              onPressed: () => context.go(AppRoutes.companyHome),
              child: const Text('ホームへ'),
            ),
          ],
        ),
      );
    }

    final filtered = _filter(available);

    return Column(
      children: [
        // 検索バー
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
          ),
          child: SearchBox(
            controller: searchController,
            hintText: '企業名・業種で検索',
            onChanged: (_) => onSearchChanged(),
            onClear: onSearchChanged,
          ),
        ),

        // 企業リスト
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => Divider(
              height: 1,
              color: theme.dividerColor.withValues(alpha: 0.5),
            ),
            itemBuilder: (context, index) {
              final org = filtered[index];
              final isSelected = selectedIds.contains(org.id);
              return _OrganizationRow(
                organization: org,
                isSelected: isSelected,
                onToggle: () => onToggle(org.id),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// 企業行
// ---------------------------------------------------------------------------

class _OrganizationRow extends StatelessWidget {
  const _OrganizationRow({
    required this.organization,
    required this.isSelected,
    required this.onToggle,
  });

  final Organization organization;
  final bool isSelected;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onToggle,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
        child: Row(
          children: [
            // アイコン（角丸四角）
            OrgIcon(
              initial: organization.name.substring(0, 1),
              size: 44,
              borderRadius: 10,
              color: _avatarColor(organization.id),
            ),
            const SizedBox(width: AppSpacing.md),

            // 企業名 + 業種
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    organization.name,
                    style: AppTextStyles.body2.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (organization.industry != null)
                    Text(
                      organization.industry!,
                      style: AppTextStyles.caption2.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),

            // チェックアイコン
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: isSelected
                  ? Icon(
                      Icons.check_circle,
                      key: const ValueKey('checked'),
                      color: AppColors.primaryLight,
                    )
                  : Icon(
                      Icons.circle_outlined,
                      key: const ValueKey('unchecked'),
                      color: theme.dividerColor,
                    ),
            ),
          ],
        ),
      ),
    );
  }

  static Color _avatarColor(String id) {
    const colors = [
      Color(0xFF6366F1),
      Color(0xFFEC4899),
      Color(0xFF14B8A6),
      Color(0xFFF59E0B),
      Color(0xFF8B5CF6),
      Color(0xFF06B6D4),
      Color(0xFFEF4444),
      Color(0xFF22C55E),
    ];
    return colors[id.hashCode.abs() % colors.length];
  }
}
