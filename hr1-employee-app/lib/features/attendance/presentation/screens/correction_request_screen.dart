import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../domain/entities/attendance_record.dart';
import '../providers/attendance_providers.dart';

/// 勤怠修正依頼画面
class CorrectionRequestScreen extends ConsumerStatefulWidget {
  const CorrectionRequestScreen({super.key});

  @override
  ConsumerState<CorrectionRequestScreen> createState() =>
      _CorrectionRequestScreenState();
}

class _CorrectionRequestScreenState
    extends ConsumerState<CorrectionRequestScreen> {
  TimeOfDay? _requestedClockIn;
  TimeOfDay? _requestedClockOut;
  final _reasonController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickTime(bool isClockIn) async {
    final now = TimeOfDay.now();
    final picked = await showTimePicker(
      context: context,
      initialTime: isClockIn
          ? (_requestedClockIn ?? now)
          : (_requestedClockOut ?? now),
    );
    if (picked != null) {
      setState(() {
        if (isClockIn) {
          _requestedClockIn = picked;
        } else {
          _requestedClockOut = picked;
        }
      });
    }
  }

  String _formatTimeOfDay(TimeOfDay? t) {
    if (t == null) return '変更なし';
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }

  DateTime? _timeOfDayToDateTime(TimeOfDay? t) {
    if (t == null) return null;
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day, t.hour, t.minute);
  }

  Future<void> _submit(AttendanceRecord record) async {
    if (_requestedClockIn == null && _requestedClockOut == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('出勤時刻または退勤時刻を変更してください'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    if (_reasonController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('修正理由を入力してください'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(attendanceRepositoryProvider);
      await repo.requestCorrection(
        recordId: record.id,
        originalClockIn: record.clockIn?.toIso8601String(),
        originalClockOut: record.clockOut?.toIso8601String(),
        requestedClockIn:
            _timeOfDayToDateTime(_requestedClockIn)?.toIso8601String() ??
                record.clockIn?.toIso8601String(),
        requestedClockOut:
            _timeOfDayToDateTime(_requestedClockOut)?.toIso8601String() ??
                record.clockOut?.toIso8601String(),
        reason: _reasonController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('修正依頼を送信しました'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('エラーが発生しました: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayRecord = ref.watch(todayRecordProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('勤怠修正依頼'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(0.5),
          child: Container(
              height: 0.5, color: theme.colorScheme.outlineVariant),
        ),
      ),
      body: todayRecord.when(
        data: (record) {
          if (record == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: theme.scaffoldBackgroundColor,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.info_outline_rounded,
                        size: 28,
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.6),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      '今日の勤怠記録がありません',
                      style: AppTextStyles.subtitle,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      '出勤打刻後に修正依頼を送信できます',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: AppSpacing.sm),

                // 現在の記録
                Text(
                  '現在の記録',
                  style: AppTextStyles.label.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: _InfoTile(
                        label: '出勤時刻',
                        value: record.clockIn != null
                            ? DateFormat('HH:mm')
                                .format(record.clockIn!.toLocal())
                            : '-',
                        icon: Icons.login_rounded,
                        color: AppColors.success,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: _InfoTile(
                        label: '退勤時刻',
                        value: record.clockOut != null
                            ? DateFormat('HH:mm')
                                .format(record.clockOut!.toLocal())
                            : '-',
                        icon: Icons.logout_rounded,
                        color: AppColors.error,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xxl),

                // 修正内容
                Text(
                  '修正内容',
                  style: AppTextStyles.label.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                _buildCard(
                  theme,
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      _CorrectionRow(
                        icon: Icons.login_rounded,
                        iconColor: AppColors.success,
                        title: '出勤時刻',
                        value: _requestedClockIn != null
                            ? _formatTimeOfDay(_requestedClockIn)
                            : '変更なし',
                        isChanged: _requestedClockIn != null,
                        onEdit: () => _pickTime(true),
                        onClear: _requestedClockIn != null
                            ? () => setState(() => _requestedClockIn = null)
                            : null,
                      ),
                      Divider(
                          height: 0.5,
                          color: theme.colorScheme.outlineVariant),
                      _CorrectionRow(
                        icon: Icons.logout_rounded,
                        iconColor: AppColors.error,
                        title: '退勤時刻',
                        value: _requestedClockOut != null
                            ? _formatTimeOfDay(_requestedClockOut)
                            : '変更なし',
                        isChanged: _requestedClockOut != null,
                        onEdit: () => _pickTime(false),
                        onClear: _requestedClockOut != null
                            ? () => setState(() => _requestedClockOut = null)
                            : null,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // 修正理由
                Text(
                  '修正理由',
                  style: AppTextStyles.label.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _reasonController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: '修正が必要な理由を入力してください',
                    border: OutlineInputBorder(
                      borderRadius:
                          BorderRadius.circular(AppSpacing.inputRadius),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // 送信ボタン
                ElevatedButton(
                  onPressed: _isSubmitting ? null : () => _submit(record),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('修正依頼を送信'),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  '承認者が修正を承認すると、勤怠記録が更新されます。',
                  style: AppTextStyles.caption.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('エラー: $e')),
      ),
    );
  }

  Widget _buildCard(ThemeData theme,
      {required Widget child, EdgeInsets? padding}) {
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: isDark
            ? Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.3),
                width: 0.5,
              )
            : null,
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: child,
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: isDark
            ? Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.3),
                width: 0.5,
              )
            : null,
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(value, style: AppTextStyles.heading3),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTextStyles.caption.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}

class _CorrectionRow extends StatelessWidget {
  const _CorrectionRow({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.value,
    required this.isChanged,
    required this.onEdit,
    this.onClear,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String value;
  final bool isChanged;
  final VoidCallback onEdit;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 16),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTextStyles.bodySmall),
                Text(
                  value,
                  style: isChanged
                      ? AppTextStyles.subtitle
                          .copyWith(color: AppColors.brandPrimary)
                      : AppTextStyles.bodySmall.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.45),
                        ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: onEdit,
            child: const Text('変更'),
          ),
          if (onClear != null)
            IconButton(
              icon: const Icon(Icons.close_rounded, size: 16),
              onPressed: onClear,
              visualDensity: VisualDensity.compact,
            ),
        ],
      ),
    );
  }
}
