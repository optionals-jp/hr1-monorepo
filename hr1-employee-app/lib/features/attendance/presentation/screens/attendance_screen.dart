import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/attendance/presentation/controllers/attendance_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';

/// 勤怠打刻画面 — Office モバイルスタイル
class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key});

  Future<void> _handlePunch(
    BuildContext context,
    WidgetRef ref,
    String action,
  ) async {
    await ref.read(attendanceControllerProvider.notifier).punch(action);
    final error = ref.read(attendanceControllerProvider).error;
    if (error != null && context.mounted) {
      CommonSnackBar.error(context, 'エラーが発生しました: $error');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final punchState = ref.watch(attendanceControllerProvider);
    final workState = ref.watch(workStateProvider);
    final todayRecord = ref.watch(todayRecordProvider);
    final todayPunches = ref.watch(todayPunchesProvider);

    return CommonScaffold(
      appBar: AppBar(
        title: const Text('勤怠'),
        actions: [
          TextButton(
            onPressed: () => context.push(AppRoutes.attendanceDetail),
            child: Text(
              '明細',
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.brand,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          TextButton(
            onPressed: () => context.push(AppRoutes.correction),
            child: Text(
              '修正依頼',
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.brand,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.read(attendanceControllerProvider.notifier).refresh();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: AppSpacing.md,
          ),
          children: [
            // 時刻 + ステータス（統合ヒーロー）
            _TimeStatusHero(
              workState: workState,
              record: todayRecord.valueOrNull,
            ),
            const SizedBox(height: AppSpacing.xl),

            // 打刻ボタン（2x2）
            _PunchButtons(
              workState: workState,
              isLoading: punchState.isLoading,
              onPunch: (action) => _handlePunch(context, ref, action),
            ),
            const SizedBox(height: AppSpacing.xxl),

            // 今日のサマリー
            todayRecord.when(
              data: (record) {
                if (record == null) return const SizedBox.shrink();
                return _SummaryRow(record: record);
              },
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),

            // 打刻履歴セクション
            Padding(
              padding: const EdgeInsets.only(
                top: AppSpacing.xl,
                bottom: AppSpacing.sm,
              ),
              child: Text(
                'タイムライン',
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(context),
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ),
            todayPunches.when(
              data: (punches) => punches.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.xxl,
                      ),
                      child: Center(
                        child: Text(
                          'まだ打刻がありません',
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.textSecondary(context),
                          ),
                        ),
                      ),
                    )
                  : Column(
                      children: [
                        for (var i = 0; i < punches.length; i++)
                          _TimelineItem(
                            punch: punches[i],
                            nextPunch: i < punches.length - 1
                                ? punches[i + 1]
                                : null,
                            isLast: i == punches.length - 1,
                          ),
                      ],
                    ),
              loading: () => const LoadingIndicator(),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Text('エラー: $e'),
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }
}

/// 時刻 + ステータス統合ヒーロー
class _TimeStatusHero extends StatelessWidget {
  const _TimeStatusHero({required this.workState, this.record});

  final WorkState workState;
  final AttendanceRecord? record;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final dateFormat = DateFormat('M月d日（E）', 'ja');
    final timeFormat = DateFormat('HH:mm');

    final (statusLabel, statusColor) = switch (workState) {
      WorkState.notStarted => ('未出勤', AppColors.textSecondary(context)),
      WorkState.working => ('勤務中', AppColors.success),
      WorkState.onBreak => ('休憩中', AppColors.warning),
      WorkState.finished => ('退勤済み', AppColors.brand),
    };

    return Column(
      children: [
        // 日付
        Text(
          dateFormat.format(now),
          style: AppTextStyles.caption1.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: 4),
        // 時刻（大きく表示）
        Text(
          timeFormat.format(now),
          style: AppTextStyles.display.copyWith(
            fontWeight: FontWeight.w200,
            color: AppColors.textPrimary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        // ステータスバッジ
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.12),
            borderRadius: AppRadius.radiusCircular,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                statusLabel,
                style: AppTextStyles.caption2.copyWith(
                  color: statusColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// 打刻ボタン群
class _PunchButtons extends StatelessWidget {
  const _PunchButtons({
    required this.workState,
    required this.isLoading,
    required this.onPunch,
  });

  final WorkState workState;
  final bool isLoading;
  final Future<void> Function(String) onPunch;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _PunchButton(
                label: '出勤',
                iconBuilder: AppIcons.login,
                color: AppColors.success,
                enabled: !isLoading && workState == WorkState.notStarted,
                onPressed: () => onPunch('clock_in'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _PunchButton(
                label: '退勤',
                iconBuilder: AppIcons.logout,
                color: AppColors.error,
                enabled: !isLoading && workState == WorkState.working,
                onPressed: () => onPunch('clock_out'),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _PunchButton(
                label: '休憩開始',
                iconBuilder: AppIcons.coffee,
                color: AppColors.warning,
                enabled: !isLoading && workState == WorkState.working,
                onPressed: () => onPunch('break_start'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _PunchButton(
                label: '休憩終了',
                iconBuilder: AppIcons.pause,
                color: AppColors.brandLight,
                enabled: !isLoading && workState == WorkState.onBreak,
                onPressed: () => onPunch('break_end'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// 打刻ボタン — Fluent 2 スタイル（アウトライン/塗り切り替え）
class _PunchButton extends StatelessWidget {
  const _PunchButton({
    required this.label,
    required this.iconBuilder,
    required this.color,
    required this.enabled,
    required this.onPressed,
  });

  final String label;
  final Widget Function({double size, Color? color}) iconBuilder;
  final Color color;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final iconColor = enabled ? color : AppColors.textTertiary(context);

    return SizedBox(
      height: 56,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: AppRadius.radius120,
          boxShadow: AppShadows.of4(context),
        ),
        child: Material(
          color: AppColors.surface(context),
          borderRadius: AppRadius.radius120,
          child: InkWell(
            onTap: enabled ? onPressed : null,
            borderRadius: AppRadius.radius120,
            child: Container(
              decoration: BoxDecoration(
                color: enabled
                    ? color.withValues(alpha: 0.15)
                    : Colors.transparent,
                borderRadius: AppRadius.radius120,
                border: Border.all(
                  color: enabled
                      ? color.withValues(alpha: 0.15)
                      : AppColors.border(context),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  iconBuilder(size: 20, color: iconColor),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: AppTextStyles.caption1.copyWith(
                      color: iconColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// サマリー行 — 横並びのキーバリュー
class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.record});

  final AttendanceRecord record;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.border(context)),
        boxShadow: AppShadows.of4(context),
      ),
      child: Row(
        children: [
          _KVItem(
            label: '勤務',
            value: record.workDurationFormatted,
            iconBuilder: AppIcons.briefcase,
            iconColor: AppColors.success,
          ),
          _Divider(),
          _KVItem(
            label: '休憩',
            value: _fmtMin(record.breakMinutes),
            iconBuilder: AppIcons.coffee,
            iconColor: AppColors.warning,
          ),
          _Divider(),
          _KVItem(
            label: '残業',
            value: _fmtMin(record.overtimeMinutes),
            iconBuilder: AppIcons.clock,
            iconColor: AppColors.error,
          ),
        ],
      ),
    );
  }

  String _fmtMin(int m) {
    if (m <= 0) return '-';
    return '${m ~/ 60}:${(m % 60).toString().padLeft(2, '0')}';
  }
}

class _KVItem extends StatelessWidget {
  const _KVItem({
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
              color: AppColors.textSecondary(context),
            ),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(width: 0.5, height: 28, color: AppColors.border(context));
  }
}

/// タイムラインアイテム — GitHub 履歴風（アイコン + 縦線）
class _TimelineItem extends StatelessWidget {
  const _TimelineItem({
    required this.punch,
    this.nextPunch,
    this.isLast = false,
  });

  final AttendancePunch punch;
  final AttendancePunch? nextPunch;
  final bool isLast;

  static TextSpan _punchDescription(AttendancePunch punch, TextStyle base) {
    final time = DateFormat('H時mm分').format(punch.punchedAt.toLocal());
    final bold = base.copyWith(fontWeight: FontWeight.w600);
    final (action, suffix) = switch (punch.punchType) {
      'clock_in' => ('出勤', 'しました'),
      'clock_out' => ('退勤', 'しました'),
      'break_start' => ('休憩を開始', 'しました'),
      'break_end' => ('休憩を終了', 'しました'),
      _ => ('打刻', 'しました'),
    };
    return TextSpan(
      children: [
        TextSpan(text: '$timeに'),
        TextSpan(text: action, style: bold),
        TextSpan(text: suffix),
      ],
    );
  }

  static String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes % 60;
    if (h > 0 && m > 0) return '$h時間$m分';
    if (h > 0) return '$h時間';
    if (m > 0) return '$m分';
    return '0分';
  }

  static String _elapsedLabel(Duration d, String currentType, String nextType) {
    final dur = _formatDuration(d);
    // 休憩開始→休憩終了: 休憩しました
    if (currentType == 'break_start' && nextType == 'break_end') {
      return '$dur 休憩しました';
    }
    // それ以外（出勤→休憩, 休憩終了→退勤 etc）: 勤務しました
    return '$dur 勤務しました';
  }

  @override
  Widget build(BuildContext context) {
    final (iconBuilder, iconColor) = switch (punch.punchType) {
      'clock_in' => (AppIcons.login, AppColors.success),
      'clock_out' => (AppIcons.logout, AppColors.error),
      'break_start' => (AppIcons.coffee, AppColors.warning),
      'break_end' => (AppIcons.pause, AppColors.brandLight),
      _ => (AppIcons.clock, AppColors.textSecondary(context)),
    };

    // 次の打刻までの経過時間
    final elapsed = nextPunch?.punchedAt.difference(punch.punchedAt);

    return Column(
      children: [
        // アイコン + ラベル行
        Row(
          spacing: 0,
          children: [
            // アイコンバッジ
            SizedBox(
              width: 36,
              child: Center(
                child: Container(
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
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            // コンテンツ
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text.rich(
                  _punchDescription(
                    punch,
                    AppTextStyles.footnote.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        // コネクター: 縦棒 + 経過時間（最後以外）
        if (!isLast)
          SizedBox(
            height: 30,
            child: Row(
              children: [
                // 縦棒
                SizedBox(
                  width: 36,
                  child: Center(
                    child: Container(
                      width: 1.5,
                      height: 36,
                      color: AppColors.border(context),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                // 経過時間
                if (elapsed != null)
                  Text(
                    _elapsedLabel(
                      elapsed,
                      punch.punchType,
                      nextPunch!.punchType,
                    ),
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
