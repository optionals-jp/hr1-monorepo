import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';

/// 応募詳細画面のコントローラー
///
/// Realtime でステップ変更を購読し、データを自動更新する。
class ApplicationDetailController
    extends AutoDisposeFamilyNotifier<void, String> {
  RealtimeChannel? _channel;

  @override
  void build(String arg) {
    final client = ref.watch(supabaseClientProvider);

    // Realtime subscription を設定
    _channel = client
        .channel('application_steps:$arg')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'application_steps',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'application_id',
            value: arg,
          ),
          callback: (payload) {
            ref.invalidate(applicationDetailProvider(arg));
          },
        )
        .subscribe();

    // dispose 時にチャネルを解除
    ref.onDispose(() {
      if (_channel != null) {
        client.removeChannel(_channel!);
        _channel = null;
      }
    });
  }
}

/// 応募詳細コントローラープロバイダー
final applicationDetailControllerProvider = NotifierProvider.autoDispose
    .family<ApplicationDetailController, void, String>(
      ApplicationDetailController.new,
    );
