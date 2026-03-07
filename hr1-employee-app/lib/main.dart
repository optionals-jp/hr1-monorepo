import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';

/// HR1 社員アプリのエントリーポイント
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Supabase 初期化
  await Supabase.initialize(
    url: const String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: 'https://xmwdtnzfuokgaaffpsay.supabase.co',
    ),
    anonKey: const String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtd2R0bnpmdW9rZ2FhZmZwc2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzIxMzgsImV4cCI6MjA4ODMwODEzOH0.d4iZRx8lESKODLPBXAX7oQ1FheQrhqkJZK1VJjFe5h8',
    ),
  );

  // Riverpod の ProviderScope でアプリ全体をラップ
  runApp(
    const ProviderScope(
      child: HR1App(),
    ),
  );
}
