import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 横スクロールのフィルタータブ行。
/// 掲示板・フィード・各種一覧の上部で使われる単一選択チップグループ。
///
/// ```dart
/// FilterTabsRow(
///   tabs: ['すべて', '全社', '私の部署'],
///   selectedIndex: 0,
///   onTap: (i) => setState(() => _selected = i),
/// )
/// ```
class FilterTabsRow extends StatelessWidget {
  const FilterTabsRow({
    super.key,
    required this.tabs,
    required this.selectedIndex,
    this.onTap,
  });

  final List<String> tabs;
  final int selectedIndex;

  /// `null` の場合は静的表示（タップ無効）。
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 32,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
        ),
        itemCount: tabs.length,
        separatorBuilder: (_, _) => const SizedBox(width: 6),
        itemBuilder: (context, i) {
          return _FilterTab(
            label: tabs[i],
            selected: i == selectedIndex,
            onTap: onTap == null ? null : () => onTap!(i),
          );
        },
      ),
    );
  }
}

class _FilterTab extends StatelessWidget {
  const _FilterTab({required this.label, required this.selected, this.onTap});

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? Colors.white : AppColors.textPrimary(context);
    final bg = selected ? AppColors.brand : AppColors.surfaceTertiary(context);
    final tab = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: AppTextStyles.label1.copyWith(
          color: fg,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
    if (onTap == null) return tab;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: tab,
    );
  }
}
