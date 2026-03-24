import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/core/theme/app_theme.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';

/// HR1 アプリケーションのルートウィジェット
class HR1App extends ConsumerStatefulWidget {
  const HR1App({super.key});

  @override
  ConsumerState<HR1App> createState() => _HR1AppState();
}

class _HR1AppState extends ConsumerState<HR1App> {
  StreamSubscription<AuthState>? _authSubscription;

  @override
  void initState() {
    super.initState();
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((
      data,
    ) {
      if (data.event == AuthChangeEvent.signedIn) {
        final router = ref.read(routerProvider);
        router.go(AppRoutes.splash);
      }
    });
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
