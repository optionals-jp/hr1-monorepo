import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../domain/entities/employee_certification.dart';
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
  Future<void> _addCertification() async {
    final result = await _showAddDialog();
    if (result == null) return;

    try {
      await ref
          .read(skillsRepositoryProvider)
          .addCertification(result.name, result.acquiredDate);
      ref.invalidate(myCertificationsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('エラー: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _deleteCertification(EmployeeCertification cert) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('資格の削除'),
        content: Text('「${cert.name}」を削除しますか？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('削除', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref
          .read(skillsRepositoryProvider)
          .deleteCertification(cert.id);
      ref.invalidate(myCertificationsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('エラー: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<_CertInput?> _showAddDialog() async {
    final nameController = TextEditingController();
    DateTime? selectedDate;
    final theme = Theme.of(context);

    // マスタから資格名リストを取得
    final mastersAsync = ref.read(certificationMastersProvider);
    final masterNames = mastersAsync.valueOrNull?.map((m) => m.name).toList() ?? [];

    return showDialog<_CertInput>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('資格・認定を追加'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Autocomplete<String>(
                optionsBuilder: (textEditingValue) {
                  if (textEditingValue.text.isEmpty) return masterNames;
                  final query = textEditingValue.text.toLowerCase();
                  return masterNames
                      .where((name) => name.toLowerCase().contains(query));
                },
                fieldViewBuilder: (ctx2, controller, focusNode, onSubmitted) {
                  nameController.text = controller.text;
                  controller.addListener(() {
                    nameController.text = controller.text;
                  });
                  return TextField(
                    controller: controller,
                    focusNode: focusNode,
                    autofocus: true,
                    style: AppTextStyles.bodySmall,
                    decoration: InputDecoration(
                      hintText: '資格名を入力または選択',
                      hintStyle: AppTextStyles.bodySmall.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.4),
                      ),
                      filled: true,
                      fillColor: theme.brightness == Brightness.dark
                          ? theme.colorScheme.surfaceContainerHighest
                          : const Color(0xFFEFEFEF),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                    ),
                  );
                },
                optionsViewBuilder: (ctx2, onSelected, options) {
                  return Align(
                    alignment: Alignment.topLeft,
                    child: Material(
                      elevation: 4,
                      borderRadius: BorderRadius.circular(10),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 200),
                        child: ListView.builder(
                          padding: EdgeInsets.zero,
                          shrinkWrap: true,
                          itemCount: options.length,
                          itemBuilder: (ctx3, index) {
                            final option = options.elementAt(index);
                            return InkWell(
                              onTap: () => onSelected(option),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 10),
                                child: Text(option,
                                    style: AppTextStyles.bodySmall),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.md),
              GestureDetector(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: selectedDate ?? DateTime.now(),
                    firstDate: DateTime(1970),
                    lastDate: DateTime.now(),
                  );
                  if (picked != null) {
                    setDialogState(() => selectedDate = picked);
                  }
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: theme.brightness == Brightness.dark
                        ? theme.colorScheme.surfaceContainerHighest
                        : const Color(0xFFEFEFEF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.calendar_today_rounded,
                        size: 16,
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.5),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        selectedDate != null
                            ? DateFormat('yyyy/MM').format(selectedDate!)
                            : '取得年月（任意）',
                        style: AppTextStyles.bodySmall.copyWith(
                          color: selectedDate != null
                              ? theme.colorScheme.onSurface
                              : theme.colorScheme.onSurface
                                  .withValues(alpha: 0.4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('キャンセル'),
            ),
            TextButton(
              onPressed: () {
                final name = nameController.text.trim();
                if (name.isEmpty) return;
                Navigator.pop(
                    ctx, _CertInput(name: name, acquiredDate: selectedDate));
              },
              child: Text(
                '追加',
                style: TextStyle(
                  color: AppColors.brandPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final certsAsync = ref.watch(myCertificationsProvider);
    ref.watch(certificationMastersProvider); // マスタをプリフェッチ
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('資格・認定'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addCertification,
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: Colors.white,
        elevation: 2,
        child: const Icon(Icons.add_rounded),
      ),
      body: certsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('エラー: $e')),
        data: (certs) {
          if (certs.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.workspace_premium_outlined,
                    size: 48,
                    color: theme.colorScheme.onSurface
                        .withValues(alpha: 0.25),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    '資格が登録されていません',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.45),
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
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
    );
  }
}

class _CertInput {
  const _CertInput({required this.name, this.acquiredDate});
  final String name;
  final DateTime? acquiredDate;
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
                width: 0.5)
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
          Icon(
            Icons.workspace_premium_outlined,
            size: 20,
            color: AppColors.brandPrimary.withValues(alpha: 0.7),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(certification.name, style: AppTextStyles.bodySmall),
                if (certification.acquiredDate != null)
                  Text(
                    DateFormat('yyyy/MM').format(certification.acquiredDate!),
                    style: AppTextStyles.caption.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.55),
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
