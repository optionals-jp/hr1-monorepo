import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../providers/auth_providers.dart';

/// ホーム画面（BottomNavigationBar付きのシェル）— Teams モバイルスタイル
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          user?.organizationName ?? 'HR1',
          style: AppTextStyles.subtitle.copyWith(letterSpacing: -0.2),
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: AppIcons.svg(
              AppIcons.notification,
              color: theme.appBarTheme.foregroundColor,
              size: 22,
            ),
            onPressed: () {
              // TODO: 通知画面へ遷移
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: theme.colorScheme.outlineVariant,
              width: 0.5,
            ),
          ),
        ),
        child: Builder(builder: (context) {
          final navTheme = theme.bottomNavigationBarTheme;
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
            selectedFontSize: 10,
            unselectedFontSize: 10,
            iconSize: 24,
            type: BottomNavigationBarType.fixed,
            items: [
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.svg(AppIcons.home,
                      color: unselectedColor, size: 24),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.svg(AppIcons.homeFill,
                      color: selectedColor, size: 24),
                ),
                label: 'ホーム',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Icon(Icons.calendar_today_outlined,
                      color: unselectedColor, size: 22),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Icon(Icons.calendar_today_rounded,
                      color: selectedColor, size: 22),
                ),
                label: 'カレンダー',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.svg(AppIcons.note,
                      color: unselectedColor, size: 24),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.svg(AppIcons.noteFill,
                      color: selectedColor, size: 24),
                ),
                label: 'チャット',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Icon(Icons.check_circle_outline_rounded,
                      color: unselectedColor, size: 22),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Icon(Icons.check_circle_rounded,
                      color: selectedColor, size: 22),
                ),
                label: 'タスク',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.svg(AppIcons.user,
                      color: unselectedColor, size: 24),
                ),
                activeIcon: Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: AppIcons.svg(AppIcons.userFill,
                      color: selectedColor, size: 24),
                ),
                label: 'その他',
              ),
            ],
          );
        }),
      ),
    );
  }
}
