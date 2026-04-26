import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 「あなたへの提案」セクション — 横スクロール 2 枚カード。
class HomeSuggestionsSection extends StatelessWidget {
  const HomeSuggestionsSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              0,
              AppSpacing.screenHorizontal,
              AppSpacing.sm,
            ),
            child: Text(
              'あなたへの提案',
              style: AppTextStyles.label1.copyWith(
                color: AppColors.textPrimary(context),
              ),
            ),
          ),
          SizedBox(
            // 132 (カード本体) + 上下 6px ずつ (BoxShadow が見切れないよう余白)
            height: 144,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                6,
                AppSpacing.screenHorizontal,
                6,
              ),
              children: const [
                _SuggestionCard(
                  variant: _SuggestionVariant.brand,
                  badge: '今日 15:00',
                  title: 'ノース電機 提案書 v4 のレビュー期限',
                  description: 'AI が下書きしました。確認しますか？',
                  primaryLabel: '開く',
                  secondaryLabel: '後で',
                ),
                SizedBox(width: AppSpacing.sm),
                _SuggestionCard(
                  variant: _SuggestionVariant.warning,
                  badge: '残業注意',
                  title: '今月残業 9.2h / 上限 45h',
                  description: 'このペースで進むと月末に超過する可能性',
                  primaryLabel: '開く',
                  secondaryLabel: null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum _SuggestionVariant { brand, warning }

class _SuggestionCard extends StatelessWidget {
  const _SuggestionCard({
    required this.variant,
    required this.badge,
    required this.title,
    required this.description,
    required this.primaryLabel,
    required this.secondaryLabel,
  });

  final _SuggestionVariant variant;
  final String badge;
  final String title;
  final String description;
  final String primaryLabel;
  final String? secondaryLabel;

  @override
  Widget build(BuildContext context) {
    final accent = switch (variant) {
      _SuggestionVariant.brand => AppColors.brand,
      _SuggestionVariant.warning => AppColors.warning,
    };
    final Widget badgeIcon = switch (variant) {
      _SuggestionVariant.brand => AppIcons.star(size: 14, color: accent),
      _SuggestionVariant.warning => AppIcons.notification(
        size: 14,
        color: accent,
      ),
    };

    return SizedBox(
      width: 260,
      child: CommonCard(
        padding: const EdgeInsets.all(AppSpacing.md),
        margin: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                badgeIcon,
                const SizedBox(width: 4),
                Text(
                  badge,
                  style: AppTextStyles.caption2.copyWith(
                    color: accent,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              title,
              style: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w600),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Expanded(
              child: Text(
                description,
                style: AppTextStyles.caption1.copyWith(
                  color: AppColors.textSecondary(context),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: _PrimaryActionButton(
                    label: primaryLabel,
                    color: accent,
                    onPressed: () {},
                  ),
                ),
                if (secondaryLabel != null) ...[
                  const SizedBox(width: 8),
                  CompactTextAction(
                    label: secondaryLabel!,
                    onPressed: () {},
                    color: AppColors.textSecondary(context),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PrimaryActionButton extends StatelessWidget {
  const _PrimaryActionButton({
    required this.label,
    required this.color,
    required this.onPressed,
  });

  final String label;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 32,
      child: CommonButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          minimumSize: Size.zero,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: AppTextStyles.caption1.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        child: Text(label),
      ),
    );
  }
}
