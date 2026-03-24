import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/skills/domain/entities/certification_master.dart';
import 'package:hr1_employee_app/features/skills/domain/entities/employee_certification.dart';
import 'package:hr1_employee_app/features/skills/presentation/controllers/skills_controller.dart';
import 'package:hr1_employee_app/features/skills/presentation/providers/skills_providers.dart';

/// 資格・認定 編集画面
class CertificationsEditScreen extends ConsumerWidget {
  const CertificationsEditScreen({super.key});

  Future<void> _addCertification(
    BuildContext context,
    WidgetRef ref,
    String name,
  ) async {
    if (name.isEmpty) return;

    // マスタから has_score を判定
    final masters = ref.read(certificationMastersProvider).valueOrNull ?? [];
    final master = masters.cast<CertificationMaster?>().firstWhere(
      (m) => m!.name == name,
      orElse: () => null,
    );
    final hasScore = master?.hasScore ?? false;

    // スコアが必要な資格はダイアログで入力
    int? score;
    if (hasScore) {
      score = await _showScoreDialog(context, name);
      if (score == null) return;
    }

    // 取得年月を選択
    if (!context.mounted) return;
    final acquiredDate = await _pickAcquiredDate(context);

    ref.read(certificationIsAddingProvider.notifier).state = true;
    try {
      await ref
          .read(certificationsControllerProvider.notifier)
          .addCertification(name, acquiredDate, score: score);
    } catch (e) {
      if (context.mounted) CommonSnackBar.error(context, 'エラー: $e');
    } finally {
      ref.read(certificationIsAddingProvider.notifier).state = false;
    }
  }

  Future<int?> _showScoreDialog(BuildContext context, String certName) async {
    final scoreText = await CommonDialog.input(
      context: context,
      title: '$certName のスコア',
      hintText: '例: 850',
      suffixText: '点',
      keyboardType: TextInputType.number,
      confirmLabel: '保存',
    );
    if (scoreText == null || scoreText.isEmpty) return null;
    return int.tryParse(scoreText);
  }

  Future<DateTime?> _pickAcquiredDate(BuildContext context) async {
    return showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(1970),
      lastDate: DateTime.now(),
      helpText: '取得年月を選択（任意）',
      cancelText: 'スキップ',
      confirmText: '選択',
    );
  }

  Future<void> _deleteCertification(
    BuildContext context,
    WidgetRef ref,
    EmployeeCertification cert,
  ) async {
    final confirmed = await CommonDialog.confirm(
      context: context,
      title: '資格の削除',
      message: '「${cert.name}」を削除しますか？',
      confirmLabel: '削除',
      isDestructive: true,
    );
    if (!confirmed) return;

    try {
      await ref
          .read(certificationsControllerProvider.notifier)
          .deleteCertification(cert.id);
    } catch (e) {
      if (context.mounted) CommonSnackBar.error(context, 'エラー: $e');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final certsAsync = ref.watch(certificationsControllerProvider);
    final mastersAsync = ref.watch(certificationMastersProvider);
    final isAdding = ref.watch(certificationIsAddingProvider);
    final masterNames =
        mastersAsync.valueOrNull?.map((m) => m.name).toList() ?? [];

    return CommonScaffold(
      appBar: AppBar(title: const Text('資格・認定')),
      body: Column(
        children: [
          MasterSearchBar(
            masterNames: masterNames,
            onAdd: (name) => _addCertification(context, ref, name),
            hintText: '資格を検索・追加',
            isAdding: isAdding,
          ),
          Expanded(
            child: certsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => const ErrorState(),
              data: (certs) {
                if (certs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AppIcons.award(
                          size: 48,
                          color: AppColors.textTertiary(context),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '資格が登録されていません',
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.textSecondary(context),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenHorizontal,
                  ),
                  itemCount: certs.length,
                  itemBuilder: (context, index) {
                    final cert = certs[index];
                    return _CertTile(
                      certification: cert,
                      onDelete: () => _deleteCertification(context, ref, cert),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CertTile extends StatelessWidget {
  const _CertTile({required this.certification, required this.onDelete});

  final EmployeeCertification certification;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        borderRadius: BorderRadius.circular(12),
        border: AppColors.isDark(context)
            ? Border.all(color: AppColors.border(context), width: 0.5)
            : null,
        boxShadow: AppShadows.of4(context),
      ),
      child: Row(
        children: [
          AppIcons.award(
            size: 20,
            color: AppColors.brand.withValues(alpha: 0.7),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  certification.score != null
                      ? '${certification.name} ${certification.score}点'
                      : certification.name,
                  style: AppTextStyles.caption1,
                ),
                if (certification.acquiredDate != null)
                  Text(
                    DateFormat('yyyy/MM').format(certification.acquiredDate!),
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
              ],
            ),
          ),
          GestureDetector(
            onTap: onDelete,
            child: Icon(
              Icons.close_rounded,
              size: 18,
              color: AppColors.textTertiary(context),
            ),
          ),
        ],
      ),
    );
  }
}
