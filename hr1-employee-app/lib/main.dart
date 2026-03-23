import 'dart:ui';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
import 'core/config/app_config.dart';
import 'core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart' show PushNotificationService;

/// HR1 社員アプリのエントリーポイント
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 日本語ロケールデータ初期化
  await initializeDateFormatting('ja');

  // Firebase 初期化
  try {
    await Firebase.initializeApp();
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
    debugPrint('Firebase 初期化完了');
  } catch (e) {
    debugPrint('Firebase 初期化エラー: $e');
  }

  // Supabase 初期化
  await Supabase.initialize(
    url: AppConfig.current.supabaseUrl,
    anonKey: AppConfig.current.supabaseAnonKey,
  );
  debugPrint('Supabase 初期化完了');

  // プッシュ通知初期化（Firebase 初期化成功時のみ）
  try {
    await PushNotificationService.initialize(
      navigatorKey: rootNavigatorKey,
      appType: 'employee',
    );
    debugPrint('プッシュ通知初期化完了');
  } catch (e) {
    debugPrint('プッシュ通知初期化エラー: $e');
  }

  runApp(const ProviderScope(child: HR1App()));
}
