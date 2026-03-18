import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../shared/widgets/organization_switcher.dart';
import '../providers/organization_context_provider.dart';

/// ホーム画面（BottomNavigationBar付きのシェル）
/// 応募者向け: ホーム / 応募状況 / メッセージ / マイページ
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key, required this.navigationShell});

  /// StatefulShellRoute のナビゲーションシェル
  final StatefulNavigationShell navigationShell;

  static const _tabTitles = ['', '応募状況', 'メッセージ', 'マイページ'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentOrg = ref.watch(currentOrganizationProvider);
    final isCompanyTab = navigationShell.currentIndex == 0;

    return Scaffold(
      appBar: AppBar(
        // 企業切り替えはホーム（企業）タブのみ
        title: isCompanyTab
            ? const OrganizationSwitcher()
            : Text(_tabTitles[navigationShell.currentIndex]),
        centerTitle: !isCompanyTab,
        actions: currentOrg != null
            ? [
                IconButton(
                  icon: AppIcons.notification(
                    color: Theme.of(context).appBarTheme.foregroundColor,
                  ),
                  onPressed: () {
                    // TODO: 通知画面へ遷移
                  },
                ),
              ]
            : null,
      ),
      body: navigationShell,
      bottomNavigationBar: Builder(
        builder: (context) {
          final navTheme = Theme.of(context).bottomNavigationBarTheme;
          final selectedColor = navTheme.selectedItemColor!;
          final unselectedColor = navTheme.unselectedItemColor!;
          return BottomNavigationBar(
            currentIndex: navigationShell.currentIndex,
            onTap: (index) {
              navigationShell.goBranch(
                index,
                initialLocation: index == navigationShell.currentIndex,
              );
            },
            selectedFontSize: 11,
            unselectedFontSize: 11,
            iconSize: 24,
            items: [
              BottomNavigationBarItem(
                icon: AppIcons.home(color: unselectedColor),
                activeIcon: AppIcons.homeFill(color: selectedColor),
                label: 'ホーム',
              ),
              BottomNavigationBarItem(
                icon: const Icon(Icons.assignment_outlined),
                activeIcon: const Icon(Icons.assignment),
                label: '応募状況',
              ),
              BottomNavigationBarItem(
                icon: AppIcons.note(color: unselectedColor),
                activeIcon: AppIcons.noteFill(color: selectedColor),
                label: 'メッセージ',
              ),
              BottomNavigationBarItem(
                icon: AppIcons.user(color: unselectedColor),
                activeIcon: AppIcons.userFill(color: selectedColor),
                label: 'マイページ',
              ),
            ],
          );
        },
      ),
    );
  }
}
