import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../providers/survey_providers.dart';

/// パルスサーベイ一覧画面（応募者向け）
class SurveyListScreen extends ConsumerWidget {
  const SurveyListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surveysAsync = ref.watch(activeSurveysProvider);
    final completedAsync = ref.watch(completedSurveyIdsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('サーベイ', style: AppTextStyles.subtitle),
        centerTitle: true,
      ),
      body: surveysAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('読み込みに失敗しました', style: AppTextStyles.body.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55))),
              const SizedBox(height: AppSpacing.md),
              FilledButton.tonal(
                onPressed: () {
                  ref.invalidate(activeSurveysProvider);
                  ref.invalidate(completedSurveyIdsProvider);
                },
                child: const Text('再試行'),
              ),
            ],
          ),
        ),
        data: (surveys) {
          final completedIds = completedAsync.valueOrNull ?? <String>{};

          if (surveys.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.poll_outlined, size: 48, color: theme.colorScheme.onSurface.withValues(alpha: 0.3)),
                  const SizedBox(height: AppSpacing.md),
                  Text('サーベイはありません', style: AppTextStyles.body.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55))),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(activeSurveysProvider);
              ref.invalidate(completedSurveyIdsProvider);
              await ref.read(activeSurveysProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
              itemCount: surveys.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) {
                final survey = surveys[index];
                final isCompleted = completedIds.contains(survey.id);

                return Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
                    onTap: isCompleted
                        ? null
                        : () async {
                            await context.push('${AppRoutes.surveys}/${survey.id}', extra: survey);
                            ref.invalidate(completedSurveyIdsProvider);
                          },
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.cardPadding),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(survey.title, style: AppTextStyles.subtitle),
                              ),
                              if (isCompleted)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.success.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text('回答済み', style: AppTextStyles.caption.copyWith(color: AppColors.success, fontWeight: FontWeight.w600)),
                                )
                              else
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryLight.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text('未回答', style: AppTextStyles.caption.copyWith(color: AppColors.primaryLight, fontWeight: FontWeight.w600)),
                                ),
                            ],
                          ),
                          if (survey.description != null) ...[
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              survey.description!,
                              style: AppTextStyles.bodySmall.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55)),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                          const SizedBox(height: AppSpacing.sm),
                          Row(
                            children: [
                              Text(
                                '${survey.questions.length}問',
                                style: AppTextStyles.caption.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55)),
                              ),
                              if (survey.deadline != null) ...[
                                const SizedBox(width: AppSpacing.md),
                                Text(
                                  '締切: ${DateFormat('yyyy/MM/dd').format(survey.deadline!.toLocal())}',
                                  style: AppTextStyles.caption.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55)),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
