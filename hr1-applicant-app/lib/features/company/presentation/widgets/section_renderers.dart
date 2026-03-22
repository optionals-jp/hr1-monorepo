import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/domain/entities/page_section.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../applications/domain/entities/job.dart';
import '../../../applications/presentation/providers/applications_providers.dart';

/// セクションタイプに応じたウィジェットを返す
class SectionRenderer extends StatelessWidget {
  const SectionRenderer({super.key, required this.section});
  final PageSection section;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (section.title.isNotEmpty) ...[
          Text(section.title, style: AppTextStyles.callout),
          const SizedBox(height: AppSpacing.lg),
        ],
        _buildBody(context),
      ],
    );
  }

  Widget _buildBody(BuildContext context) {
    return switch (section.type) {
      SectionType.markdown => _MarkdownSection(content: section.content ?? ''),
      SectionType.jobList => const _JobListSection(),
      SectionType.benefitList => _BenefitListSection(items: section.items),
      SectionType.valueList => _ValueListSection(items: section.items),
      SectionType.stats => _StatsSection(items: section.items),
      SectionType.members => _MembersSection(items: section.items),
      SectionType.gallery => _GallerySection(items: section.items),
      SectionType.faq => _FaqSection(items: section.items),
    };
  }
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

class _MarkdownSection extends StatelessWidget {
  const _MarkdownSection({required this.content});
  final String content;

  @override
  Widget build(BuildContext context) {
    return MarkdownBody(
      data: content,
      selectable: true,
      styleSheet: MarkdownStyleSheet(
        h2: AppTextStyles.title3,
        h3: AppTextStyles.callout,
        p: AppTextStyles.body2.copyWith(height: 1.7),
        listBullet: AppTextStyles.body2,
        blockquoteDecoration: BoxDecoration(
          border: Border(
            left: BorderSide(color: AppColors.primaryLight, width: 3),
          ),
        ),
        blockquotePadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: 4,
        ),
        blockquote: AppTextStyles.body2.copyWith(color: AppColors.primaryLight),
        strong: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w700),
        horizontalRuleDecoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: Theme.of(context).dividerColor, width: 1),
          ),
        ),
        code: AppTextStyles.caption1.copyWith(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          fontFamily: 'monospace',
        ),
        codeblockDecoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: AppRadius.radius80,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 求人一覧
// ---------------------------------------------------------------------------

class _JobListSection extends ConsumerWidget {
  const _JobListSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncJobs = ref.watch(jobsProvider);

    return asyncJobs.when(
      data: (jobs) {
        if (jobs.isEmpty) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.xl),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              borderRadius: AppRadius.radius120,
            ),
            child: Center(
              child: Text(
                '現在募集中のポジションはありません',
                style: AppTextStyles.caption1.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          );
        }

