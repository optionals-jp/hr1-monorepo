import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../../shared/widgets/user_avatar.dart';
import '../../../messages/domain/entities/message_thread.dart';
import '../../../skills/presentation/providers/skills_providers.dart';
import '../../domain/entities/employee_contact.dart';

/// WorkStatus → PresenceStatus 変換
PresenceStatus _toPresence(WorkStatus status) {
  switch (status) {
    case WorkStatus.working:
      return PresenceStatus.available;
    case WorkStatus.onBreak:
      return PresenceStatus.away;
    case WorkStatus.offline:
      return PresenceStatus.offline;
  }
}

/// 社員プロフィール詳細画面 — Teams プロフィールカードスタイル（タブ付き）
class EmployeeDetailScreen extends StatelessWidget {
  const EmployeeDetailScreen({super.key, required this.contact});

  final EmployeeContact contact;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(title: const Text('プロフィール')),
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) {
            return [
              SliverToBoxAdapter(child: _ProfileHeader(contact: contact)),
              SliverPersistentHeader(
                pinned: true,
                delegate: _TabBarDelegate(
                  TabBar(
                    tabs: const [
                      Tab(text: '連絡先'),
                      Tab(text: '経歴'),
                      Tab(text: 'スキル'),
                    ],
                    labelStyle: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    unselectedLabelStyle: AppTextStyles.caption1,
                    indicatorColor: AppColors.brandPrimary,
                    labelColor: AppColors.brandPrimary,
                    unselectedLabelColor: AppColors.textSecondary(
                      Theme.of(context).brightness,
                    ),
                    dividerHeight: 0.5,
                  ),
                ),
              ),
            ];
          },
          body: TabBarView(
            children: [
              _ContactTab(contact: contact),
              const _CareerTab(),
              _SkillsTab(userId: contact.id),
            ],
          ),
        ),
      ),
    );
  }
}

