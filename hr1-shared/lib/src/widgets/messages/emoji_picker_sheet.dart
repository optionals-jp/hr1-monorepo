import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 絵文字ピッカーボトムシート（リアクション用）
///
/// `kCommonMessageEmojis` を 6x4 のグリッドで表示。タップで選択した絵文字を
/// 返す。
class EmojiPickerSheet {
  EmojiPickerSheet._();

  static Future<String?> show(BuildContext context) {
    return showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      useSafeArea: true,
      backgroundColor: AppColors.surface(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => const _EmojiPickerContent(),
    );
  }
}

class _EmojiPickerContent extends StatelessWidget {
  const _EmojiPickerContent();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenHorizontal,
          AppSpacing.md,
          AppSpacing.screenHorizontal,
          AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: Text('リアクションを選択', style: AppTextStyles.headline),
            ),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 6,
              mainAxisSpacing: AppSpacing.sm,
              crossAxisSpacing: AppSpacing.sm,
              children: kCommonMessageEmojis
                  .map(
                    (e) => InkWell(
                      onTap: () => Navigator.of(context).pop(e),
                      borderRadius: BorderRadius.circular(
                        AppRadius.cornerRadius120,
                      ),
                      child: Center(
                        child: Text(e, style: const TextStyle(fontSize: 28)),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}
