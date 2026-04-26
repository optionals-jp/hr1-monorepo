import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/feed/domain/entities/feed_post.dart';
import 'package:hr1_employee_app/features/feed/presentation/providers/feed_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 投稿追加ハーフシート — CommonSheet で表示する新規フィード投稿フォーム。
class FeedNewSheet {
  FeedNewSheet._();

  static Future<void> show(BuildContext context, WidgetRef ref) {
    return CommonSheet.show(
      context: context,
      title: '新規投稿',
      heightFactor: 0.6,
      child: _FeedNewForm(
        onSubmit: ({required String body, String? scope}) {
          final user = ref.read(appUserProvider);
          final initial = (user?.displayName ?? user?.email ?? 'U').substring(
            0,
            1,
          );
          final name = user?.displayName ?? user?.email ?? '自分';
          ref
              .read(feedListProvider.notifier)
              .add(
                FeedPost(
                  id: 'local-${DateTime.now().microsecondsSinceEpoch}',
                  authorInitial: initial,
                  authorColor: AppColors.brand,
                  authorName: name,
                  authorRole: 'メンバー',
                  timeAgo: 'たった今',
                  body: body,
                  likes: 0,
                  comments: 0,
                  scope: scope,
                ),
              );
        },
      ),
    );
  }
}

class _FeedNewForm extends StatefulWidget {
  const _FeedNewForm({required this.onSubmit});

  final void Function({required String body, String? scope}) onSubmit;

  @override
  State<_FeedNewForm> createState() => _FeedNewFormState();
}

class _FeedNewFormState extends State<_FeedNewForm> {
  final _bodyController = TextEditingController();
  String? _scope;
  bool _submitting = false;

  static const _scopes = <String>['全社', '私の部署', 'お知らせ'];

  @override
  void dispose() {
    _bodyController.dispose();
    super.dispose();
  }

  void _submit() {
    final body = _bodyController.text.trim();
    if (body.isEmpty) {
      CommonSnackBar.error(context, '本文を入力してください');
      return;
    }
    setState(() => _submitting = true);
    widget.onSubmit(body: body, scope: _scope);
    CommonSnackBar.show(context, '投稿しました');
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
        AppSpacing.screenHorizontal,
        AppSpacing.lg,
      ),
      children: [
        TextField(
          controller: _bodyController,
          autofocus: true,
          style: AppTextStyles.body2,
          maxLines: 6,
          minLines: 4,
          decoration: InputDecoration(
            hintText: '今、共有したいことは？',
            hintStyle: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          '公開範囲',
          style: AppTextStyles.caption2.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: AppSpacing.xs,
          runSpacing: AppSpacing.xs,
          children: [
            for (final s in _scopes)
              CommonSelectPill(
                label: s,
                color: AppColors.brand,
                selected: _scope == s,
                onTap: () => setState(() => _scope = _scope == s ? null : s),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        CommonButton(
          onPressed: _submit,
          loading: _submitting,
          enabled: !_submitting,
          child: const Text('投稿'),
        ),
      ],
    );
  }
}
