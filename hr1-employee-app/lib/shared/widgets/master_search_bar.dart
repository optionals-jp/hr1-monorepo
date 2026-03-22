import 'package:flutter/material.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/loading_indicator.dart';
import 'package:hr1_employee_app/shared/widgets/search_box.dart';

/// マスタデータから検索・選択・自由入力が可能な検索バーコンポーネント
///
/// 既存の [SearchBox] をベースにし、Autocomplete による候補表示と
/// 追加ボタンを組み合わせたコンポーネント。
class MasterSearchBar extends StatefulWidget {
  const MasterSearchBar({
    super.key,
    required this.masterNames,
    required this.onAdd,
    this.hintText = '検索・追加',
    this.isAdding = false,
  });

  /// マスタデータの名前リスト（検索候補）
  final List<String> masterNames;

  /// 追加時のコールバック（選択 or 自由入力）
  final Future<void> Function(String name) onAdd;

  /// プレースホルダテキスト
  final String hintText;

  /// 追加中フラグ（ローディング表示用）
  final bool isAdding;

  @override
  State<MasterSearchBar> createState() => _MasterSearchBarState();
}

class _MasterSearchBarState extends State<MasterSearchBar> {
  final _textController = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _handleAdd([String? selectedName]) {
    final name = (selectedName ?? _textController.text).trim();
    if (name.isEmpty) return;
    widget.onAdd(name);
    _textController.clear();
    _focusNode.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
      child: Row(
        children: [
          Expanded(
            child: Autocomplete<String>(
              key: ValueKey(widget.masterNames.length),
              optionsBuilder: (textEditingValue) {
                if (textEditingValue.text.isEmpty) return const [];
                final query = textEditingValue.text.toLowerCase();
                return widget.masterNames.where(
                  (name) => name.toLowerCase().contains(query),
                );
              },
              onSelected: (name) => _handleAdd(name),
              fieldViewBuilder: (ctx, controller, focusNode, onSubmitted) {
                // Autocomplete 内部の controller と同期
                _textController.text = controller.text;
                controller.addListener(() {
                  _textController.text = controller.text;
                });
                return SearchBox(
                  controller: controller,
                  focusNode: focusNode,
                  hintText: widget.hintText,
                  onSubmitted: (_) => _handleAdd(),
                );
              },
              optionsViewBuilder: (ctx, onSelected, options) {
                return Align(
                  alignment: Alignment.topLeft,
                  child: Material(
                    elevation: 4,
                    borderRadius: AppRadius.radius120,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 200),
                      child: ListView.builder(
                        padding: EdgeInsets.zero,
                        shrinkWrap: true,
                        itemCount: options.length,
                        itemBuilder: (ctx2, index) {
                          final option = options.elementAt(index);
                          return InkWell(
                            onTap: () => onSelected(option),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 10,
                              ),
                              child: Text(
                                option,
                                style: AppTextStyles.caption1,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          SizedBox(
            width: 40,
            height: 40,
            child: IconButton(
              onPressed: widget.isAdding ? null : () => _handleAdd(),
              style: IconButton.styleFrom(
                backgroundColor: AppColors.brandPrimary,
                foregroundColor: Colors.white,
              ),
              icon: widget.isAdding
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: LoadingIndicator(size: 18),
                    )
                  : const Icon(Icons.add_rounded, size: 22),
            ),
          ),
        ],
      ),
    );
  }
}
