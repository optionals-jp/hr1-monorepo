import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_icons.dart';

/// ホーム画面（BottomNavigationBar付きのシェル）— Teams モバイルスタイル
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
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
        child: Builder(
          builder: (context) {
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
                    child: AppIcons.calendar(color: unselectedColor, size: 24),
                  ),
                  activeIcon: Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: AppIcons.calendarFill(
                      color: selectedColor,
                      size: 24,
                    ),
                  ),
                  label: 'カレンダー',
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
                  label: 'チャット',
                ),
                BottomNavigationBarItem(
                  icon: Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: AppIcons.tickCircle(
                      color: unselectedColor,
                      size: 24,
                    ),
                  ),
                  activeIcon: Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: AppIcons.tickCircleFill(
                      color: selectedColor,
                      size: 24,
                    ),
                  ),
                  label: 'タスク',
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
                  label: 'その他',
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
