import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
import 'core/router/app_router.dart';

/// HR1 アプリケーションのエントリーポイント
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 開発モードではSupabase初期化をスキップ
  if (!kDevMode) {
    await Supabase.initialize(
      url: const String.fromEnvironment('SUPABASE_URL'),
      anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
    );
  }

  // Riverpod の ProviderScope でアプリ全体をラップ
  runApp(
    const ProviderScope(
      child: HR1App(),
    ),
  );
}
