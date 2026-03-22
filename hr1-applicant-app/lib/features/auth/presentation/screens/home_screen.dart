import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../notifications/presentation/providers/notification_providers.dart';
import '../providers/organization_context_provider.dart';

/// ホーム画面（BottomNavigationBar付きのシェル）
/// 応募者向け: ホーム / 応募状況 / メッセージ / マイページ
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key, required this.navigationShell});

  /// StatefulShellRoute のナビゲーションシェル
  final StatefulNavigationShell navigationShell;

  static const _tabTitles = ['', '応募状況', 'メッセージ', 'やること', 'マイページ'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentOrg = ref.watch(currentOrganizationProvider);
    final isCompanyTab = navigationShell.currentIndex == 0;

    return Scaffold(
      appBar: AppBar(
        // 企業切り替えはホーム（企業）タブのみ
        title: isCompanyTab
            ? const OrganizationSwitcher()
            : Text(
                _tabTitles[navigationShell.currentIndex],
                style: AppTextStyles.title2,
              ),
        // centerTitle: !isCompanyTab,
        centerTitle: false,
        actions: currentOrg != null ? [const _NotificationIconButton()] : null,
      ),
      body: navigationShell,
      bottomNavigationBar: Builder(
        builder: (context) {
          final navTheme = Theme.of(context).bottomNavigationBarTheme;
          final selectedColor = navTheme.selectedItemColor!;
          final unselectedColor = navTheme.unselectedItemColor!;
          return BottomNavigationBar(
            type: BottomNavigationBarType.fixed,
            currentIndex: navigationShell.currentIndex,
            onTap: (index) {
              navigationShell.goBranch(
                index,
                initialLocation: index == navigationShell.currentIndex,
              );
            },
            selectedFontSize: 10,
            unselectedFontSize: 10,
            iconSize: 24,
            items: [
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.home(color: unselectedColor, size: 24),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.homeFill(color: selectedColor, size: 24),
                ),
                label: 'ホーム',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.clipboardTick(
                    color: unselectedColor,
                    size: 24,
                  ),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.clipboardTickFill(
                    color: selectedColor,
                    size: 24,
                  ),
                ),
                label: '応募状況',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.send(color: unselectedColor, size: 24),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.sendFill(color: selectedColor, size: 24),
                ),
                label: 'メッセージ',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.tickCircle(color: unselectedColor, size: 24),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.tickCircleFill(
                    color: selectedColor,
                    size: 24,
                  ),
                ),
                label: 'TODO',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.user(color: unselectedColor, size: 24),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.userFill(color: selectedColor, size: 24),
                ),
                label: 'マイページ',
              ),
            ],
          );
        },
      ),
    );
  }
}

/// 通知アイコンボタン（未読バッジ付き）
class _NotificationIconButton extends ConsumerWidget {
  const _NotificationIconButton();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCount = ref.watch(unreadNotificationCountProvider);
    final iconColor = Theme.of(context).appBarTheme.foregroundColor;

    return IconButton(
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          AppIcons.notification(color: iconColor),
          if (unreadCount.valueOrNull != null && unreadCount.valueOrNull! > 0)
            Positioned(
              right: -4,
              top: -4,
              child: CountBadge(count: unreadCount.valueOrNull!, size: 16),
            ),
        ],
      ),
      onPressed: () {
        context.push(AppRoutes.notifications);
      },
    );
  }
}
