import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/faq/domain/entities/faq_item.dart';
import 'package:hr1_employee_app/features/faq/presentation/providers/faq_providers.dart';

/// FAQ一覧画面
class FaqScreen extends HookConsumerWidget {
  const FaqScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final searchController = useTextEditingController();
    final focusNode = useFocusNode();
    final query = useValueListenable(searchController).text.trim();
    final faqsAsync = ref.watch(employeeFaqsProvider);

    return CommonScaffold(
      appBar: AppBar(title: const Text('よくある質問')),
      body: faqsAsync.when(
        data: (faqs) => _Body(
          faqs: faqs,
          query: query,
          controller: searchController,
          focusNode: focusNode,
        ),
        loading: () => const LoadingIndicator(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(employeeFaqsProvider)),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.faqs,
    required this.query,
    required this.controller,
    required this.focusNode,
  });

  final List<FaqItem> faqs;
  final String query;
  final TextEditingController controller;
  final FocusNode focusNode;

  List<FaqItem> _filterFaqs(List<FaqItem> faqs) {
    final q = query.toLowerCase();
    if (q.isEmpty) return faqs;
    return faqs.where((faq) {
      return faq.question.toLowerCase().contains(q) ||
          faq.answer.toLowerCase().contains(q);
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
    if (faqs.isEmpty) {
      return EmptyState(
        icon: Icon(
          Icons.help_outline_rounded,
          size: 48,
          color: AppColors.textTertiary(context),
        ),
        title: 'FAQはまだありません',
      );
    }

    final filtered = _filterFaqs(faqs);
    if (filtered.isEmpty) {
      return EmptyState(
        icon: Icon(
          Icons.search_off_rounded,
          size: 48,
          color: AppColors.textTertiary(context),
        ),
        title: '「$query」に一致するFAQはありません',
      );
    }

    final grouped = <String, List<FaqItem>>{};
    for (final faq in filtered) {
      grouped.putIfAbsent(faq.category, () => []).add(faq);
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
      itemCount: grouped.length,
      itemBuilder: (context, index) {
        final category = grouped.keys.elementAt(index);
        final items = grouped[category]!;
        return _FaqCategorySection(
          category: category,
          items: items,
          highlightQuery: query,
        );
      },
    );
  }
}

class _FaqCategorySection extends StatelessWidget {
  const _FaqCategorySection({
    required this.category,
    required this.items,
    this.highlightQuery = '',
  });

  final String category;
  final List<FaqItem> items;
  final String highlightQuery;

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
            FaqCategory.label(category),
            style: AppTextStyles.caption1.copyWith(
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary(context),
              letterSpacing: 0.3,
            ),
          ),
        ),
        ...items.map(
          (faq) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: _FaqTile(faq: faq, highlightQuery: highlightQuery),
          ),
        ),
      ],
    );
  }
}

class _FaqTile extends StatefulWidget {
  const _FaqTile({required this.faq, this.highlightQuery = ''});
  final FaqItem faq;
  final String highlightQuery;

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(color: AppColors.border(context)),
        boxShadow: AppShadows.of4(context),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: AppColors.brand.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Center(
                      child: Text(
                        'Q',
                        style: AppTextStyles.caption1.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.brand,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _buildHighlightedText(
                      widget.faq.question,
                      widget.highlightQuery,
                      AppTextStyles.body2.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                  AnimatedRotation(
                    turns: _expanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.expand_more,
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            clipBehavior: Clip.hardEdge,
            child: SizedBox(
              height: _expanded ? null : 0,
              width: double.infinity,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg + 24 + AppSpacing.md,
                  0,
                  AppSpacing.lg,
                  AppSpacing.lg,
                ),
                child: MarkdownBody(
                  data: widget.faq.answer,
                  styleSheet: MarkdownStyleSheet(
                    p: AppTextStyles.body2.copyWith(
                      color: AppColors.textSecondary(context),
                      height: 1.6,
                    ),
                    h1: AppTextStyles.headline,
                    h2: AppTextStyles.body2.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    h3: AppTextStyles.body2.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                    listBullet: AppTextStyles.body2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                    code: AppTextStyles.caption1.copyWith(
                      backgroundColor: AppColors.surfaceTertiary(context),
                    ),
                  ),
                  shrinkWrap: true,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHighlightedText(String text, String query, TextStyle baseStyle) {
    if (query.isEmpty) return Text(text, style: baseStyle);

    final lowerText = text.toLowerCase();
    final lowerQuery = query.toLowerCase();
    final spans = <TextSpan>[];
    int start = 0;

    while (true) {
      final idx = lowerText.indexOf(lowerQuery, start);
      if (idx == -1) {
        spans.add(TextSpan(text: text.substring(start)));
        break;
      }
      if (idx > start) {
        spans.add(TextSpan(text: text.substring(start, idx)));
      }
      spans.add(
        TextSpan(
          text: text.substring(idx, idx + query.length),
          style: baseStyle.copyWith(
            backgroundColor: AppColors.brand.withValues(alpha: 0.15),
            color: AppColors.brand,
          ),
        ),
      );
      start = idx + query.length;
    }

    return Text.rich(TextSpan(style: baseStyle, children: spans));
  }
}
