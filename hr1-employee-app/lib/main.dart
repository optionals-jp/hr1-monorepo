import 'dart:async';
import 'dart:ui';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/app.dart';
import 'package:hr1_employee_app/core/config/app_config.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart'
    show PushNotificationService, firebaseMessagingBackgroundHandler;

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
    // バックグラウンドメッセージハンドラは runApp 前に同期登録する必要がある
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    debugPrint('Firebase 初期化完了');
  } catch (e) {
    debugPrint('Firebase 初期化エラー: $e');
  }

  // Supabase 初期化（招待メールのディープリンク対応）
  await Supabase.initialize(
    url: AppConfig.current.supabaseUrl,
    anonKey: AppConfig.current.supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );
  debugPrint('Supabase 初期化完了');

  // プッシュ通知初期化は起動をブロックしない（APNs 取得が遅延しても splash を表示するため）
  // 例外は PlatformDispatcher.onError → Crashlytics に流れる
  unawaited(
    PushNotificationService.initialize(
      navigatorKey: rootNavigatorKey,
      appType: 'employee',
    ),
  );

  runApp(const ProviderScope(child: HR1App()));
}
