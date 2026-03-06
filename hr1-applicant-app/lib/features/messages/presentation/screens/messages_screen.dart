import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/widgets/empty_state.dart';

/// メッセージ画面
/// 応募先企業とのメッセージ一覧
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: メッセージ一覧を取得して表示
    return const EmptyState(
      icon: Icons.chat_bubble_outline,
      title: 'メッセージはありません',
      description: '応募先企業からの連絡がここに表示されます',
    );
  }
}
