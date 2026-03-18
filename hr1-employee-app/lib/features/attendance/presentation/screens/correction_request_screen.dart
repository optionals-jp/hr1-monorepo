import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../domain/entities/attendance_record.dart';
import '../controllers/attendance_controller.dart';
import '../../../../shared/widgets/common_button.dart';
import '../../../../shared/widgets/common_snackbar.dart';
import '../../../../shared/widgets/loading_indicator.dart';
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
  /// 打刻IDごとの修正後時刻を保持
  final Map<String, TimeOfDay> _correctedTimes = {};
  final _reasonController = TextEditingController();

  /// 打刻の時刻を取得（修正後があればそちら、なければ元の時刻）
  DateTime _resolvedPunchTime(AttendancePunch punch) {
    final corrected = _correctedTimes[punch.id];
    if (corrected != null) {
      final local = punch.punchedAt.toLocal();
      return DateTime(
        local.year,
        local.month,
        local.day,
        corrected.hour,
        corrected.minute,
      );
    }
    return punch.punchedAt.toLocal();
  }

  /// 打刻リストから勤務/休憩/残業（分）を計算
  ({int work, int breakMin, int overtime}) _calcDurations(
    List<AttendancePunch> punches,
    AttendanceSettings settings,
  ) {
    DateTime? clockIn;
    DateTime? clockOut;
    int breakMinutes = 0;

    // clock_in / clock_out を取得
    for (final p in punches) {
      final t = _resolvedPunchTime(p);
      if (p.punchType == PunchType.clockIn) clockIn = t;
      if (p.punchType == PunchType.clockOut) clockOut = t;
    }

    // 休憩時間を計算（break_start〜break_end のペア）
    DateTime? breakStart;
    for (final p in punches) {
      final t = _resolvedPunchTime(p);
      if (p.punchType == PunchType.breakStart) {
        breakStart = t;
      } else if (p.punchType == PunchType.breakEnd && breakStart != null) {
        breakMinutes += t.difference(breakStart).inMinutes;
        breakStart = null;
      }
    }

    if (clockIn == null || clockOut == null) {
      return (work: 0, breakMin: breakMinutes, overtime: 0);
    }

    final totalMinutes = clockOut.difference(clockIn).inMinutes;
    final workMinutes = totalMinutes - breakMinutes;

    // 残業計算
    final startParts = settings.workStartTime.split(':');
    final endParts = settings.workEndTime.split(':');
    final workStart = DateTime(
      clockIn.year,
      clockIn.month,
      clockIn.day,
      int.parse(startParts[0]),
      int.parse(startParts[1]),
    );
    final workEnd = DateTime(
      clockIn.year,
      clockIn.month,
      clockIn.day,
      int.parse(endParts[0]),
      int.parse(endParts[1]),
    );
    final scheduledMinutes = workEnd.difference(workStart).inMinutes;
    final overtime = workMinutes - scheduledMinutes;

    return (
      work: workMinutes > 0 ? workMinutes : 0,
      breakMin: breakMinutes,
      overtime: overtime > 0 ? overtime : 0,
    );
  }

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

  /// 修正された打刻の DateTime を構築（元の日付 + 新しい時刻）
  DateTime _buildCorrectedDateTime(AttendancePunch punch) {
    final time = _correctedTimes[punch.id]!;
    final local = punch.punchedAt.toLocal();
    return DateTime(local.year, local.month, local.day, time.hour, time.minute);
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

    // 打刻単位の修正データを構築
    final punchCorrections = <Map<String, dynamic>>[];
    String? requestedClockIn;
    String? requestedClockOut;

    for (final punch in punches) {
      if (!_correctedTimes.containsKey(punch.id)) continue;

      final correctedDt = _buildCorrectedDateTime(punch);
      punchCorrections.add({
        'punch_id': punch.id,
        'punch_type': punch.punchType,
        'original_punched_at': punch.punchedAt.toUtc().toIso8601String(),
        'requested_punched_at': correctedDt.toUtc().toIso8601String(),
      });

      // clock_in / clock_out はレコードレベルにも反映
      if (punch.punchType == PunchType.clockIn) {
        requestedClockIn = correctedDt.toUtc().toIso8601String();
      } else if (punch.punchType == PunchType.clockOut) {
        requestedClockOut = correctedDt.toUtc().toIso8601String();
      }
    }

    // 修正なしの clock_in/out は元の値をそのまま使用
    final resolvedClockIn =
        requestedClockIn ?? record.clockIn?.toIso8601String();
    final resolvedClockOut =
        requestedClockOut ?? record.clockOut?.toIso8601String();

    try {
      await ref
          .read(correctionControllerProvider.notifier)
          .requestCorrection(
            recordId: record.id,
            originalClockIn: record.clockIn?.toIso8601String(),
            originalClockOut: record.clockOut?.toIso8601String(),
            requestedClockIn: resolvedClockIn ?? '',
            requestedClockOut: resolvedClockOut ?? '',
            punchCorrections: punchCorrections,
            reason: _reasonController.text.trim(),
          );

      CommonSnackBar.show(context, '修正依頼を送信しました');
      if (mounted) {
        context.pop();
      }
    } catch (e) {
      CommonSnackBar.error(context, 'エラーが発生しました: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayRecord = ref.watch(todayRecordProvider);
    final todayPunches = ref.watch(todayPunchesProvider);
    final isSubmitting = ref.watch(correctionControllerProvider);
    final theme = Theme.of(context);

    return Scaffold(
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
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '修正が必要な打刻の「変更」ボタンを押してください',
                  style: AppTextStyles.caption2.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
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
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
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
    final durations = _calcDurations(punches, settings);
    final isDark = theme.brightness == Brightness.dark;

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
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            border: Border.all(
              color: isDark
                  ? theme.colorScheme.outline.withValues(alpha: 0.35)
                  : theme.colorScheme.outlineVariant,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.06),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
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
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text('今日の打刻記録がありません', style: AppTextStyles.headline),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '出勤打刻後に修正依頼を送信できます',
              style: AppTextStyles.caption1.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
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

/// 打刻修正行
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
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.4,
                          ),
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Icon(
                          Icons.arrow_forward_rounded,
                          size: 14,
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.4,
                          ),
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

/// 時間サマリーアイテム
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
              color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
            ),
          ),
        ],
      ),
    );
  }
}
