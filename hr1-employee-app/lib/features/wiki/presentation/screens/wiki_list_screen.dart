import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';
import 'package:hr1_employee_app/features/wiki/presentation/providers/wiki_providers.dart';

class WikiListScreen extends HookConsumerWidget {
  const WikiListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final searchController = useTextEditingController();
    final focusNode = useFocusNode();
    final query = useValueListenable(searchController).text.trim();
    final pagesAsync = ref.watch(wikiPagesProvider);

    return CommonScaffold(
      appBar: AppBar(title: const Text('社内Wiki')),
      body: pagesAsync.when(
        data: (pages) => _Body(
          pages: pages,
          query: query,
          controller: searchController,
          focusNode: focusNode,
        ),
        loading: () => const LoadingIndicator(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(wikiPagesProvider)),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.pages,
    required this.query,
    required this.controller,
    required this.focusNode,
  });

  final List<WikiPage> pages;
  final String query;
  final TextEditingController controller;
  final FocusNode focusNode;

  List<WikiPage> _filterPages(List<WikiPage> pages) {
    final q = query.toLowerCase();
    if (q.isEmpty) return pages;
    return pages.where((page) {
      return page.title.toLowerCase().contains(q) ||
          page.content.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.md,
            AppSpacing.screenHorizontal,
            AppSpacing.xs,
          ),
          child: SearchBox(
            controller: controller,
            focusNode: focusNode,
            hintText: 'キーワードで検索',
          ),
        ),
        Expanded(child: _content(context)),
      ],
    );
  }

  Widget _content(BuildContext context) {
    if (pages.isEmpty) {
      return EmptyState(
        icon: Icon(
          Icons.menu_book_rounded,
          size: 48,
          color: AppColors.textTertiary(context),
        ),
        title: 'Wikiページはまだありません',
      );
    }

    final filtered = _filterPages(pages);
    if (filtered.isEmpty) {
      return EmptyState(
        icon: Icon(
          Icons.search_off_rounded,
          size: 48,
          color: AppColors.textTertiary(context),
        ),
        title: '「$query」に一致するページはありません',
      );
    }

    final grouped = <String, List<WikiPage>>{};
    for (final page in filtered) {
      final cat = page.category ?? '未分類';
      grouped.putIfAbsent(cat, () => []).add(page);
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
      itemCount: grouped.length,
      itemBuilder: (context, index) {
        final category = grouped.keys.elementAt(index);
        final items = grouped[category]!;
        return _WikiCategorySection(category: category, items: items);
      },
    );
  }
}

class _WikiCategorySection extends StatelessWidget {
  const _WikiCategorySection({required this.category, required this.items});

  final String category;
  final List<WikiPage> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(
            top: AppSpacing.lg,
            bottom: AppSpacing.sm,
          ),
          child: Text(
            category,
            style: AppTextStyles.caption1.copyWith(
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary(context),
              letterSpacing: 0.3,
            ),
          ),
        ),
        ...items.map(
          (page) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: _WikiPageCard(page: page),
          ),
        ),
      ],
    );
  }
}

class _WikiPageCard extends StatelessWidget {
  const _WikiPageCard({required this.page});
  final WikiPage page;

  @override
  Widget build(BuildContext context) {
    final snippet = page.content.length > 100
        ? '${page.content.substring(0, 100)}...'
        : page.content;

    return CommonCard(
      onTap: () => context.push(AppRoutes.wikiDetail, extra: page),
      margin: EdgeInsets.zero,
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.brand.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: Icon(
                Icons.article_outlined,
                size: 20,
                color: AppColors.brand,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  page.title,
                  style: AppTextStyles.body2.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (snippet.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    snippet.replaceAll('\n', ' '),
                    style: AppTextStyles.caption1.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: AppColors.textTertiary(context)),
        ],
      ),
    );
  }
}
