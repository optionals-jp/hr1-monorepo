import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
import 'core/config/app_config.dart';

/// HR1 応募者アプリのエントリーポイント
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 日本語ロケールデータ初期化
  await initializeDateFormatting('ja');

  // Supabase 初期化
  await Supabase.initialize(
    url: AppConfig.current.supabaseUrl,
    anonKey: AppConfig.current.supabaseAnonKey,
  );

  runApp(
    const ProviderScope(
      child: HR1App(),
    ),
  );
}
