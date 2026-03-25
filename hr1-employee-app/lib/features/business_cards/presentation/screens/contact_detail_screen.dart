import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_activity.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_deal.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_todo.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/contact_controller.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:url_launcher/url_launcher.dart';

/// 連絡先詳細画面
class BcContactDetailScreen extends ConsumerWidget {
  const BcContactDetailScreen({super.key, required this.contactId});

  final String contactId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contactAsync = ref.watch(contactDetailControllerProvider(contactId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('連絡先詳細'),
      ),
      body: contactAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(
            contactDetailControllerProvider(contactId),
          ),
        ),
        data: (contact) {
          if (contact == null) {
            return const ErrorState(message: '連絡先が見つかりません');
          }
          return _Body(contactId: contactId, contact: contact);
        },
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.contactId, required this.contact});

  final String contactId;
  final dynamic contact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activitiesAsync =
        ref.watch(bcActivitiesByContactProvider(contactId));
    final dealsAsync = ref.watch(bcDealsByContactProvider(contactId));
    final todosAsync = ref.watch(bcMyTodosProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ヘッダー
          Center(
            child: Column(
              children: [
                UserAvatar(
                  initial: contact.lastName[0],
                  size: 64,
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(contact.fullName, style: AppTextStyles.title2),
                if (contact.company?.name != null)
                  Text(
                    contact.company!.name,
                    style: AppTextStyles.body1.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                if (contact.position != null || contact.department != null)
                  Text(
                    [contact.department, contact.position]
                        .where((e) => e != null)
                        .join(' / '),
                    style: AppTextStyles.caption1.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.lg),

          // 連絡先アクション
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              if (contact.phone != null)
                _ActionButton(
                  icon: Icons.phone,
                  label: '電話',
                  onTap: () =>
                      launchUrl(Uri.parse('tel:${contact.phone}')),
                ),
              if (contact.email != null)
                _ActionButton(
                  icon: Icons.email,
                  label: 'メール',
                  onTap: () =>
                      launchUrl(Uri.parse('mailto:${contact.email}')),
                ),
              _ActionButton(
                icon: Icons.note_add,
                label: 'メモ',
                onTap: () => context.push(
                  AppRoutes.bcActivityForm,
                  extra: {'contactId': contactId, 'type': 'memo'},
                ),
              ),
              _ActionButton(
                icon: Icons.event,
                label: 'アポ',
                onTap: () => context.push(
                  AppRoutes.bcActivityForm,
                  extra: {'contactId': contactId, 'type': 'appointment'},
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.lg),

          // 基本情報
          GroupedSection(
            title: '基本情報',
            children: [
              if (contact.email != null)
                MenuRow(
                  icon: Icons.email,
                  label: 'メール',
                  title: contact.email!,
                ),
              if (contact.phone != null)
                MenuRow(
                  icon: Icons.phone,
                  label: '電話',
                  title: contact.phone!,
                ),
              if (contact.mobilePhone != null)
                MenuRow(
                  icon: Icons.smartphone,
                  label: '携帯',
                  title: contact.mobilePhone!,
                ),
              if (contact.company != null)
                MenuRow(
                  icon: Icons.business,
                  label: '会社',
                  title: contact.company!.name,
                  onTap: () => context.push(
                    AppRoutes.bcCompanyDetail,
                    extra: contact.companyId,
                  ),
                ),
            ],
          ),

          const SizedBox(height: AppSpacing.md),

          // 商談
          dealsAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (deals) {
              if (deals.isEmpty) return const SizedBox.shrink();
              return _DealsSection(deals: deals);
            },
          ),

          // 活動履歴
          activitiesAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (activities) {
              if (activities.isEmpty) return const SizedBox.shrink();
              return _ActivitiesSection(activities: activities);
            },
          ),

          // TODO
          todosAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (todos) {
              final contactTodos = todos
                  .where((t) => t.contactId == contactId)
                  .toList();
              if (contactTodos.isEmpty) return const SizedBox.shrink();
              return _TodosSection(todos: contactTodos);
            },
          ),

          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.brand.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: AppColors.brand),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(label, style: AppTextStyles.caption1),
          ],
        ),
      ),
    );
  }
}

class _DealsSection extends StatelessWidget {
  const _DealsSection({required this.deals});

  final List<BcDeal> deals;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('商談（${deals.length}件）', style: AppTextStyles.headline),
        const SizedBox(height: AppSpacing.xs),
        ...deals.map((deal) => CommonCard(
              child: ListTile(
                title: Text(deal.title, style: AppTextStyles.body1),
                subtitle: Text(
                  '${deal.status.label} / ${deal.stage.label}',
                  style: AppTextStyles.caption1,
                ),
                trailing: deal.amount != null
                    ? Text(
                        '¥${_formatAmount(deal.amount!)}',
                        style: AppTextStyles.body1,
                      )
                    : null,
                onTap: () => context.push(
                  AppRoutes.bcDealDetail,
                  extra: deal.id,
                ),
              ),
            )),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }

  String _formatAmount(int amount) {
    return amount.toString().replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]},',
        );
  }
}

class _ActivitiesSection extends StatelessWidget {
  const _ActivitiesSection({required this.activities});

  final List<BcActivity> activities;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('活動履歴（${activities.length}件）',
            style: AppTextStyles.headline),
        const SizedBox(height: AppSpacing.xs),
        ...activities.take(5).map((activity) => CommonCard(
              child: ListTile(
                leading: Icon(
                  _activityIcon(activity.activityType),
                  color: AppColors.brand,
                ),
                title: Text(activity.title, style: AppTextStyles.body1),
                subtitle: Text(
                  activity.activityType.label,
                  style: AppTextStyles.caption1,
                ),
              ),
            )),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }

  IconData _activityIcon(ActivityType type) {
    switch (type) {
      case ActivityType.appointment:
        return Icons.event;
      case ActivityType.memo:
        return Icons.note;
      case ActivityType.call:
        return Icons.phone;
      case ActivityType.email:
        return Icons.email;
      case ActivityType.visit:
        return Icons.directions_walk;
    }
  }
}

class _TodosSection extends StatelessWidget {
  const _TodosSection({required this.todos});

  final List<BcTodo> todos;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('TODO（${todos.length}件）', style: AppTextStyles.headline),
        const SizedBox(height: AppSpacing.xs),
        ...todos.map((todo) => CommonCard(
              child: ListTile(
                leading: Icon(
                  todo.isCompleted
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: todo.isCompleted ? AppColors.success : null,
                ),
                title: Text(
                  todo.title,
                  style: AppTextStyles.body1.copyWith(
                    decoration: todo.isCompleted
                        ? TextDecoration.lineThrough
                        : null,
                  ),
                ),
                subtitle: todo.dueDate != null
                    ? Text(
                        '期限: ${todo.dueDate!.month}/${todo.dueDate!.day}',
                        style: AppTextStyles.caption1.copyWith(
                          color: todo.isOverdue ? AppColors.error : null,
                        ),
                      )
                    : null,
              ),
            )),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }
}
