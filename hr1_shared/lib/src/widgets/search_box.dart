import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 共通検索ボックス — Teams / Outlook モバイルスタイル（ピル型）
///
/// - デフォルト: タップすると [onTap] を呼び出すプレースホルダー表示
/// - 編集モード ([controller] + [focusNode] を渡す): 入力可能な TextField 表示
class SearchBox extends StatelessWidget {
  const SearchBox({
    super.key,
    this.onTap,
    this.hintText = '検索',
    this.controller,
    this.focusNode,
    this.onSubmitted,
    this.onChanged,
    this.onClear,
  });

  /// タップハンドラ
  final VoidCallback? onTap;
  final String hintText;

  /// 編集モード用（両方渡すと TextField が表示される）
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onClear;

  bool get _isEditable => controller != null;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hintColor = AppColors.textSecondary(theme.brightness);

    final box = Container(
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.surfaceTertiary(theme.brightness),
        borderRadius: BorderRadius.circular(9999),
      ),
      child: Row(
        children: [
          const SizedBox(width: 14),
          Icon(Icons.search, size: 20, color: hintColor),
          const SizedBox(width: 10),
          Expanded(
            child: _isEditable
                ? TextField(
                    controller: controller,
                    focusNode: focusNode,
                    style: AppTextStyles.body2,
                    textInputAction: TextInputAction.search,
                    onSubmitted: onSubmitted,
                    onChanged: onChanged,
                    decoration: InputDecoration(
                      hintText: hintText,
                      hintStyle: AppTextStyles.body2.copyWith(color: hintColor),
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
                    style: AppTextStyles.body2.copyWith(color: hintColor),
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
                      color: AppColors.textSecondary(theme.brightness),
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
      onTap: onTap,
      child: box,
    );
  }
}
