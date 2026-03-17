import 'package:flutter/material.dart';
import '../../core/constants/app_icons.dart';
import '../../core/constants/app_text_styles.dart';
import '../screens/search_screen.dart';

/// 共通検索ボックス — Teams / Outlook モバイルスタイル（ピル型）
///
/// - デフォルト: タップすると検索画面へ遷移するプレースホルダー表示
/// - 編集モード ([controller] + [focusNode] を渡す): 入力可能な TextField 表示
class SearchBox extends StatelessWidget {
  const SearchBox({
    super.key,
    this.onTap,
    this.hintText = '検索',
    this.controller,
    this.focusNode,
    this.onSubmitted,
    this.onClear,
  });

  /// カスタムタップハンドラ。nullの場合はデフォルトの検索画面を表示
  final VoidCallback? onTap;
  final String hintText;

  /// 編集モード用（両方渡すと TextField が表示される）
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onClear;

  bool get _isEditable => controller != null;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hintColor = theme.colorScheme.onSurface.withValues(alpha: 0.5);

    final box = Container(
      height: 40,
      decoration: BoxDecoration(
        color: theme.brightness == Brightness.dark
            ? theme.colorScheme.surfaceContainerHighest
            : const Color(0xFFEFEFEF),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          const SizedBox(width: 14),
          AppIcons.search(size: 20, color: hintColor),
          const SizedBox(width: 10),
          Expanded(
            child: _isEditable
                ? TextField(
                    controller: controller,
                    focusNode: focusNode,
                    style: AppTextStyles.caption1,
                    textInputAction: TextInputAction.search,
                    onSubmitted: onSubmitted,
                    decoration: InputDecoration(
                      hintText: hintText,
                      hintStyle:
                          AppTextStyles.caption1.copyWith(color: hintColor),
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      isDense: true,
                    ),
                  )
                : Text(
                    hintText,
                    style: AppTextStyles.caption1.copyWith(color: hintColor),
                  ),
          ),
          if (_isEditable)
            ListenableBuilder(
              listenable: controller!,
              builder: (context, _) {
                if (controller!.text.isEmpty) {
                  return const SizedBox(width: 14);
                }
                return GestureDetector(
                  onTap: () {
                    controller!.clear();
                    onClear?.call();
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Icon(
                      Icons.cancel_rounded,
                      size: 18,
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.4),
                    ),
                  ),
                );
              },
            )
          else
            const SizedBox(width: 14),
        ],
      ),
    );

    if (_isEditable) return box;

    return GestureDetector(
      onTap: onTap ?? () => SearchScreen.show(context),
      child: box,
    );
  }
}
