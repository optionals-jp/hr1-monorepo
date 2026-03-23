import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/theme/app_theme.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';

/// HR1 社員アプリのルートウィジェット
class HR1App extends ConsumerWidget {
  const HR1App({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
