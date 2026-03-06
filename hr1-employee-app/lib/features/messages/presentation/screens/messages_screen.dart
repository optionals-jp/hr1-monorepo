import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/widgets/empty_state.dart';

/// メッセージ画面
/// 社内メッセージ・連絡の一覧
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: メッセージ一覧を取得して表示
    return const EmptyState(
      icon: Icons.chat_bubble_outline,
      title: 'メッセージはありません',
      description: '社内連絡やお知らせがここに表示されます',
    );
  }
}
