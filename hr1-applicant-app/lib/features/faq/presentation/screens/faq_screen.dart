import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/faq/domain/entities/faq_item.dart';
import 'package:hr1_applicant_app/features/faq/presentation/providers/faq_providers.dart';

/// FAQ一覧画面（応募者向け）
class FaqScreen extends ConsumerWidget {
  const FaqScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final faqsAsync = ref.watch(applicantFaqsProvider);

    return CommonScaffold(
      appBar: AppBar(title: const Text('よくある質問')),
      body: faqsAsync.when(
        data: (faqs) {
          if (faqs.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.help_outline_rounded,
                    size: 48,
                    color: AppColors.textTertiary(context),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'FAQはまだありません',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                ],
              ),
            );
          }

          // カテゴリ別にグループ化
          final grouped = <String, List<FaqItem>>{};
          for (final faq in faqs) {
            grouped.putIfAbsent(faq.category, () => []).add(faq);
          }

          return ListView.builder(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            itemCount: grouped.length,
            itemBuilder: (context, index) {
              final category = grouped.keys.elementAt(index);
              final items = grouped[category]!;
              return _FaqCategorySection(category: category, items: items);
            },
          );
        },
        loading: () => const _FaqSkeleton(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(applicantFaqsProvider)),
      ),
    );
  }
}

class _FaqCategorySection extends StatelessWidget {
  const _FaqCategorySection({required this.category, required this.items});

  final String category;
  final List<FaqItem> items;

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
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          ),
        ),
        ...items.map(
          (faq) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: _FaqTile(faq: faq),
          ),
        ),
      ],
    );
  }
}

class _FaqTile extends StatefulWidget {
  const _FaqTile({required this.faq});
  final FaqItem faq;

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      padding: EdgeInsets.zero,
      margin: EdgeInsets.zero,
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: AppRadius.radius160,
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: AppColors.brand.withValues(alpha: 0.1),
                      borderRadius: AppRadius.radius40,
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
                    child: Text(
                      widget.faq.question,
                      style: AppTextStyles.body2.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
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
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.cardPadding + 24 + AppSpacing.md,
                0,
                AppSpacing.cardPadding,
                AppSpacing.cardPadding,
              ),
              child: MarkdownBody(
                data: widget.faq.answer,
                styleSheet: MarkdownStyleSheet(
                  p: AppTextStyles.body2.copyWith(
                    color: AppColors.textSecondary(context),
                    height: 1.6,
                  ),
                  h1: AppTextStyles.title3,
                  h2: AppTextStyles.callout,
                  h3: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w600),
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
            crossFadeState: _expanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }
}

/// FAQスケルトンローディング — 通常時と同じカードレイアウト
class _FaqSkeleton extends StatelessWidget {
  const _FaqSkeleton();

  @override
  Widget build(BuildContext context) {
    return SkeletonContainer(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(
                top: AppSpacing.lg,
                bottom: AppSpacing.sm,
              ),
              child: SkeletonBone(width: 60, height: 13),
            ),
            for (var i = 0; i < 3; i++) ...[
              _faqCardBone(i),
              const SizedBox(height: AppSpacing.sm),
            ],
            const Padding(
              padding: EdgeInsets.only(
                top: AppSpacing.lg,
                bottom: AppSpacing.sm,
              ),
              child: SkeletonBone(width: 48, height: 13),
            ),
            for (var i = 0; i < 2; i++) ...[
              _faqCardBone(i + 3),
              const SizedBox(height: AppSpacing.sm),
            ],
          ],
        ),
      ),
    );
  }

  Widget _faqCardBone(int index) {
    final widths = [0.9, 0.7, 0.55, 0.8, 0.65];
    final fraction = widths[index % widths.length];

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      child: Row(
        children: [
          const SkeletonBone(width: 24, height: 24, borderRadius: 6),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: fraction,
              child: const SkeletonBone(height: 15),
            ),
          ),
        ],
      ),
    );
  }
}
