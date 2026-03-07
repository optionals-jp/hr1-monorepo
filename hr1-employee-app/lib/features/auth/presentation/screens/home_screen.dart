import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../providers/auth_providers.dart';

/// ホーム画面（BottomNavigationBar付きのシェル）
/// 社員向け: ポータル / メッセージ / マイページ
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key, required this.navigationShell});

  /// StatefulShellRoute のナビゲーションシェル
  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          user?.organizationName ?? 'HR1',
          style: AppTextStyles.subtitle,
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: AppIcons.svg(AppIcons.notification,
                color: Theme.of(context).appBarTheme.foregroundColor),
            onPressed: () {
              // TODO: 通知画面へ遷移
            },
          ),
        ],
      ),
      body: navigationShell,
      bottomNavigationBar: Builder(builder: (context) {
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
              icon: AppIcons.svg(AppIcons.home, color: unselectedColor),
              activeIcon:
                  AppIcons.svg(AppIcons.homeFill, color: selectedColor),
              label: 'ポータル',
            ),
            BottomNavigationBarItem(
              icon: AppIcons.svg(AppIcons.note, color: unselectedColor),
              activeIcon:
                  AppIcons.svg(AppIcons.noteFill, color: selectedColor),
              label: 'メッセージ',
            ),
            BottomNavigationBarItem(
              icon: AppIcons.svg(AppIcons.user, color: unselectedColor),
              activeIcon:
                  AppIcons.svg(AppIcons.userFill, color: selectedColor),
              label: 'マイページ',
            ),
          ],
        );
      }),
    );
  }
}
