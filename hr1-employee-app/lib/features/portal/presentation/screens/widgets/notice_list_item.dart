import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/constants/app_spacing.dart';
import '../../../../../core/constants/app_text_styles.dart';

/// お知らせリストアイテム — Teams アクティビティフィードスタイル
class NoticeListItem extends StatelessWidget {
  const NoticeListItem({super.key, required this.title, required this.subtitle, required this.date, required this.isNew});

  final String title;
  final String subtitle;
  final String date;
  final bool isNew;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // アイコン（Teams のアクティビティアイコン風）
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isNew
                    ? AppColors.brandPrimary.withValues(alpha: 0.1)
                    : theme.colorScheme.onSurface.withValues(alpha: 0.06),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.campaign_outlined,
                size: 20,
                color: isNew ? AppColors.brandPrimary : theme.colorScheme.onSurface.withValues(alpha: 0.45),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            // コンテンツ
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: AppTextStyles.caption1.copyWith(
                            fontWeight: isNew ? FontWeight.w600 : FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        date,
                        style: AppTextStyles.caption2.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTextStyles.caption2.copyWith(color: AppColors.textSecondary(theme.brightness)),
                  ),
                ],
              ),
            ),
            // 未読ドット
            if (isNew)
              Container(
                margin: const EdgeInsets.only(left: AppSpacing.sm, top: 6),
                width: 8,
                height: 8,
                decoration: const BoxDecoration(color: AppColors.brandPrimary, shape: BoxShape.circle),
              ),
          ],
        ),
      ),
    );
  }
}
