import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart';

typedef _IconBuilder =
    Widget Function({required double size, required Color color});

class _AnnouncementItem {
  const _AnnouncementItem({
    required this.tag,
    required this.tagColor,
    required this.title,
    required this.date,
    required this.iconBuilder,
    required this.iconColor,
  });

  final String tag;
  final Color tagColor;
  final String title;
  final String date;
  final _IconBuilder iconBuilder;
  final Color iconColor;
}

final _items = <_AnnouncementItem>[
  _AnnouncementItem(
    tag: '人事',
    tagColor: AppColors.brand,
    title: '健康診断 予約受付中',
    date: '4/22',
    iconBuilder: ({required size, required color}) =>
        AppIcons.note(size: size, color: color),
    iconColor: AppColors.brand,
  ),
  _AnnouncementItem(
    tag: 'IT',
    tagColor: AppColors.warning,
    title: 'メンテナンス 4/26 (土) 22:00',
    date: '4/22',
    iconBuilder: ({required size, required color}) =>
        AppIcons.setting(size: size, color: color),
    iconColor: AppColors.warning,
  ),
];

/// ホーム画面の「お知らせ」セクション。
class HomeAnnouncements extends StatelessWidget {
  const HomeAnnouncements({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'お知らせ',
                    style: AppTextStyles.label1.copyWith(
                      color: AppColors.textPrimary(context),
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: () => context.push(AppRoutes.announcements),
                  child: Row(
                    children: [
                      Text(
                        'すべて',
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
          ),
          const SizedBox(height: AppSpacing.sm),
          CommonCard(
            padding: EdgeInsets.zero,
            margin: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            child: Column(
              children: [
                for (var i = 0; i < _items.length; i++) ...[
                  _AnnouncementRow(item: _items[i]),
                  if (i < _items.length - 1)
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

class _AnnouncementRow extends StatelessWidget {
  const _AnnouncementRow({required this.item});

  final _AnnouncementItem item;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(AppRoutes.announcements),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            item.iconBuilder(size: 18, color: item.iconColor),
            const SizedBox(width: AppSpacing.sm),
            _Tag(label: item.tag, color: item.tagColor),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                item.title,
                style: AppTextStyles.body2.copyWith(
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(
              item.date,
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textTertiary(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption2.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
