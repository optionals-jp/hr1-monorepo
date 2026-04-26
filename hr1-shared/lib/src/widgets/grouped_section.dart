import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// グループ化セクション（ヘッダー付き）
class GroupedSection extends StatelessWidget {
  const GroupedSection({
    super.key,
    this.title,
    required this.children,
    this.dividerIndent = 52,
  });

  final String? title;
  final List<Widget> children;
  final double dividerIndent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              0,
              AppSpacing.screenHorizontal,
              AppSpacing.sm,
            ),
            child: Text(
              title!,
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textSecondary(context),
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ),
        Column(
          children: [
            for (var i = 0; i < children.length; i++) ...[
              children[i],
              if (i < children.length - 1)
                Divider(
                  height: 0.5,
                  indent: dividerIndent,
                  color: AppColors.border(context),
                ),
            ],
          ],
        ),
      ],
    );
  }
}
