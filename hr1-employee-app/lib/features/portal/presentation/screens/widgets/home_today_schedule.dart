import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart';

class _ScheduleEntry {
  const _ScheduleEntry({
    required this.time,
    required this.title,
    required this.duration,
    required this.location,
    required this.accent,
  });

  final String time;
  final String title;
  final String duration;
  final String location;
  final Color accent;
}

const _entries = <_ScheduleEntry>[
  _ScheduleEntry(
    time: '09:30',
    title: 'デイリースタンドアップ',
    duration: '30m',
    location: '10F A会議室',
    accent: AppColors.success,
  ),
  _ScheduleEntry(
    time: '11:00',
    title: '1on1: 田中 真理子',
    duration: '60m',
    location: 'オンライン',
    accent: AppColors.purple,
  ),
  _ScheduleEntry(
    time: '14:00',
    title: 'ノース電機 提案レビュー',
    duration: '90m',
    location: '10F C会議室',
    accent: AppColors.warning,
  ),
];

/// ホーム画面の「今日の予定」セクション。
class HomeTodaySchedule extends StatelessWidget {
  const HomeTodaySchedule({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          _SectionHeaderRow(
            title: '今日の予定',
            actionLabel: 'カレンダー',
            onAction: () => context.push(AppRoutes.calendar),
          ),
          const SizedBox(height: AppSpacing.sm),
          CommonCard(
            padding: EdgeInsets.zero,
            margin: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            child: Column(
              children: [
                for (var i = 0; i < _entries.length; i++) ...[
                  _ScheduleRow(entry: _entries[i]),
                  if (i < _entries.length - 1)
                    Divider(
                      height: 1,
                      thickness: 0.5,
                      indent: AppSpacing.md,
                      endIndent: AppSpacing.md,
                      color: AppColors.divider(context),
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeaderRow extends StatelessWidget {
  const _SectionHeaderRow({
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: AppTextStyles.label1.copyWith(
                color: AppColors.textPrimary(context),
              ),
            ),
          ),
          if (actionLabel != null && onAction != null)
            GestureDetector(
              onTap: onAction,
              child: Row(
                children: [
                  Text(
                    actionLabel!,
                    style: AppTextStyles.caption1.copyWith(
                      color: AppColors.brand,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  AppIcons.arrow(size: 16, color: AppColors.brand),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ScheduleRow extends StatelessWidget {
  const _ScheduleRow({required this.entry});

  final _ScheduleEntry entry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 3,
            height: 36,
            decoration: BoxDecoration(
              color: entry.accent,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          SizedBox(
            width: 52,
            child: Text(
              entry.time,
              style: AppTextStyles.label1.copyWith(
                color: AppColors.textPrimary(context),
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.title,
                  style: AppTextStyles.body2.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${entry.duration}・${entry.location}',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
