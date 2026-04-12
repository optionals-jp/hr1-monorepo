import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/surveys/presentation/providers/survey_providers.dart';
import 'package:intl/intl.dart';

class SurveyListScreen extends HookConsumerWidget {
  const SurveyListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tabController = useTabController(initialLength: 2);

    final pendingAsync = ref.watch(pendingSurveysProvider);
    final completedAsync = ref.watch(completedSurveysProvider);
    final completedIds =
        ref.watch(completedSurveyIdsProvider).valueOrNull ?? <String>{};

    final isLoading = pendingAsync.isLoading || completedAsync.isLoading;
    final error = pendingAsync.error ?? completedAsync.error;

    Future<void> refresh(WidgetRef ref) async {
      ref.invalidate(activeSurveysProvider);
      ref.invalidate(completedSurveyIdsProvider);
      await ref.read(activeSurveysProvider.future);
    }

    return CommonScaffold(
      appBar: AppBar(
        title: Text('パルスサーベイ', style: AppTextStyles.headline),
        bottom: TabBar(
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          controller: tabController,
          labelStyle: AppTextStyles.body2,
          tabs: const [
            Tab(text: '未回答'),
            Tab(text: '回答済み'),
          ],
        ),
      ),
      body: isLoading
          ? const LoadingIndicator()
          : error != null
          ? ErrorState(
              onRetry: () {
                ref.invalidate(activeSurveysProvider);
                ref.invalidate(completedSurveyIdsProvider);
              },
            )
          : TabBarView(
              controller: tabController,
              children: [
                _SurveyList(
                  surveys: pendingAsync.valueOrNull ?? [],
                  completedIds: completedIds,
                  emptyIcon: Icons.assignment_outlined,
                  emptyMessage: '未回答のサーベイはありません',
                  onRefresh: () => refresh(ref),
                ),
                _SurveyList(
                  surveys: completedAsync.valueOrNull ?? [],
                  completedIds: completedIds,
                  emptyIcon: Icons.check_circle_outline,
                  emptyMessage: '回答済みのサーベイはありません',
                  onRefresh: () => refresh(ref),
                ),
              ],
            ),
    );
  }
}

// ---------------------------------------------------------------------------
// サーベイ種別アイコン判定
// ---------------------------------------------------------------------------

({IconData icon, Color color}) _surveyTypeIcon(PulseSurvey survey) {
  if (survey.questions.isEmpty) {
    return (icon: Icons.poll_outlined, color: AppColors.brand);
  }

  final typeCounts = <String, int>{};
  for (final q in survey.questions) {
    typeCounts[q.type] = (typeCounts[q.type] ?? 0) + 1;
  }
  final dominant = typeCounts.entries
      .reduce((a, b) => a.value >= b.value ? a : b)
      .key;

  switch (dominant) {
    case 'rating':
      return (icon: Icons.star_half_rounded, color: AppColors.warning);
    case 'text':
      return (icon: Icons.edit_note_rounded, color: AppColors.brand);
    case 'single_choice':
      return (
        icon: Icons.radio_button_checked_rounded,
        color: AppColors.success,
      );
    case 'multiple_choice':
      return (icon: Icons.checklist_rounded, color: AppColors.purple);
    default:
      return (icon: Icons.poll_outlined, color: AppColors.brand);
  }
}

// ---------------------------------------------------------------------------
// サーベイリスト
// ---------------------------------------------------------------------------

class _SurveyList extends ConsumerWidget {
  const _SurveyList({
    required this.surveys,
    required this.completedIds,
    required this.emptyIcon,
    required this.emptyMessage,
    required this.onRefresh,
  });

  final List<PulseSurvey> surveys;
  final Set<String> completedIds;
  final IconData emptyIcon;
  final String emptyMessage;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (surveys.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(emptyIcon, size: 48, color: AppColors.textTertiary(context)),
            const SizedBox(height: AppSpacing.md),
            Text(
              emptyMessage,
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        itemCount: surveys.length,
        itemBuilder: (context, index) {
          final survey = surveys[index];
          final isCompleted = completedIds.contains(survey.id);
          final typeIcon = _surveyTypeIcon(survey);

          return InkWell(
            onTap: isCompleted
                ? null
                : () async {
                    await context.push(
                      '${AppRoutes.surveys}/${survey.id}',
                      extra: survey,
                    );
                    ref.invalidate(completedSurveyIdsProvider);
                  },
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.md,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (!isCompleted)
                        Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.only(right: AppSpacing.sm),
                          decoration: const BoxDecoration(
                            color: AppColors.brand,
                            shape: BoxShape.circle,
                          ),
                        ),

                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: typeIcon.color.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          typeIcon.icon,
                          size: 20,
                          color: typeIcon.color,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(width: AppSpacing.md),

                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                survey.title,
                                style: AppTextStyles.body1.copyWith(
                                  fontWeight: isCompleted
                                      ? FontWeight.w400
                                      : FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              _formatDate(survey.createdAt),
                              style: AppTextStyles.body2.copyWith(
                                color: AppColors.textSecondary(context),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),

                        if (survey.description != null) ...[
                          Text(
                            survey.description!,
                            style: AppTextStyles.body2.copyWith(
                              color: AppColors.textTertiary(context),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                        ],

                        Text(
                          _surveyMeta(survey),
                          style: AppTextStyles.body2.copyWith(
                            color: AppColors.textSecondary(context),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
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
// ヘルパー
// ---------------------------------------------------------------------------

String _formatDate(DateTime dt) {
  final now = DateTime.now();
  final local = dt.toLocal();
  if (local.year == now.year &&
      local.month == now.month &&
      local.day == now.day) {
    return DateFormat('HH:mm').format(local);
  }
  if (local.year == now.year) {
    return DateFormat('M/d').format(local);
  }
  return DateFormat('yyyy/M/d').format(local);
}

String _surveyMeta(PulseSurvey survey) {
  final parts = <String>[];
  parts.add('${survey.questions.length}問');

  final types = <String, int>{};
  for (final q in survey.questions) {
    types[q.type] = (types[q.type] ?? 0) + 1;
  }
  final labels = types.entries
      .map((e) {
        final label = _questionTypeLabel(e.key);
        return '$label${e.value}';
      })
      .join(' · ');
  if (labels.isNotEmpty) parts.add(labels);

  if (survey.deadline != null) {
    parts.add('締切 ${DateFormat('M/d').format(survey.deadline!.toLocal())}');
  }

  return parts.join('  ');
}

String _questionTypeLabel(String type) {
  switch (type) {
    case 'rating':
      return '評価';
    case 'text':
      return '記述';
    case 'single_choice':
      return '選択';
    case 'multiple_choice':
      return '複数選択';
    default:
      return type;
  }
}
