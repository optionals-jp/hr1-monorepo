import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/contact_controller.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 連絡先一覧画面
class BcContactsScreen extends HookConsumerWidget {
  const BcContactsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contactsAsync = ref.watch(contactListControllerProvider);
    final searchCtl = useTextEditingController();
    final debounceTimer = useRef<Timer?>(null);

    void onSearch(String query) {
      debounceTimer.value?.cancel();
      debounceTimer.value = Timer(const Duration(milliseconds: 300), () {
        ref.read(contactListControllerProvider.notifier).search(query);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('連絡先'),
        actions: [
          IconButton(
            icon: const Icon(Icons.camera_alt),
            onPressed: () => context.push(AppRoutes.bcScan),
            tooltip: '名刺スキャン',
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: SearchBox(
              controller: searchCtl,
              hintText: '名前・メール・会社名で検索',
              onChanged: onSearch,
            ),
          ),
          Expanded(
            child: contactsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorState(
                onRetry: () =>
                    ref.invalidate(contactListControllerProvider),
              ),
              data: (contacts) {
                if (contacts.isEmpty) {
                  return const EmptyState(
                    icon: Icons.contacts,
                    title: '連絡先がありません',
                    subtitle: '名刺をスキャンして連絡先を追加しましょう',
                  );
                }
                return ListView.builder(
                  itemCount: contacts.length,
                  itemBuilder: (context, index) =>
                      _ContactTile(contact: contacts[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactTile extends StatelessWidget {
  const _ContactTile({required this.contact});

  final BcContact contact;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: UserAvatar(
        initial: contact.lastName.isNotEmpty ? contact.lastName[0] : '?',
        size: 40,
      ),
      title: Text(
        contact.fullName,
        style: AppTextStyles.body1,
      ),
      subtitle: Text(
        [
          if (contact.company?.name != null) contact.company!.name,
          if (contact.position != null) contact.position,
        ].join(' / '),
        style: AppTextStyles.caption1.copyWith(
          color: AppColors.textSecondary(context),
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Icon(
        Icons.chevron_right,
        color: AppColors.textTertiary(context),
      ),
      onTap: () => context.push(
        AppRoutes.bcContactDetail,
        extra: contact.id,
      ),
    );
  }
}
