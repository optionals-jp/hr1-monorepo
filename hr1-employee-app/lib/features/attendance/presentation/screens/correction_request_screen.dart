import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/attendance/presentation/controllers/attendance_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';

class CorrectionRequestScreen extends HookConsumerWidget {
  const CorrectionRequestScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final correctedTimes = useState<Map<String, TimeOfDay>>({});
    final reasonController = useTextEditingController();

    final todayRecord = ref.watch(todayRecordProvider);
    final todayPunches = ref.watch(todayPunchesProvider);
    final isSubmitting = ref.watch(correctionControllerProvider);
    Future<void> pickTime(AttendancePunch punch) async {
      final current =
          correctedTimes.value[punch.id] ??
          TimeOfDay.fromDateTime(punch.punchedAt.toLocal());
      final picked = await showTimePicker(
        context: context,
        initialTime: current,
      );
      if (picked != null) {
        correctedTimes.value = {...correctedTimes.value, punch.id: picked};
      }
    }

    void clearCorrection(String punchId) {
      final updated = Map<String, TimeOfDay>.of(correctedTimes.value);
      updated.remove(punchId);
      correctedTimes.value = updated;
    }

    Future<void> submit(
      AttendanceRecord record,
      List<AttendancePunch> punches,
    ) async {
      if (correctedTimes.value.isEmpty) {
        CommonSnackBar.error(context, '修正する打刻時刻を選択してください');
        return;
      }
      if (reasonController.text.trim().isEmpty) {
        CommonSnackBar.error(context, '修正理由を入力してください');
        return;
      }

      try {
        await ref
            .read(correctionControllerProvider.notifier)
            .submitCorrection(
              record: record,
              punches: punches,
              correctedTimes: Map.of(correctedTimes.value),
              reason: reasonController.text.trim(),
            );

        if (!context.mounted) return;
        CommonSnackBar.show(context, '修正依頼を送信しました');
        context.pop();
      } catch (e) {
        if (!context.mounted) return;
        CommonSnackBar.error(context, 'エラーが発生しました: $e');
      }
    }

    Widget buildDurationSummary(List<AttendancePunch> punches) {
      final settings =
          ref.watch(attendanceSettingsProvider).valueOrNull ??
          const AttendanceSettings();
      final durations = ref
          .read(correctionControllerProvider.notifier)
          .calcDurations(
            punches: punches,
            settings: settings,
            correctedTimes: correctedTimes.value,
          );
      String fmtMin(int m) {
        if (m <= 0) return '-';
        return '${m ~/ 60}:${(m % 60).toString().padLeft(2, '0')}';
      }

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '時間サマリー${correctedTimes.value.isNotEmpty ? '（修正後）' : ''}',
            style: AppTextStyles.caption1.copyWith(
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary(context),
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          CommonCard(
            margin: EdgeInsets.zero,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
                  color: AppColors.border(context),
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
                  color: AppColors.border(context),
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

    Widget buildEmptyState() {
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
                  color: AppColors.surface(context),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.info_outline_rounded,
                  size: 28,
                  color: AppColors.textSecondary(context),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('今日の打刻記録がありません', style: AppTextStyles.headline),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '出勤打刻後に修正依頼を送信できます',
                style: AppTextStyles.caption1.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            ],
          ),
        ),
      );
    }

    Widget buildCard({required Widget child, EdgeInsets? padding}) {
      return CommonCard(
        margin: EdgeInsets.zero,
        padding: padding,
        child: child,
      );
    }

    return CommonScaffold(
      appBar: AppBar(
        title: const Text('勤怠修正依頼'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(0.5),
          child: Container(height: 0.5, color: AppColors.border(context)),
        ),
      ),
      body: todayRecord.when(
        data: (record) {
          if (record == null) {
            return buildEmptyState();
          }

          final punches = todayPunches.valueOrNull ?? [];
          if (punches.isEmpty) {
            return buildEmptyState();
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: AppSpacing.sm),
                buildDurationSummary(punches),
                const SizedBox(height: AppSpacing.xxl),
                Text(
                  '打刻時刻の修正',
                  style: AppTextStyles.caption1.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary(context),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '修正が必要な打刻の「変更」ボタンを押してください',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                buildCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (var i = 0; i < punches.length; i++) ...[
                        if (i > 0)
                          Divider(
                            height: 0.5,
                            color: AppColors.border(context),
                          ),
                        _PunchCorrectionRow(
                          punch: punches[i],
                          correctedTime: correctedTimes.value[punches[i].id],
                          onEdit: () => pickTime(punches[i]),
                          onClear:
                              correctedTimes.value.containsKey(punches[i].id)
                              ? () => clearCorrection(punches[i].id)
                              : null,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),
                Text(
                  '修正理由',
                  style: AppTextStyles.caption1.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary(context),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: reasonController,
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
                CommonButton(
                  onPressed: () => submit(record, punches),
                  loading: isSubmitting,
                  child: const Text('修正依頼を送信'),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  '承認者が修正を承認すると、勤怠記録が更新されます。',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          );
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => const ErrorState(),
      ),
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
      _ => (AppIcons.clock, AppColors.brand),
    };
  }

  String get _correctedTimeText {
    if (correctedTime == null) return '';
    return '${correctedTime!.hour.toString().padLeft(2, '0')}:${correctedTime!.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
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
                          color: AppColors.textSecondary(context),
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Icon(
                          Icons.arrow_forward_rounded,
                          size: 14,
                          color: AppColors.textSecondary(context),
                        ),
                      ),
                      Text(
                        _correctedTimeText,
                        style: AppTextStyles.headline.copyWith(
                          color: AppColors.brand,
                        ),
                      ),
                    ],
                  )
                else
                  Text(originalTime, style: AppTextStyles.headline),
              ],
            ),
          ),
          CompactTextAction(label: '変更', onPressed: onEdit),
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
