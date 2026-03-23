import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/surveys/presentation/providers/survey_providers.dart';

/// パルスサーベイ一覧画面（応募者向け）
class SurveyListScreen extends ConsumerWidget {
  const SurveyListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surveysAsync = ref.watch(activeSurveysProvider);
    final completedAsync = ref.watch(completedSurveyIdsProvider);

    return CommonScaffold(
      appBar: AppBar(
        title: Text('サーベイ', style: AppTextStyles.callout),
        centerTitle: true,
      ),
      body: surveysAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '読み込みに失敗しました',
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              CommonButton.outline(
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
                  Icon(
                    Icons.poll_outlined,
                    size: 48,
                    color: AppColors.lightTextSecondary,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'サーベイはありません',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
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
              separatorBuilder: (_, __) =>
                  const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) {
                final survey = surveys[index];
                final isCompleted = completedIds.contains(survey.id);

                return CommonCard(
                  onTap: () async {
                    await context.push(
                      '${AppRoutes.surveys}/${survey.id}',
                      extra: survey,
                    );
                    ref.invalidate(completedSurveyIdsProvider);
                  },
                  margin: EdgeInsets.zero,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              survey.title,
                              style: AppTextStyles.callout,
                            ),
                          ),
                          if (isCompleted)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.1),
                                borderRadius: AppRadius.radius40,
                              ),
                              child: Text(
                                '回答済み',
                                style: AppTextStyles.caption2.copyWith(
                                  color: AppColors.success,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            )
                          else
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.brand.withValues(alpha: 0.1),
                                borderRadius: AppRadius.radius40,
                              ),
                              child: Text(
                                '未回答',
                                style: AppTextStyles.caption2.copyWith(
                                  color: AppColors.brand,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      if (survey.description != null) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          survey.description!,
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.lightTextSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        children: [
                          Text(
                            '${survey.questions.length}問',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.lightTextSecondary,
                            ),
                          ),
                          if (survey.deadline != null) ...[
                            const SizedBox(width: AppSpacing.md),
                            Text(
                              '締切: ${DateFormat('yyyy/MM/dd').format(survey.deadline!.toLocal())}',
                              style: AppTextStyles.caption2.copyWith(
                                color: AppColors.lightTextSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
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
