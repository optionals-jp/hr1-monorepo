import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../auth/presentation/providers/organization_context_provider.dart';

/// 応募状況一覧画面（応募者専用）
/// 現在選択中の企業への応募ステータスを表示する
class ApplicationsScreen extends ConsumerWidget {
  const ApplicationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentOrg = ref.watch(currentOrganizationProvider);

    return Scaffold(
      body: currentOrg == null
          ? const Center(child: Text('企業が選択されていません'))
          : _ApplicationsList(organizationName: currentOrg.name),
    );
  }
}

/// 応募状況リスト（プレースホルダー）
class _ApplicationsList extends StatelessWidget {
  const _ApplicationsList({required this.organizationName});

  final String organizationName;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.assignment_outlined,
              size: 64,
              color: AppColors.textSecondary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text('応募状況', style: AppTextStyles.heading3),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '$organizationNameへの応募状況を確認できます',
              style: AppTextStyles.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
