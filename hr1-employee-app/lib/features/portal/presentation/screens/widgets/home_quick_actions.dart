import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// ホーム画面のクイックアクショングリッド — 7 アイテムを横一行に並べる。
class HomeQuickActions extends StatelessWidget {
  const HomeQuickActions({super.key});

  @override
  Widget build(BuildContext context) {
    final items = <_QuickActionItem>[
      _QuickActionItem(
        iconBuilder: ({required size, required color}) =>
            AppIcons.user(size: size, color: color),
        label: '社員検索',
        bg: AppColors.brand,
        onTap: () => context.push(AppRoutes.employees),
      ),
      _QuickActionItem(
        iconBuilder: ({required size, required color}) =>
            AppIcons.folder(size: size, color: color),
        label: '文書検索',
        bg: AppColors.brandSecondary,
        onTap: () => context.push(AppRoutes.search),
      ),
      _QuickActionItem(
        iconBuilder: ({required size, required color}) =>
            AppIcons.clipboardTick(size: size, color: color),
        label: '申請',
        bg: AppColors.warning,
        onTap: () => context.push(AppRoutes.workflow),
      ),
      _QuickActionItem(
        iconBuilder: ({required size, required color}) =>
            AppIcons.hierarchy(size: size, color: color),
        label: '組織図',
        bg: AppColors.success,
        onTap: () => context.push(AppRoutes.employees),
      ),
      _QuickActionItem(
        iconBuilder: ({required size, required color}) =>
            AppIcons.buildings(size: size, color: color),
        label: 'CRM',
        bg: AppColors.purple,
        onTap: () => context.push(AppRoutes.bcDeals),
      ),
      _QuickActionItem(
        iconBuilder: ({required size, required color}) =>
            AppIcons.tickCircle(size: size, color: color),
        label: 'タスク',
        bg: AppColors.success,
        onTap: () => context.push(AppRoutes.tasks),
      ),
      _QuickActionItem(
        iconBuilder: ({required size, required color}) =>
            AppIcons.calendarTick(size: size, color: color),
        label: '有給',
        bg: AppColors.brand,
        onTap: () => context.push(AppRoutes.leaveBalance),
      ),
    ];

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.lg, bottom: AppSpacing.sm),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
        ),
        child: Row(
          spacing: AppSpacing.xl,
          children: [
            for (var i = 0; i < items.length; i++) ...[
              _QuickActionTile(item: items[i]),
            ],
          ],
        ),
      ),
    );
  }
}

typedef _IconBuilder =
    Widget Function({required double size, required Color color});

class _QuickActionItem {
  const _QuickActionItem({
    required this.iconBuilder,
    required this.label,
    required this.bg,
    required this.onTap,
  });

  final _IconBuilder iconBuilder;
  final String label;
  final Color bg;
  final VoidCallback onTap;
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({required this.item});

  final _QuickActionItem item;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: item.onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: item.bg.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(child: item.iconBuilder(size: 26, color: item.bg)),
          ),
          const SizedBox(height: 8),
          Text(
            item.label,
            style: AppTextStyles.caption1.copyWith(
              color: AppColors.textPrimary(context),
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
