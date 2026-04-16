import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';

const _allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
const _maxFileSizeBytes = 10 * 1024 * 1024; // 10MB

class ScreeningSubmitSheet extends ConsumerStatefulWidget {
  const ScreeningSubmitSheet({
    super.key,
    required this.stepId,
    required this.applicationId,
    required this.docLabel,
  });

  final String stepId;
  final String applicationId;
  final String docLabel;

  static Future<bool?> show(
    BuildContext context, {
    required String stepId,
    required String applicationId,
    required String docLabel,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ScreeningSubmitSheet(
        stepId: stepId,
        applicationId: applicationId,
        docLabel: docLabel,
      ),
    );
  }

  @override
  ConsumerState<ScreeningSubmitSheet> createState() =>
      _ScreeningSubmitSheetState();
}

class _ScreeningSubmitSheetState extends ConsumerState<ScreeningSubmitSheet> {
  PlatformFile? _selectedFile;
  bool _uploading = false;
  String? _error;

  Future<void> _pickFile() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: _allowedExtensions,
      withData: false,
      withReadStream: false,
    );
    if (result == null || result.files.isEmpty) return;

    final file = result.files.first;
    if (file.path == null) return;

    if (file.size > _maxFileSizeBytes) {
      setState(() => _error = 'ファイルサイズは10MB以下にしてください');
      return;
    }

    setState(() {
      _selectedFile = file;
      _error = null;
    });
  }

  Future<void> _submit() async {
    if (_selectedFile == null || _selectedFile!.path == null) return;

    final user = ref.read(appUserProvider);
    if (user == null) return;

    setState(() {
      _uploading = true;
      _error = null;
    });

    try {
      final repo = ref.read(applicationsRepositoryProvider);
      await repo.uploadScreeningDocument(
        stepId: widget.stepId,
        applicationId: widget.applicationId,
        userId: user.id,
        filePath: _selectedFile!.path!,
        fileName: _selectedFile!.name,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _error = 'アップロードに失敗しました';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.textTertiary(context),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('${widget.docLabel}の提出', style: AppTextStyles.title3),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'ファイルを選択してアップロードしてください。\n対応形式: PDF, Word, 画像（10MB以下）',
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              // ファイル選択エリア
              GestureDetector(
                onTap: _uploading ? null : _pickFile,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: _error != null
                          ? AppColors.error
                          : AppColors.textTertiary(context),
                      style: _selectedFile == null
                          ? BorderStyle.solid
                          : BorderStyle.solid,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    color: _selectedFile != null
                        ? AppColors.brandLight.withValues(alpha: 0.1)
                        : null,
                  ),
                  child: _selectedFile == null
                      ? Column(
                          children: [
                            Icon(
                              Icons.upload_file_rounded,
                              size: 40,
                              color: AppColors.textTertiary(context),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'タップしてファイルを選択',
                              style: AppTextStyles.body2.copyWith(
                                color: AppColors.textSecondary(context),
                              ),
                            ),
                          ],
                        )
                      : Row(
                          children: [
                            Icon(
                              Icons.description_rounded,
                              color: AppColors.brand,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _selectedFile!.name,
                                    style: AppTextStyles.body2,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    _formatFileSize(_selectedFile!.size),
                                    style: AppTextStyles.caption1.copyWith(
                                      color: AppColors.textSecondary(context),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: _uploading
                                  ? null
                                  : () => setState(() => _selectedFile = null),
                              icon: Icon(
                                Icons.close,
                                size: 20,
                                color: AppColors.textSecondary(context),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  _error!,
                  style: AppTextStyles.caption1.copyWith(
                    color: AppColors.error,
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                child: CommonButton(
                  onPressed: _submit,
                  loading: _uploading,
                  enabled: _selectedFile != null && !_uploading,
                  child: const Text('提出する'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
