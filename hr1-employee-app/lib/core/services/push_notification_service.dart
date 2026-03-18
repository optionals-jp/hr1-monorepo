import 'dart:async';
import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// バックグラウンドメッセージハンドラ（トップレベル関数である必要がある）
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('バックグラウンド通知: ${message.notification?.title}');
}

/// プッシュ通知サービス
class PushNotificationService {
  PushNotificationService._();

  static final _messaging = FirebaseMessaging.instance;
  static final _localNotifications = FlutterLocalNotificationsPlugin();
  static GlobalKey<NavigatorState>? _navigatorKey;
  static StreamSubscription<AuthState>? _authSubscription;

  /// 初期化
  static Future<void> initialize({GlobalKey<NavigatorState>? navigatorKey}) async {
    _navigatorKey = navigatorKey;

    // バックグラウンドハンドラ登録
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // 通知権限リクエスト
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    debugPrint('通知権限: ${settings.authorizationStatus}');

    // APNs トークン取得（iOS）— 準備完了まで待機
    if (Platform.isIOS) {
      for (var i = 0; i < 5; i++) {
        final apnsToken = await _messaging.getAPNSToken();
        if (apnsToken != null) {
          debugPrint('APNs トークン取得完了');
          break;
        }
        debugPrint('APNs トークン待機中... (${i + 1}/5)');
        await Future.delayed(const Duration(seconds: 2));
      }
    }

    // ローカル通知初期化
    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Android 通知チャンネル
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(
          const AndroidNotificationChannel(
            'hr1_notifications',
            'HR1 通知',
            description: 'HR1 アプリの通知',
            importance: Importance.high,
          ),
        );

    // iOS フォアグラウンド通知表示設定
    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // フォアグラウンドメッセージ
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // アプリ起動時の通知タップ
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // アプリ停止中の通知タップ
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }

    // トークンリフレッシュ監視
    _messaging.onTokenRefresh.listen((newToken) => _registerToken(token: newToken));

    // 認証状態の変更を監視（ログイン後にトークン登録）
    _authSubscription?.cancel();
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      if (data.event == AuthChangeEvent.signedIn) {
        debugPrint('ログイン検知 → FCM トークン登録開始');
        _registerToken();
      } else if (data.event == AuthChangeEvent.signedOut) {
        debugPrint('ログアウト検知 → FCM トークン削除');
        removeToken();
      }
    });

    // 既にログイン済みで、まだ onAuthStateChange が発火していない場合に備える
    if (Supabase.instance.client.auth.currentUser != null) {
      await _registerToken();
    }
  }

  /// FCM トークンを Supabase に登録
  static Future<void> _registerToken({String? token}) async {
    try {
      token ??= await _messaging.getToken();
      if (token == null) {
        debugPrint('FCM トークン: 取得できませんでした（シミュレータの場合は正常）');
        return;
      }

      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        debugPrint('FCM トークン: 未ログインのためスキップ');
        return;
      }

      await Supabase.instance.client.rpc('upsert_push_token', params: {
        'p_token': token,
        'p_platform': Platform.isIOS ? 'ios' : 'android',
        'p_app_type': 'employee',
      });
      debugPrint('FCM トークン登録完了: ${token.substring(0, 20)}...');
    } catch (e) {
      debugPrint('FCM トークン登録エラー: $e');
    }
  }

  /// フォアグラウンドメッセージ処理
  static void _handleForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    // iOS は setForegroundNotificationPresentationOptions で表示するため、
    // ローカル通知は Android のみ
    if (Platform.isIOS) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'hr1_notifications',
          'HR1 通知',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: message.data['action_url'],
    );
  }

  /// 通知タップ処理
  static void _handleNotificationTap(RemoteMessage message) {
    final actionUrl = message.data['action_url'];
    _navigateTo(actionUrl);
  }

  /// ローカル通知タップ処理
  static void _onNotificationTapped(NotificationResponse response) {
    _navigateTo(response.payload);
  }

  /// 通知からの画面遷移
  static void _navigateTo(String? path) {
    if (path == null || !path.startsWith('/')) return;
    final context = _navigatorKey?.currentContext;
    if (context == null) return;
    GoRouter.of(context).push(path);
  }

  /// ログアウト時にトークンを削除
  static Future<void> removeToken() async {
    try {
      final token = await _messaging.getToken();
      if (token == null) return;

      await Supabase.instance.client
          .from('push_tokens')
          .delete()
          .eq('token', token);
      debugPrint('FCM トークン削除完了');
    } catch (e) {
      debugPrint('FCM トークン削除エラー: $e');
    }
  }
}
