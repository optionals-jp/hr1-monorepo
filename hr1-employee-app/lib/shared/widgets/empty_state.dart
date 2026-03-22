import 'package:flutter/material.dart';
import '../../core/constants/constants.dart';

/// 共通の空状態ウィジェット（データがない場合に表示）
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.description,
    this.action,
  });

  /// 表示アイコン
  final Widget icon;

  /// タイトルテキスト
  final String title;

  /// 説明テキスト（任意）
  final String? description;

  /// アクションボタン（任意）
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            icon,
            const SizedBox(height: AppSpacing.lg),
            Text(title, style: AppTextStyles.headline),
            if (description != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                description!,
                style: AppTextStyles.caption1.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: AppSpacing.xl),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}
