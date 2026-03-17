import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/search_box.dart';
import '../../domain/entities/faq_item.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../providers/faq_providers.dart';

/// FAQ一覧画面
class FaqScreen extends ConsumerStatefulWidget {
  const FaqScreen({super.key});

  @override
  ConsumerState<FaqScreen> createState() => _FaqScreenState();
}

class _FaqScreenState extends ConsumerState<FaqScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {});
  }

  List<FaqItem> _filterFaqs(List<FaqItem> faqs) {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return faqs;
    return faqs.where((faq) {
      return faq.question.toLowerCase().contains(query) ||
          faq.answer.toLowerCase().contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final faqsAsync = ref.watch(employeeFaqsProvider);
    final theme = Theme.of(context);
    final query = _searchController.text.trim();

    return Scaffold(
      appBar: AppBar(
        title: const Text('よくある質問'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(0.5),
          child:
              Container(height: 0.5, color: theme.colorScheme.outlineVariant),
        ),
      ),
      body: faqsAsync.when(
        data: (faqs) {
          if (faqs.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.help_outline_rounded,
                      size: 48,
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.3)),
                  const SizedBox(height: AppSpacing.md),
                  Text('FAQはまだありません',
                      style: AppTextStyles.body2.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.5),
                      )),
                ],
              ),
            );
          }

          final filtered = _filterFaqs(faqs);

          // カテゴリ別にグループ化
          final grouped = <String, List<FaqItem>>{};
          for (final faq in filtered) {
            grouped.putIfAbsent(faq.category, () => []).add(faq);
          }

          return Column(
            children: [
              // 検索バー
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.screenHorizontal,
                  AppSpacing.md,
                  AppSpacing.screenHorizontal,
                  AppSpacing.xs,
                ),
                child: SearchBox(
                  controller: _searchController,
                  focusNode: _focusNode,
                  hintText: 'キーワードで検索',
                  onClear: () => setState(() {}),
                ),
              ),
              // 検索結果
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          '「$query」に一致するFAQはありません',
                          style: AppTextStyles.body2.copyWith(
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                      )
                    : ListView.builder(
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
                      ),
              ),
            ],
          );
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('読み込みに失敗しました',
                  style: AppTextStyles.body2.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                  )),
              const SizedBox(height: AppSpacing.md),
              FilledButton.tonal(
                onPressed: () => ref.invalidate(employeeFaqsProvider),
                child: const Text('再試行'),
              ),
            ],
          ),
        ),
      ),
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
    final theme = Theme.of(context);
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
            style: AppTextStyles.caption1.copyWith(fontWeight: FontWeight.w500,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              letterSpacing: 0.3,
            ),
          ),
        ),
        ...items.map((faq) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: _FaqTile(faq: faq, highlightQuery: highlightQuery),
            )),
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(
          color: isDark
              ? theme.colorScheme.outline.withValues(alpha: 0.35)
              : theme.colorScheme.outlineVariant,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.06),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
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
                      color: AppColors.brandPrimary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Center(
                      child: Text(
                        'Q',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.brandPrimary,
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
                      color: theme.colorScheme.onSurfaceVariant,
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
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.6,
                    ),
                    h1: AppTextStyles.headline,
                    h2: AppTextStyles.headline.copyWith(fontSize: 15),
                    h3: AppTextStyles.caption1.copyWith(fontWeight: FontWeight.w500,fontSize: 14),
                    listBullet: AppTextStyles.body2.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    code: AppTextStyles.caption1.copyWith(
                      backgroundColor:
                          theme.colorScheme.surfaceContainerHighest,
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
      spans.add(TextSpan(
        text: text.substring(idx, idx + query.length),
        style: baseStyle.copyWith(
          backgroundColor: AppColors.brandPrimary.withValues(alpha: 0.15),
          color: AppColors.brandPrimary,
        ),
      ));
      start = idx + query.length;
    }

    return Text.rich(TextSpan(style: baseStyle, children: spans));
  }
}
