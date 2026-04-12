import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';
import 'package:hr1_employee_app/features/employees/presentation/providers/employee_list_providers.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/search/domain/entities/portal_search_results.dart';
import 'package:hr1_employee_app/features/search/presentation/providers/search_providers.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:intl/intl.dart';

class SearchScreen extends HookConsumerWidget {
  const SearchScreen({super.key});

  static void show(BuildContext context) {
    context.push(AppRoutes.search);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = useTextEditingController();
    final focusNode = useFocusNode();
    final recentSearches = useState(<String>[]);
    final searchState = ref.watch(searchControllerProvider);
    final employeesAsync = ref.watch(employeeListProvider);
    final debounceTimer = useRef<Timer?>(null);

    ref.listen(searchControllerProvider, (prev, next) {
      if (next.hasError && context.mounted) {
        CommonSnackBar.error(context, '検索中にエラーが発生しました');
      }
    });

    useEffect(() {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        focusNode.requestFocus();
      });
      return () => debounceTimer.value?.cancel();
    }, []);

    void onSearch(String query) {
      if (query.trim().isEmpty) {
        ref.read(searchControllerProvider.notifier).clear();
        return;
      }
      final trimmed = query.trim();
      recentSearches.value = [
        trimmed,
        ...recentSearches.value.where((s) => s != trimmed),
      ].take(10).toList();
      ref.read(searchControllerProvider.notifier).search(trimmed);
    }

    void onChanged(String value) {
      debounceTimer.value?.cancel();
      if (value.trim().isEmpty) {
        ref.read(searchControllerProvider.notifier).clear();
        return;
      }
      debounceTimer.value = Timer(const Duration(milliseconds: 300), () {
        onSearch(value);
      });
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // 検索バー
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: SearchBox(
                      controller: controller,
                      focusNode: focusNode,
                      onSubmitted: onSearch,
                      onChanged: onChanged,
                      onClear: () =>
                          ref.read(searchControllerProvider.notifier).clear(),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xs,
                        vertical: AppSpacing.sm,
                      ),
                      child: Text(
                        'キャンセル',
                        style: AppTextStyles.body1.copyWith(
                          color: AppColors.brand,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // コンテンツ
            Expanded(
              child: () {
                if (searchState.hasError && !searchState.hasValue) {
                  return ErrorState(
                    message: '検索中にエラーが発生しました',
                    onRetry: () => onSearch(controller.text),
                  );
                }
                final results = searchState.valueOrNull;
                if (results != null) {
                  return _SearchResultsView(
                    results: results,
                    query: controller.text,
                  );
                }
                return ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    _buildAvatarCarousel(context, employeesAsync),
                    if (recentSearches.value.isNotEmpty)
                      _buildRecentSearches(
                        context,
                        recentSearches.value,
                        controller,
                        onSearch,
                      ),
                  ],
                );
              }(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarCarousel(
    BuildContext context,
    AsyncValue<List<EmployeeContact>> employeesAsync,
  ) {
    final allEmployees = employeesAsync.valueOrNull;

    if (allEmployees == null) return const SizedBox.shrink();

    final contacts = allEmployees.take(10).toList();
    if (contacts.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.lg,
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
          ),
          child: Text(
            'よく連絡する人',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            itemCount: contacts.length,
            separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.lg),
            itemBuilder: (context, index) {
              final contact = contacts[index];
              return GestureDetector(
                onTap: () {
                  context.push(AppRoutes.employeeDetail, extra: contact);
                },
                child: SizedBox(
                  width: 80,
                  child: Column(
                    children: [
                      UserAvatar(
                        initial: contact.initial,
                        color: contact.color,
                        size: 72,
                        presence: _toPresence(contact.workStatus),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        contact.name.split(' ').first,
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textPrimary(context),
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                      Text(
                        '${contact.department} ${contact.position}',
                        style: AppTextStyles.caption2.copyWith(
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary(context),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecentSearches(
    BuildContext context,
    List<String> searches,
    TextEditingController controller,
    void Function(String) onSearch,
  ) {
    if (searches.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.md,
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
          ),
          child: Text(
            '最近の検索',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        ...searches.map(
          (query) => InkWell(
            onTap: () {
              controller.text = query;
              onSearch(query);
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal,
                vertical: 12,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.history_rounded,
                    size: 20,
                    color: AppColors.textSecondary(context),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(child: Text(query, style: AppTextStyles.caption1)),
                  Icon(
                    Icons.north_west_rounded,
                    size: 16,
                    color: AppColors.textTertiary(context),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

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
}

// =============================================================================
// Markdown除去ユーティリティ
// =============================================================================

final _markdownPattern = RegExp(
  r'#{1,6}\s|[*_~`]{1,3}|\[([^\]]*)\]\([^)]*\)|!\[([^\]]*)\]\([^)]*\)|^>\s|^-\s|^\d+\.\s',
  multiLine: true,
);

String _stripMarkdown(String text) {
  return text
      .replaceAll(_markdownPattern, '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

String _snippet(String markdown, {int maxLength = 80}) {
  final plain = _stripMarkdown(markdown);
  if (plain.length <= maxLength) return plain;
  return '${plain.substring(0, maxLength)}...';
}

// =============================================================================
// 検索結果ビュー
// =============================================================================

class _SearchResultsView extends StatelessWidget {
  const _SearchResultsView({required this.results, required this.query});

  final PortalSearchResults results;
  final String query;

  @override
  Widget build(BuildContext context) {
    if (results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.search_off_rounded,
                size: 48,
                color: AppColors.textTertiary(context),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                '「$query」に一致する結果がありません',
                style: AppTextStyles.headline,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '別のキーワードで検索してみてください',
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.only(top: AppSpacing.sm, bottom: 40),
      children: [
        // 社員
        if (results.employees.isNotEmpty) ...[
          _SectionLabel(
            icon: Icons.people_outline_rounded,
            label: '社員',
            count: results.employees.length,
          ),
          ...results.employees.map((c) => _EmployeeResultTile(contact: c)),
        ],

        // Wiki
        if (results.wikiPages.isNotEmpty) ...[
          _SectionLabel(
            icon: Icons.article_outlined,
            label: '社内Wiki',
            count: results.wikiPages.length,
          ),
          ...results.wikiPages.map((p) => _WikiResultTile(page: p)),
        ],

        // お知らせ
        if (results.announcements.isNotEmpty) ...[
          _SectionLabel(
            icon: Icons.campaign_outlined,
            label: 'お知らせ',
            count: results.announcements.length,
          ),
          ...results.announcements.map(
            (a) => _AnnouncementResultTile(announcement: a),
          ),
        ],

        // FAQ
        if (results.faqs.isNotEmpty) ...[
          _SectionLabel(
            icon: Icons.help_outline_rounded,
            label: 'FAQ',
            count: results.faqs.length,
          ),
          ...results.faqs.map(
            (f) => _FaqResultTile(faq: f, searchQuery: query),
          ),
        ],

        // CRM 連絡先
        if (results.bcContacts.isNotEmpty) ...[
          _SectionLabel(
            icon: Icons.contact_phone_outlined,
            label: 'CRM連絡先',
            count: results.bcContacts.length,
          ),
          ...results.bcContacts.map((c) => _BcContactResultTile(contact: c)),
        ],

        // CRM 企業
        if (results.bcCompanies.isNotEmpty) ...[
          _SectionLabel(
            icon: Icons.business_outlined,
            label: 'CRM企業',
            count: results.bcCompanies.length,
          ),
          ...results.bcCompanies.map((c) => _BcCompanyResultTile(company: c)),
        ],
      ],
    );
  }
}

// =============================================================================
// セクションラベル
// =============================================================================

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({
    required this.icon,
    required this.label,
    required this.count,
  });

  final IconData icon;
  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.lg,
        AppSpacing.screenHorizontal,
        AppSpacing.xs,
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.brand),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.brand,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '($count)',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// 社員結果タイル
// =============================================================================

class _EmployeeResultTile extends StatelessWidget {
  const _EmployeeResultTile({required this.contact});
  final EmployeeContact contact;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(AppRoutes.employeeDetail, extra: contact),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            UserAvatar(
              initial: contact.initial,
              color: contact.color,
              size: 44,
              imageUrl: contact.avatarUrl,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.name,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (contact.department.isNotEmpty ||
                      contact.position.isNotEmpty)
                    Text(
                      [
                        contact.department,
                        contact.position,
                      ].where((s) => s.isNotEmpty).join(' / '),
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                    ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.textTertiary(context),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Wiki結果タイル
// =============================================================================

class _WikiResultTile extends StatelessWidget {
  const _WikiResultTile({required this.page});
  final WikiPage page;

  @override
  Widget build(BuildContext context) {
    final snippetText = _snippet(page.content);

    return InkWell(
      onTap: () => context.push(AppRoutes.wikiDetail, extra: page),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.brand.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.article_outlined,
                size: 22,
                color: AppColors.brand,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    page.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (snippetText.isNotEmpty)
                    Text(
                      snippetText,
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            if (page.category != null)
              Container(
                margin: const EdgeInsets.only(left: 8),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.divider(context),
                  borderRadius: AppRadius.radius40,
                ),
                child: Text(
                  page.category!,
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// お知らせ結果タイル
// =============================================================================

class _AnnouncementResultTile extends StatelessWidget {
  const _AnnouncementResultTile({required this.announcement});
  final Announcement announcement;

  @override
  Widget build(BuildContext context) {
    final snippetText = _snippet(announcement.body);

    return InkWell(
      onTap: () =>
          context.push(AppRoutes.announcements, extra: announcement.id),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.campaign_outlined,
                size: 22,
                color: AppColors.warning,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    announcement.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Row(
                    children: [
                      Text(
                        DateFormat(
                          'yyyy/MM/dd',
                        ).format(announcement.publishedAt),
                        style: AppTextStyles.caption2.copyWith(
                          color: AppColors.textSecondary(context),
                        ),
                      ),
                      if (snippetText.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            snippetText,
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(context),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            if (announcement.isPinned)
              Icon(
                Icons.push_pin_rounded,
                size: 16,
                color: AppColors.textTertiary(context),
              ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// FAQ結果タイル
// =============================================================================

class _FaqResultTile extends StatelessWidget {
  const _FaqResultTile({required this.faq, required this.searchQuery});
  final FaqItem faq;
  final String searchQuery;

  @override
  Widget build(BuildContext context) {
    final answerSnippet = _snippet(faq.answer);

    return InkWell(
      onTap: () => context.push(AppRoutes.faq, extra: searchQuery),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  'Q',
                  style: AppTextStyles.headline.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    faq.question,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (answerSnippet.isNotEmpty)
                    Text(
                      answerSnippet,
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            Container(
              margin: const EdgeInsets.only(left: 8),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.divider(context),
                borderRadius: AppRadius.radius40,
              ),
              child: Text(
                FaqCategory.label(faq.category),
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// CRM連絡先結果タイル
// =============================================================================

class _BcContactResultTile extends StatelessWidget {
  const _BcContactResultTile({required this.contact});
  final BcContact contact;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(AppRoutes.bcContactDetail, extra: contact.id),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.brand.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.contact_phone_outlined,
                size: 22,
                color: AppColors.brand,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.fullName,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    [
                      contact.company?.name,
                      contact.department,
                      contact.position,
                    ].where((s) => s != null && s.isNotEmpty).join(' / '),
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.textTertiary(context),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// CRM企業結果タイル
// =============================================================================

class _BcCompanyResultTile extends StatelessWidget {
  const _BcCompanyResultTile({required this.company});
  final BcCompany company;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(AppRoutes.bcCompanyDetail, extra: company.id),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.business_outlined,
                size: 22,
                color: AppColors.warning,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    company.name,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (company.industry != null && company.industry!.isNotEmpty)
                    Text(
                      company.industry!,
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.textTertiary(context),
            ),
          ],
        ),
      ),
    );
  }
}
