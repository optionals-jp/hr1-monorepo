import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

class CommonOption<T> {
  const CommonOption({
    required this.value,
    required this.label,
    this.leading,
    this.labelStyle,
  });

  final T value;
  final String label;
  final Widget? leading;
  final TextStyle? labelStyle;
}

/// 単一選択メニューのハーフシート。
///
/// `T` に nullable を指定すれば「未選択」を `null` で表現できる。戻り値の
/// `null` をキャンセルとする設計だと `T = T?` のときに「null を選択」と
/// 区別できないため、選択値はコールバックで受け取る。
class CommonOptionSheet {
  CommonOptionSheet._();

  static Future<void> show<T>({
    required BuildContext context,
    required String title,
    required List<CommonOption<T>> options,
    required T selected,
    required ValueChanged<T> onSelect,
    bool searchable = false,
    String searchHint = '検索',
  }) {
    if (options.isEmpty) {
      throw ArgumentError.value(options, 'options', 'must not be empty');
    }
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      // useSafeArea: false にすると内側で `MediaQuery.removePadding(removeTop:
      // true)` が適用されて padding.top = 0 になり、Dynamic Island/notch の
      // クリアランス計算が壊れる。
      useSafeArea: true,
      isScrollControlled: true,
      useRootNavigator: true,
      builder: (sheetCtx) => _Body<T>(
        title: title,
        options: options,
        selected: selected,
        onSelect: onSelect,
        searchable: searchable,
        searchHint: searchHint,
      ),
    );
  }
}

class _Body<T> extends StatefulWidget {
  const _Body({
    required this.title,
    required this.options,
    required this.selected,
    required this.onSelect,
    required this.searchable,
    required this.searchHint,
  });

  final String title;
  final List<CommonOption<T>> options;
  final T selected;
  final ValueChanged<T> onSelect;
  final bool searchable;
  final String searchHint;

  @override
  State<_Body<T>> createState() => _BodyState<T>();
}

class _BodyState<T> extends State<_Body<T>> {
  // 連打で onSelect が複数回 + Navigator stack を巻き戻しすぎないよう固定。
  bool _dispatched = false;
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _handleSelect(T value) {
    if (_dispatched) return;
    _dispatched = true;
    Navigator.of(context).pop();
    widget.onSelect(value);
  }

  List<CommonOption<T>> _filteredOptions() {
    if (!widget.searchable || _query.isEmpty) return widget.options;
    final q = _query.toLowerCase();
    return widget.options
        .where((o) => o.label.toLowerCase().contains(q))
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Dynamic Island 直下にカードが張り付かないよう余白を引く。
        const topClearance = AppSpacing.xxl;
        final maxHeight = constraints.maxHeight - topClearance;
        return ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: SafeArea(
            // top は route 側 SafeArea で処理済み。bottom のみここで処理。
            top: false,
            child: Container(
              margin: const EdgeInsetsDirectional.fromSTEB(
                AppSpacing.sm,
                0,
                AppSpacing.sm,
                AppSpacing.sm,
              ),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: AppColors.surface(context),
                borderRadius: BorderRadius.circular(20),
              ),
              // 子の InkWell が ripple を描けるよう Material を被せる。
              child: Material(
                type: MaterialType.transparency,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Center(
                        child: Container(
                          width: 32,
                          height: 4,
                          decoration: BoxDecoration(
                            color: AppColors.border(context),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                        AppSpacing.xl,
                        0,
                        AppSpacing.xl,
                        AppSpacing.md,
                      ),
                      child: Semantics(
                        header: true,
                        child: Text(
                          widget.title,
                          style: AppTextStyles.headline.copyWith(
                            color: AppColors.textPrimary(context),
                          ),
                        ),
                      ),
                    ),
                    Container(height: 1, color: AppColors.divider(context)),
                    if (widget.searchable)
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                          AppSpacing.xl,
                          AppSpacing.md,
                          AppSpacing.xl,
                          AppSpacing.sm,
                        ),
                        child: SearchBox(
                          controller: _searchController,
                          hintText: widget.searchHint,
                          onChanged: (v) => setState(() => _query = v),
                          onClear: () => setState(() => _query = ''),
                        ),
                      ),
                    Flexible(
                      child: Builder(
                        builder: (context) {
                          final filtered = _filteredOptions();
                          if (widget.searchable && filtered.isEmpty) {
                            return Padding(
                              padding: const EdgeInsetsDirectional.symmetric(
                                horizontal: AppSpacing.xl,
                                vertical: AppSpacing.lg,
                              ),
                              child: Text(
                                '該当する候補はありません',
                                style: AppTextStyles.body2.copyWith(
                                  color: AppColors.textSecondary(context),
                                ),
                              ),
                            );
                          }
                          return Semantics(
                            container: true,
                            label: widget.title,
                            child: ListView.builder(
                              shrinkWrap: true,
                              padding: EdgeInsets.zero,
                              itemCount: filtered.length,
                              itemBuilder: (context, i) {
                                final option = filtered[i];
                                return _OptionRow<T>(
                                  option: option,
                                  selected: option.value == widget.selected,
                                  onTap: () => _handleSelect(option.value),
                                );
                              },
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _OptionRow<T> extends StatelessWidget {
  const _OptionRow({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final CommonOption<T> option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // dark では brand の 6% が地色とほぼ同じになるため濃くする。
    final highlightAlpha = AppColors.isDark(context) ? 0.16 : 0.06;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      selected: selected,
      button: true,
      child: Material(
        color: selected
            ? AppColors.brand.withValues(alpha: highlightAlpha)
            : Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            // 大きい text scale でも 44px のタップ領域を維持。
            constraints: const BoxConstraints(minHeight: 44),
            child: Padding(
              padding: const EdgeInsetsDirectional.symmetric(
                horizontal: AppSpacing.xl,
                vertical: 10,
              ),
              child: Row(
                children: [
                  Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                    size: 22,
                    color: selected
                        ? AppColors.brand
                        : AppColors.textTertiary(context),
                  ),
                  const SizedBox(width: AppSpacing.lg),
                  if (option.leading != null) ...[
                    option.leading!,
                    const SizedBox(width: AppSpacing.sm),
                  ],
                  Expanded(
                    child: Text(
                      option.label,
                      style: (option.labelStyle ?? AppTextStyles.body2)
                          .copyWith(
                            fontWeight: selected
                                ? FontWeight.w600
                                : FontWeight.w400,
                            color: AppColors.textPrimary(context),
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
