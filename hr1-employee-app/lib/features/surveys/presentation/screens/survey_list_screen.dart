import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../domain/entities/pulse_survey.dart';
import '../providers/survey_providers.dart';

/// パルスサーベイ一覧画面
class SurveyListScreen extends ConsumerStatefulWidget {
  const SurveyListScreen({super.key});

  @override
  ConsumerState<SurveyListScreen> createState() => _SurveyListScreenState();
}

class _SurveyListScreenState extends ConsumerState<SurveyListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final surveysAsync = ref.watch(activeSurveysProvider);
    final completedAsync = ref.watch(completedSurveyIdsProvider);

    return CommonScaffold(
      appBar: AppBar(
        title: Text('パルスサーベイ', style: AppTextStyles.headline),
        bottom: TabBar(
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          controller: _tabController,
          labelStyle: AppTextStyles.body2,
          tabs: const [
            Tab(text: '未回答'),
            Tab(text: '回答済み'),
          ],
        ),
      ),
      body: surveysAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () {
            ref.invalidate(activeSurveysProvider);
            ref.invalidate(completedSurveyIdsProvider);
          },
        ),
        data: (surveys) {
          final completedIds = completedAsync.valueOrNull ?? <String>{};
          final pending = surveys
              .where((s) => !completedIds.contains(s.id))
              .toList();
          final completed = surveys
              .where((s) => completedIds.contains(s.id))
              .toList();

          return TabBarView(
            controller: _tabController,
            children: [
              _SurveyList(
                surveys: pending,
                completedIds: completedIds,
                emptyIcon: Icons.assignment_outlined,
                emptyMessage: '未回答のサーベイはありません',
                onRefresh: () => _refresh(ref),
              ),
              _SurveyList(
                surveys: completed,
                completedIds: completedIds,
                emptyIcon: Icons.check_circle_outline,
                emptyMessage: '回答済みのサーベイはありません',
                onRefresh: () => _refresh(ref),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(activeSurveysProvider);
    ref.invalidate(completedSurveyIdsProvider);
    await ref.read(activeSurveysProvider.future);
  }
}

// ---------------------------------------------------------------------------
// サーベイ種別アイコン判定
// ---------------------------------------------------------------------------

/// サーベイの質問構成から代表アイコンと色を決定
({IconData icon, Color color}) _surveyTypeIcon(PulseSurvey survey) {
  if (survey.questions.isEmpty) {
    return (icon: Icons.poll_outlined, color: AppColors.brandPrimary);
  }

  // 最も多い質問タイプで代表アイコンを決定
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
      return (icon: Icons.edit_note_rounded, color: AppColors.brandPrimary);
    case 'single_choice':
      return (
        icon: Icons.radio_button_checked_rounded,
        color: AppColors.success,
      );
    case 'multiple_choice':
      return (icon: Icons.checklist_rounded, color: AppColors.purple);
    default:
      return (icon: Icons.poll_outlined, color: AppColors.brandPrimary);
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
    final theme = Theme.of(context);

    if (surveys.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              emptyIcon,
              size: 48,
              color: AppColors.textTertiary(theme.brightness),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              emptyMessage,
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary(theme.brightness),
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
                      // 未読インジケーター
                      if (!isCompleted)
                        Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.only(right: AppSpacing.sm),
                          decoration: const BoxDecoration(
                            color: AppColors.brandPrimary,
                            shape: BoxShape.circle,
                          ),
                        ),

                      // アイコン
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

                  // コンテンツ
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // タイトル行
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
                            // 日付
                            Text(
                              _formatDate(survey.createdAt),
                              style: AppTextStyles.body2.copyWith(
                                color: AppColors.textSecondary(
                                  theme.brightness,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),

                        // 説明文（プレビュー行）
                        if (survey.description != null) ...[
                          Text(
                            survey.description!,
                            style: AppTextStyles.body2.copyWith(
                              color: AppColors.textTertiary(theme.brightness),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                        ],

                        // メタ情報（問数 + 種別）
                        Text(
                          _surveyMeta(survey),
                          style: AppTextStyles.body2.copyWith(
                            color: AppColors.textSecondary(theme.brightness),
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

  // 質問タイプの内訳
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