        return Column(
          children: [
            ...jobs.map((job) => _JobCard(job: job)),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => context.push(AppRoutes.jobs),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primaryLight,
                  side: const BorderSide(color: AppColors.primaryLight),
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.radius80,
                  ),
                ),
                child: const Text('すべての求人を見る'),
              ),
            ),
          ],
        );
      },
      loading: () => const LoadingIndicator(),
      error: (e, _) => const Center(child: Text('エラーが発生しました')),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      onTap: () => context.push('${AppRoutes.jobs}/${job.id}'),
      margin: EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(job.title, style: AppTextStyles.callout),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.xs,
            children: [
              if (job.department != null) _Tag(job.department!),
              if (job.location != null) _Tag(job.location!),
              if (job.employmentType != null) _Tag(job.employmentType!),
            ],
          ),
          if (job.salaryRange != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              job.salaryRange!,
              style: AppTextStyles.body2.copyWith(
                color: AppColors.primaryLight,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 福利厚生リスト
// ---------------------------------------------------------------------------

class _BenefitListSection extends StatelessWidget {
  const _BenefitListSection({required this.items});
  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: items.map((item) {
        final icon = item['icon'] as String? ?? '✓';
        final text = item['text'] as String? ?? '';
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.cardPadding,
              vertical: AppSpacing.md,
            ),
            decoration: BoxDecoration(
              color: theme.scaffoldBackgroundColor,
              borderRadius: AppRadius.radius80,
            ),
            child: Row(
              children: [
                Text(icon, style: AppTextStyles.callout),
                const SizedBox(width: AppSpacing.md),
                Expanded(child: Text(text, style: AppTextStyles.body2)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ---------------------------------------------------------------------------
// カルチャー・バリューリスト
// ---------------------------------------------------------------------------

class _ValueListSection extends StatelessWidget {
  const _ValueListSection({required this.items});
  final List<Map<String, dynamic>> items;

  static const _accentColors = [
    AppColors.primaryLight,
    AppColors.success,
    AppColors.accent,
    AppColors.warning,
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: items.asMap().entries.map((entry) {
        final index = entry.key;
        final item = entry.value;
        final color = _accentColors[index % _accentColors.length];

        return CommonCard(
          margin: EdgeInsets.only(bottom: AppSpacing.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: AppRadius.radius80,
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: AppTextStyles.callout.copyWith(
                      fontWeight: FontWeight.w700,
                      color: color,
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
                      item['title'] as String? ?? '',
                      style: AppTextStyles.body2.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (item['description'] != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        item['description'] as String? ?? '',
                        style: AppTextStyles.caption1.copyWith(
                          height: 1.5,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

// ---------------------------------------------------------------------------
// 数値ハイライト
// ---------------------------------------------------------------------------

class _StatsSection extends StatelessWidget {
  const _StatsSection({required this.items});
  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: AppRadius.radius120,
      ),
      child: Wrap(
        alignment: WrapAlignment.spaceEvenly,
        runSpacing: AppSpacing.lg,
        children: items.map((item) {
          return SizedBox(
            width: (MediaQuery.of(context).size.width - 64) / 3,
            child: Column(
              children: [
                Text(
                  item['value'] as String? ?? '-',
                  style: AppTextStyles.callout.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  item['label'] as String? ?? '',
                  style: AppTextStyles.caption2.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// メンバー紹介
// ---------------------------------------------------------------------------

class _MembersSection extends StatelessWidget {
  const _MembersSection({required this.items});
  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: items.map((item) {
        return CommonCard(
          margin: EdgeInsets.only(bottom: AppSpacing.md),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: theme.colorScheme.primary.withValues(
                  alpha: 0.1,
                ),
                child: Text(
                  (item['name'] as String? ?? '?').characters.first,
                  style: AppTextStyles.body2.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['name'] as String? ?? '',
                      style: AppTextStyles.body2.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (item['role'] != null)
                      Text(
                        item['role'] as String? ?? '',
                        style: AppTextStyles.caption2.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

// ---------------------------------------------------------------------------
// 画像ギャラリー
// ---------------------------------------------------------------------------

class _GallerySection extends StatelessWidget {
  const _GallerySection({required this.items});
  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (items.isEmpty) {
      return Center(
        child: Text(
          '画像はまだ登録されていません',
          style: AppTextStyles.caption1.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    return SizedBox(
      height: 180,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
        itemBuilder: (context, index) {
          final item = items[index];
          return ClipRRect(
            borderRadius: AppRadius.radius120,
            child: Container(
              width: 240,
              color: theme.scaffoldBackgroundColor,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Container(
                      width: double.infinity,
                      color: theme.colorScheme.primary.withValues(alpha: 0.08),
                      child: Icon(
                        Icons.image_outlined,
                        size: 40,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  if (item['caption'] != null)
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      child: Text(
                        item['caption'] as String? ?? '',
                        style: AppTextStyles.caption2.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

class _FaqSection extends StatelessWidget {
  const _FaqSection({required this.items});
  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: items.map((item) {
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: _FaqTile(
            question: item['question'] as String? ?? '',
            answer: item['answer'] as String? ?? '',
          ),
        );
      }).toList(),
    );
  }
}

class _FaqTile extends StatefulWidget {
  const _FaqTile({required this.question, required this.answer});
  final String question;
  final String answer;

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
                      color: AppColors.primaryLight.withValues(alpha: 0.1),
                      borderRadius: AppRadius.radius40,
                    ),
                    child: Center(
                      child: Text(
                        'Q',
                        style: AppTextStyles.caption1.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryLight,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      widget.question,
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
                      color: theme.colorScheme.onSurfaceVariant,
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
              child: Text(
                widget.answer,
                style: AppTextStyles.body2.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.6,
                ),
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

// ---------------------------------------------------------------------------
// 共通パーツ
// ---------------------------------------------------------------------------

class _Tag extends StatelessWidget {
  const _Tag(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.primaryLight.withValues(alpha: 0.08),
        borderRadius: AppRadius.radius40,
      ),
      child: Text(
        text,
        style: AppTextStyles.caption2.copyWith(
          color: AppColors.primaryLight,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
