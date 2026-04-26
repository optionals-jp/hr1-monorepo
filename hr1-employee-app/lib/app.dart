import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/theme/app_theme.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';

/// HR1 社員アプリのルートウィジェット
class HR1App extends ConsumerWidget {
  const HR1App({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // サインイン直後にスプラッシュへ戻して再ガードを走らせる。
    ref.listen(authStateProvider, (previous, next) {
      final wasSignedIn = previous?.valueOrNull ?? false;
      final isSignedIn = next.valueOrNull ?? false;
      if (!wasSignedIn && isSignedIn) {
        ref.read(routerProvider).go(AppRoutes.splash);
      }
    });

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'HR1',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
    );
  }
}