/// プロフィールヘッダー（アバター + 名前 + アクションボタン）
class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.contact});

  final EmployeeContact contact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Column(
        children: [
          UserAvatar(
            initial: contact.initial,
            color: contact.color,
            size: 96,
            imageUrl: contact.avatarUrl,
            presence: _toPresence(contact.workStatus),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(contact.name, style: AppTextStyles.title1),
          const SizedBox(height: 4),
          Text(
            '${contact.department} / ${contact.position}',
            style: AppTextStyles.caption1.copyWith(
              color: AppColors.textSecondary(theme.brightness),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          _WorkStatusBadge(status: contact.workStatus),
          const SizedBox(height: AppSpacing.xl),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _ActionButton(
                icon: AppIcons.directbox(
                  size: 22,
                  color: AppColors.brandPrimary,
                ),
                label: 'チャット',
                color: AppColors.brandPrimary,
                onTap: () {
                  final thread = MessageThread(
                    id: 'thread_${contact.id}',
                    organizationId: '',
                    participantId: contact.id,
                    participantType: 'employee',
                    participantName: contact.name,
                    createdAt: DateTime.now(),
                    updatedAt: DateTime.now(),
                  );
                  context.push(AppRoutes.chat, extra: thread);
                },
              ),
              const SizedBox(width: AppSpacing.xxl),
              _ActionButton(
                icon: AppIcons.call(size: 22, color: AppColors.success),
                label: '電話',
                color: AppColors.success,
                onTap: () {},
              ),
              const SizedBox(width: AppSpacing.xxl),
              _ActionButton(
                icon: Icon(
                  Icons.email_outlined,
                  size: 22,
                  color: AppColors.warning,
                ),
                label: 'メール',
                color: AppColors.warning,
                onTap: () {},
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// タブバー用の SliverPersistentHeaderDelegate
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate(this.tabBar);

  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    final theme = Theme.of(context);
    return Container(color: theme.scaffoldBackgroundColor, child: tabBar);
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => false;
}

// ─────────────────────────────────────────
// 連絡先タブ
// ─────────────────────────────────────────

class _ContactTab extends StatelessWidget {
  const _ContactTab({required this.contact});

  final EmployeeContact contact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      children: [
        _InfoSection(
          title: '基本情報',
          children: [
            _InfoRow(
              icon: AppIcons.briefcase(
                size: 22,
                color: AppColors.textSecondary(theme.brightness),
              ),
              label: '部署',
              value: contact.department,
            ),
            _InfoRow(
              icon: Icon(
                Icons.badge_outlined,
                size: 22,
                color: AppColors.textSecondary(theme.brightness),
              ),
              label: '役職',
              value: contact.position,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        _InfoSection(
          title: '連絡先',
          children: [
            if (contact.email != null)
              _InfoRow(
                icon: Icon(
                  Icons.email_outlined,
                  size: 22,
                  color: AppColors.textSecondary(theme.brightness),
                ),
                label: 'メール',
                value: contact.email!,
              ),
            if (contact.phone != null)
              _InfoRow(
                icon: Icon(
                  Icons.phone_outlined,
                  size: 22,
                  color: AppColors.textSecondary(theme.brightness),
                ),
                label: '電話番号',
                value: contact.phone!,
              ),
          ],
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────
// 経歴タブ
// ─────────────────────────────────────────

class _CareerTab extends StatelessWidget {
  const _CareerTab();

  @override
  Widget build(BuildContext context) {
    // ダミーデータ
    final projects = [
      _ProjectHistory(
        title: '社内HR管理システム刷新',
        role: 'プロジェクトリーダー',
        period: '2025/04 〜 現在',
        description: '社内人事管理システムのフルリニューアル。要件定義から運用設計まで担当。',
      ),
      _ProjectHistory(
        title: '顧客管理CRM導入',
        role: 'サブリーダー',
        period: '2024/01 〜 2025/03',
        description: 'Salesforce導入プロジェクト。データ移行およびカスタマイズを主導。',
      ),
      _ProjectHistory(
        title: '基幹システム保守運用',
        role: 'メンバー',
        period: '2022/04 〜 2023/12',
        description: '既存基幹システムの保守運用および障害対応を担当。',
      ),
    ];

    final careers = [
      _CareerHistory(title: '営業部 部長', period: '2024/04 〜 現在'),
      _CareerHistory(title: '営業部 課長', period: '2022/04 〜 2024/03'),
      _CareerHistory(title: '企画部 主任', period: '2019/04 〜 2022/03'),
      _CareerHistory(title: '企画部 一般社員', period: '2016/04 〜 2019/03'),
    ];

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      children: [
        _SectionHeader(title: 'プロジェクト経歴'),
        ...projects.map((p) => _ProjectCard(project: p)),
        const SizedBox(height: AppSpacing.lg),
        _SectionHeader(title: '社内異動歴'),
        _InfoSection(
          children: careers.map((c) => _CareerRow(career: c)).toList(),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────
// スキルタブ
// ─────────────────────────────────────────

class _SkillsTab extends ConsumerWidget {
  const _SkillsTab({required this.userId});

  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final skillsAsync = ref.watch(userSkillsProvider(userId));
    final certsAsync = ref.watch(userCertificationsProvider(userId));

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      children: [
        _SectionHeader(title: 'スキル'),
        skillsAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(AppSpacing.xl),
            child: LoadingIndicator(),
          ),
          error: (e, _) => Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Center(child: Text('エラー: $e')),
          ),
          data: (skills) {
            if (skills.isEmpty) {
              return Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Center(
                  child: Text(
                    'スキルが登録されていません',
                    style: AppTextStyles.caption1.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.45,
                      ),
                    ),
                  ),
                ),
              );
            }
            return Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal,
              ),
              child: Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: skills.map((skill) {
                  return Chip(
                    label: Text(
                      skill.name,
                      style: AppTextStyles.caption1.copyWith(
                        fontWeight: FontWeight.w500,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    backgroundColor: AppColors.brandPrimary.withValues(
                      alpha: 0.08,
                    ),
                    side: BorderSide(
                      color: AppColors.brandPrimary.withValues(alpha: 0.2),
                      width: 0.5,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  );
                }).toList(),
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.xxl),
        _SectionHeader(title: '資格・認定'),
        certsAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(AppSpacing.xl),
            child: LoadingIndicator(),
          ),
          error: (e, _) => Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Center(child: Text('エラー: $e')),
          ),
          data: (certs) {
            if (certs.isEmpty) {
              return Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Center(
                  child: Text(
                    '資格が登録されていません',
                    style: AppTextStyles.caption1.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.45,
                      ),
                    ),
                  ),
                ),
              );
            }
            return _InfoSection(
              children: certs
                  .map(
                    (c) => _InfoRow(
                      icon: AppIcons.award(
                        size: 22,
                        color: AppColors.textSecondary(theme.brightness),
                      ),
                      label: c.acquiredDate != null
                          ? DateFormat('yyyy/MM').format(c.acquiredDate!)
                          : '-',
                      value: c.score != null ? '${c.name} ${c.score}点' : c.name,
                    ),
                  )
                  .toList(),
            );
          },
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────
// 共通ウィジェット
// ─────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal + 4,
        0,
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
      ),
      child: Text(
        title,
        style: AppTextStyles.caption2.copyWith(
          color: AppColors.textSecondary(theme.brightness),
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection({this.title, required this.children});

  final String? title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null) _SectionHeader(title: title!),
        Container(
          margin: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
          ),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: isDark
                ? Border.all(
                    color: theme.colorScheme.outline.withValues(alpha: 0.2),
                    width: 0.5,
                  )
                : null,
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 3,
                      offset: const Offset(0, 1),
                    ),
                  ],
          ),
          child: Column(
            children: [
              for (var i = 0; i < children.length; i++) ...[
                children[i],
                if (i < children.length - 1)
                  Divider(
                    height: 0.5,
                    indent: 52,
                    color: theme.colorScheme.outlineVariant,
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final Widget icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      child: Row(
        children: [
          icon,
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                ),
                const SizedBox(height: 2),
                Text(value, style: AppTextStyles.caption1),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final Widget icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Center(child: icon),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: AppTextStyles.caption1.copyWith(
              fontWeight: FontWeight.w500,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}

/// プロジェクト経歴カード
class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project});

  final _ProjectHistory project;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        0,
        AppSpacing.screenHorizontal,
        AppSpacing.md,
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: isDark
            ? Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.2),
                width: 0.5,
              )
            : null,
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 3,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            project.title,
            style: AppTextStyles.caption1.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              AppIcons.user(
                size: 14,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
              ),
              const SizedBox(width: 4),
              Text(
                project.role,
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.brandPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              AppIcons.calendar(
                size: 12,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
              ),
              const SizedBox(width: 4),
              Text(
                project.period,
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(theme.brightness),
                ),
              ),
            ],
          ),
          if (project.description != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              project.description!,
              style: AppTextStyles.caption2.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                height: 1.5,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// 異動歴行
class _CareerRow extends StatelessWidget {
  const _CareerRow({required this.career});

  final _CareerHistory career;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: AppColors.brandPrimary.withValues(alpha: 0.6),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(career.title, style: AppTextStyles.caption1),
                const SizedBox(height: 2),
                Text(
                  career.period,
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// データクラス
// ─────────────────────────────────────────

class _ProjectHistory {
  const _ProjectHistory({
    required this.title,
    required this.role,
    required this.period,
    this.description,
  });

  final String title;
  final String role;
  final String period;
  final String? description;
}

class _CareerHistory {
  const _CareerHistory({required this.title, required this.period});

  final String title;
  final String period;
}

/// 勤務ステータスバッジ — Teams プレゼンスラベル風
class _WorkStatusBadge extends StatelessWidget {
  const _WorkStatusBadge({required this.status});

  final WorkStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      WorkStatus.working => ('勤務中', const Color(0xFF0E7A0B)),
      WorkStatus.onBreak => ('休憩中', const Color(0xFFEAA300)),
      WorkStatus.offline => ('退勤済み', Colors.grey),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: AppTextStyles.caption1.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
