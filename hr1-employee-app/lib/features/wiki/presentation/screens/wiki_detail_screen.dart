import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';
import 'package:intl/intl.dart';

class WikiDetailScreen extends StatelessWidget {
  const WikiDetailScreen({super.key, required this.page});

  final WikiPage page;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('yyyy/MM/dd HH:mm');

    return CommonScaffold(
      appBar: AppBar(title: Text(page.title)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (page.category != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: AppColors.brand.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  page.category!,
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.brand,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
            Text(
              '更新日: ${dateFormat.format(page.updatedAt)}',
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            const Divider(),
            const SizedBox(height: AppSpacing.md),
            MarkdownBody(
              data: page.content,
              styleSheet: MarkdownStyleSheet(
                p: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(context),
                  height: 1.6,
                ),
                h1: AppTextStyles.headline,
                h2: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w600),
                h3: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w500),
                listBullet: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
                code: AppTextStyles.caption1.copyWith(
                  backgroundColor: AppColors.surfaceTertiary(context),
                ),
              ),
              shrinkWrap: true,
            ),
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }
}
