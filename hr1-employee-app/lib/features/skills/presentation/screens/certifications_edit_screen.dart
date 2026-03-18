import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/common_dialog.dart';
import '../../../../shared/widgets/master_search_bar.dart';
import '../../domain/entities/certification_master.dart';
import '../../domain/entities/employee_certification.dart';
import '../controllers/skills_controller.dart';
import '../../../../shared/widgets/common_snackbar.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../providers/skills_providers.dart';

/// 資格・認定 編集画面
class CertificationsEditScreen extends ConsumerStatefulWidget {
  const CertificationsEditScreen({super.key});

  @override
  ConsumerState<CertificationsEditScreen> createState() =>
      _CertificationsEditScreenState();
}

class _CertificationsEditScreenState
    extends ConsumerState<CertificationsEditScreen> {
  bool _isAdding = false;

  Future<void> _addCertification(String name) async {
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
      score = await _showScoreDialog(name);
      // ダイアログがキャンセルされた場合は追加しない
      if (score == null && mounted) return;
    }

    // 取得年月を選択
    final acquiredDate = await _pickAcquiredDate();

    setState(() => _isAdding = true);
    try {
      await ref
          .read(certificationsControllerProvider.notifier)
          .addCertification(name, acquiredDate, score: score);
    } catch (e) {
      CommonSnackBar.error(context, 'エラー: $e');
    } finally {
      if (mounted) setState(() => _isAdding = false);
    }
  }

  Future<int?> _showScoreDialog(String certName) async {
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

  Future<DateTime?> _pickAcquiredDate() async {
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

  Future<void> _deleteCertification(EmployeeCertification cert) async {
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
      CommonSnackBar.error(context, 'エラー: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final certsAsync = ref.watch(certificationsControllerProvider);
    final mastersAsync = ref.watch(certificationMastersProvider);
    final theme = Theme.of(context);

    final masterNames =
        mastersAsync.valueOrNull?.map((m) => m.name).toList() ?? [];

    return Scaffold(
      appBar: AppBar(title: const Text('資格・認定')),
      body: Column(
        children: [
          MasterSearchBar(
            masterNames: masterNames,
            onAdd: _addCertification,
            hintText: '資格を検索・追加',
            isAdding: _isAdding,
          ),
          Expanded(
            child: certsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => Center(child: Text('エラー: $e')),
              data: (certs) {
                if (certs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AppIcons.award(
                          size: 48,
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.25,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          '資格が登録されていません',
                          style: AppTextStyles.caption1.copyWith(
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.45,
                            ),
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
                      onDelete: () => _deleteCertification(cert),
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
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: theme.brightness == Brightness.dark
            ? Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.2),
                width: 0.5,
              )
            : null,
        boxShadow: theme.brightness == Brightness.dark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 3,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: Row(
        children: [
          AppIcons.award(
            size: 20,
            color: AppColors.brandPrimary.withValues(alpha: 0.7),
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
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.55,
                      ),
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
              color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
            ),
          ),
        ],
      ),
    );
  }
}
