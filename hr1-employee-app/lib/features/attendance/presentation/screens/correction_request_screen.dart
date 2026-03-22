import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/attendance/presentation/controllers/attendance_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';

class CorrectionRequestScreen extends ConsumerStatefulWidget {
  const CorrectionRequestScreen({super.key});

  @override
  ConsumerState<CorrectionRequestScreen> createState() =>
      _CorrectionRequestScreenState();
}

class _CorrectionRequestScreenState
    extends ConsumerState<CorrectionRequestScreen> {
  final Map<String, TimeOfDay> _correctedTimes = {};
  final _reasonController = TextEditingController();

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickTime(AttendancePunch punch) async {
    final current =
        _correctedTimes[punch.id] ??
        TimeOfDay.fromDateTime(punch.punchedAt.toLocal());
    final picked = await showTimePicker(context: context, initialTime: current);
    if (picked != null) {
      setState(() => _correctedTimes[punch.id] = picked);
    }
  }

  void _clearCorrection(String punchId) {
    setState(() => _correctedTimes.remove(punchId));
  }

  Future<void> _submit(
    AttendanceRecord record,
    List<AttendancePunch> punches,
  ) async {
    if (_correctedTimes.isEmpty) {
      CommonSnackBar.error(context, '修正する打刻時刻を選択してください');
      return;
    }
    if (_reasonController.text.trim().isEmpty) {
      CommonSnackBar.error(context, '修正理由を入力してください');
      return;
    }

    try {
      await ref
          .read(correctionControllerProvider.notifier)
          .submitCorrection(
            record: record,
            punches: punches,
            correctedTimes: Map.of(_correctedTimes),
            reason: _reasonController.text.trim(),
          );

      if (!mounted) return;
      CommonSnackBar.show(context, '修正依頼を送信しました');
      context.pop();
    } catch (e) {
      if (!mounted) return;
      CommonSnackBar.error(context, 'エラーが発生しました: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayRecord = ref.watch(todayRecordProvider);
    final todayPunches = ref.watch(todayPunchesProvider);
    final isSubmitting = ref.watch(correctionControllerProvider);
    final theme = Theme.of(context);

    return CommonScaffold(
      appBar: AppBar(
        title: const Text('勤怠修正依頼'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(0.5),
          child: Container(
            height: 0.5,
            color: theme.colorScheme.outlineVariant,
          ),
        ),
      ),
      body: todayRecord.when(
        data: (record) {
          if (record == null) {
            return _buildEmptyState(theme);
          }

          final punches = todayPunches.valueOrNull ?? [];
          if (punches.isEmpty) {
            return _buildEmptyState(theme);
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: AppSpacing.sm),

                // 時間サマリー
                _buildDurationSummary(theme, punches),
                const SizedBox(height: AppSpacing.xxl),

                // 打刻履歴と修正
                Text(
                  '打刻時刻の修正',
                  style: AppTextStyles.caption1.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary(theme.brightness),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '修正が必要な打刻の「変更」ボタンを押してください',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                _buildCard(
                  theme,
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (var i = 0; i < punches.length; i++) ...[
                        if (i > 0)
                          Divider(
                            height: 0.5,
                            color: theme.colorScheme.outlineVariant,
                          ),
                        _PunchCorrectionRow(
                          punch: punches[i],
                          correctedTime: _correctedTimes[punches[i].id],
                          onEdit: () => _pickTime(punches[i]),
                          onClear: _correctedTimes.containsKey(punches[i].id)
                              ? () => _clearCorrection(punches[i].id)
                              : null,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // 修正理由
                Text(
                  '修正理由',
                  style: AppTextStyles.caption1.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary(theme.brightness),
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
                      borderRadius: BorderRadius.circular(
                        AppSpacing.inputRadius,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),

                // 送信ボタン
                CommonButton(
                  onPressed: () => _submit(record, punches),
                  loading: isSubmitting,
                  child: const Text('修正依頼を送信'),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  '承認者が修正を承認すると、勤怠記録が更新されます。',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          );
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => Center(child: Text('エラー: $e')),
      ),
    );
  }

  Widget _buildDurationSummary(ThemeData theme, List<AttendancePunch> punches) {
    final settings =
        ref.watch(attendanceSettingsProvider).valueOrNull ??
        const AttendanceSettings();
    final durations = ref
        .read(correctionControllerProvider.notifier)
        .calcDurations(
          punches: punches,
          settings: settings,
          correctedTimes: _correctedTimes,
        );
    String fmtMin(int m) {
      if (m <= 0) return '-';
      return '${m ~/ 60}:${(m % 60).toString().padLeft(2, '0')}';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '時間サマリー${_correctedTimes.isNotEmpty ? '（修正後）' : ''}',
          style: AppTextStyles.caption1.copyWith(
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary(theme.brightness),
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            border: Border.all(color: AppColors.border(theme.brightness)),
            boxShadow: AppShadows.shadow4,
          ),
          child: Row(
            children: [
              _SummaryItem(
                label: '勤務',
                value: fmtMin(durations.work),
                iconBuilder: AppIcons.briefcase,
                iconColor: AppColors.success,
              ),
              Container(
                width: 0.5,
                height: 28,
                color: theme.colorScheme.outlineVariant,
              ),
              _SummaryItem(
                label: '休憩',
                value: fmtMin(durations.breakMin),
                iconBuilder: AppIcons.coffee,
                iconColor: AppColors.warning,
              ),
              Container(
                width: 0.5,
                height: 28,
                color: theme.colorScheme.outlineVariant,
              ),
              _SummaryItem(
                label: '残業',
                value: fmtMin(durations.overtime),
                iconBuilder: AppIcons.clock,
                iconColor: AppColors.error,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
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
                color: AppColors.textSecondary(theme.brightness),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text('今日の打刻記録がありません', style: AppTextStyles.headline),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '出勤打刻後に修正依頼を送信できます',
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(theme.brightness),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(
    ThemeData theme, {
    required Widget child,
    EdgeInsets? padding,
  }) {
    final brightness = theme.brightness;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(color: AppColors.border(brightness), width: 0.5),
        boxShadow: brightness == Brightness.dark ? null : AppShadows.shadow4,
      ),
      child: child,
    );
  }
}

class _PunchCorrectionRow extends StatelessWidget {
  const _PunchCorrectionRow({
    required this.punch,
    required this.correctedTime,
    required this.onEdit,
    this.onClear,
  });

  final AttendancePunch punch;
  final TimeOfDay? correctedTime;
  final VoidCallback onEdit;
  final VoidCallback? onClear;

  bool get isChanged => correctedTime != null;

  (Widget Function({double size, Color? color}), Color) get _iconInfo {
    return switch (punch.punchType) {
      PunchType.clockIn => (AppIcons.login, AppColors.success),
      PunchType.clockOut => (AppIcons.logout, AppColors.error),
      PunchType.breakStart => (AppIcons.coffee, AppColors.warning),
      PunchType.breakEnd => (AppIcons.pause, AppColors.brandLight),
      _ => (AppIcons.clock, AppColors.brandPrimary),
    };
  }

  String get _correctedTimeText {
    if (correctedTime == null) return '';
    return '${correctedTime!.hour.toString().padLeft(2, '0')}:${correctedTime!.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final originalTime = DateFormat('HH:mm').format(punch.punchedAt.toLocal());
    final label = PunchType.label(punch.punchType);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          Builder(
            builder: (_) {
              final (iconBuilder, iconColor) = _iconInfo;
              return Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: iconColor.withValues(alpha: 0.25),
                    width: 1,
                  ),
                ),
                child: Center(child: iconBuilder(size: 16, color: iconColor)),
              );
            },
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AppTextStyles.caption1),
                if (isChanged)
                  Row(
                    children: [
                      Text(
                        originalTime,
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Icon(
                          Icons.arrow_forward_rounded,
                          size: 14,
                          color: AppColors.textSecondary(theme.brightness),
                        ),
                      ),
                      Text(
                        _correctedTimeText,
                        style: AppTextStyles.headline.copyWith(
                          color: AppColors.brandPrimary,
                        ),
                      ),
                    ],
                  )
                else
                  Text(originalTime, style: AppTextStyles.headline),
              ],
            ),
          ),
          TextButton(onPressed: onEdit, child: const Text('変更')),
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

class _SummaryItem extends StatelessWidget {
  const _SummaryItem({
    required this.label,
    required this.value,
    required this.iconBuilder,
    required this.iconColor,
  });

  final String label;
  final String value;
  final Widget Function({double size, Color? color}) iconBuilder;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Column(
        children: [
          iconBuilder(size: 18, color: iconColor),
          const SizedBox(height: 6),
          Text(value, style: AppTextStyles.headline),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTextStyles.caption1.copyWith(
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary(theme.brightness),
            ),
          ),
        ],
      ),
    );
  }
}
