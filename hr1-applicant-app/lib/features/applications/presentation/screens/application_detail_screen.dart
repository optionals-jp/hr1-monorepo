import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/core/utils/date_formatter.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_status.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_step.dart';
import 'package:hr1_applicant_app/features/applications/presentation/controllers/application_detail_controller.dart';
import 'package:hr1_applicant_app/features/applications/presentation/controllers/withdraw_controller.dart';
import 'package:hr1_applicant_app/features/applications/presentation/controllers/offer_response_controller.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';
import 'package:hr1_applicant_app/features/forms/presentation/screens/form_fill_screen.dart';
import 'package:hr1_applicant_app/features/applications/presentation/widgets/screening_submit_sheet.dart';
import 'package:hr1_applicant_app/features/interviews/presentation/screens/interview_schedule_screen.dart';
import 'package:hr1_applicant_app/features/interviews/presentation/providers/interviews_providers.dart';
import 'package:hr1_applicant_app/features/todos/presentation/providers/todo_providers.dart';

/// 応募詳細画面
class ApplicationDetailScreen extends ConsumerWidget {
  const ApplicationDetailScreen({super.key, required this.applicationId});

  final String applicationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(applicationDetailControllerProvider(applicationId));

    final asyncApplication = ref.watch(
      applicationDetailProvider(applicationId),
    );

    return CommonScaffold(
      body: asyncApplication.when(
        data: (application) {
          if (application == null) {
            return const ErrorState(message: '応募情報が見つかりません');
          }
          return _Body(application: application);
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () =>
              ref.invalidate(applicationDetailProvider(applicationId)),
        ),
      ),
    );
  }
}

// =============================================================================
// Body — タブ付きレイアウト
// =============================================================================

class _Body extends StatelessWidget {
  const _Body({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          // AppBar（戻るボタンのみ、常にピン留め）
          const SliverAppBar(pinned: true),
          // ヘッダー（スクロールで隠れる）
          SliverToBoxAdapter(child: _Header(application: application)),
          // タブバー（ピン留め）
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              const TabBar(
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                tabs: [
                  Tab(text: '概要'),
                  Tab(text: 'ステップ'),
                  Tab(text: '履歴'),
                  Tab(text: 'タスク'),
                ],
              ),
            ),
          ),
        ],
        body: TabBarView(
          children: [
            _OverviewTab(application: application),
            _StepsTab(application: application),
            _HistoryTab(application: application),
            _TasksTab(application: application),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// 概要タブ
// =============================================================================

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final job = application.job;
    final currentStep = application.currentStep;
    final completedCount = application.steps
        .where((s) => s.status == StepStatus.completed)
        .length;
    final totalSteps = application.steps.length;

    final isActive = application.status.isActive;

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      children: [
        // 内定応答カード（offered の場合）
        if (application.status.canRespondToOffer) ...[
          _OfferResponseCard(application: application),
          const SizedBox(height: AppSpacing.lg),
        ],

        // 終了ステータスバナー（辞退・不採用・内定承諾・内定辞退）
        if (!isActive && !application.status.canRespondToOffer) ...[
          _TerminalStatusBanner(application: application),
          const SizedBox(height: AppSpacing.lg),
        ],

        // 次のアクション（選考中のみ）
        if (isActive && currentStep != null && currentStep.requiresAction) ...[
          _NextActionCard(application: application, step: currentStep),
          const SizedBox(height: AppSpacing.lg),
        ],

        // 担当者確認待ち
        if (isActive && currentStep != null && currentStep.isUnderReview) ...[
          _UnderReviewCard(step: currentStep),
          const SizedBox(height: AppSpacing.lg),
        ],

        // ステータスカード
        CommonCard(
          margin: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('選考状況', style: AppTextStyles.callout),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  StatusChip(
                    label: application.currentStepLabel,
                    color: _applicationColor(application, context),
                  ),
                  if (isActive) ...[
                    const Spacer(),
                    Text(
                      '$completedCount / $totalSteps ステップ完了',
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                    ),
                  ],
                ],
              ),
              if (isActive && totalSteps > 0) ...[
                const SizedBox(height: AppSpacing.md),
                ClipRRect(
                  borderRadius: AppRadius.radius80,
                  child: LinearProgressIndicator(
                    value: totalSteps > 0 ? completedCount / totalSteps : 0,
                    minHeight: 6,
                    backgroundColor: AppColors.brand.withValues(alpha: 0.15),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.brand,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.lg),

        // 求人情報
        CommonCard(
          margin: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('求人情報', style: AppTextStyles.callout),
              const SizedBox(height: AppSpacing.md),
              _InfoRow(label: 'ポジション', value: job?.title ?? '-'),
              _InfoRow(label: '部署', value: job?.department ?? '-'),
              _InfoRow(label: '勤務地', value: job?.location ?? '-'),
              _InfoRow(label: '雇用形態', value: job?.employmentType ?? '-'),
              _InfoRow(
                label: '応募日',
                value: DateFormatter.toShortDate(application.appliedAt),
              ),
            ],
          ),
        ),

        // 辞退ボタン（選考中・内定承諾済みの場合のみ表示）
        if (application.status == ApplicationStatus.active ||
            application.status == ApplicationStatus.offerAccepted) ...[
          const SizedBox(height: AppSpacing.xxxl),
          Center(
            child: TextButton(
              onPressed: () => _confirmWithdraw(context, ref),
              child: Text(
                'この応募を辞退する',
                style: AppTextStyles.body2.copyWith(color: AppColors.error),
              ),
            ),
          ),
        ],

        const SizedBox(height: AppSpacing.xxxl),
      ],
    );
  }

  Future<void> _confirmWithdraw(BuildContext context, WidgetRef ref) async {
    final confirmed = await CommonDialog.confirm(
      context: context,
      title: '応募辞退',
      message: 'この応募を辞退しますか？\nこの操作は取り消せません。',
      confirmLabel: '辞退する',
      isDestructive: true,
    );
    if (!confirmed || !context.mounted) return;

    try {
      await ref
          .read(withdrawControllerProvider.notifier)
          .withdraw(applicationId: application.id);
      if (!context.mounted) return;
      CommonSnackBar.show(context, '応募を辞退しました');
      context.pop();
    } catch (e) {
      if (!context.mounted) return;
      CommonSnackBar.error(context, '辞退に失敗しました');
    }
  }
}

class _TerminalStatusBanner extends StatelessWidget {
  const _TerminalStatusBanner({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final (
      String label,
      Color color,
      IconData icon,
    ) = switch (application.status) {
      ApplicationStatus.withdrawn => (
        '辞退済みです',
        AppColors.textSecondary(context),
        Icons.block_rounded,
      ),
      ApplicationStatus.rejected => (
        '不採用となりました',
        AppColors.error,
        Icons.cancel_outlined,
      ),
      ApplicationStatus.offered => (
        '内定を獲得しました',
        AppColors.success,
        Icons.celebration_rounded,
      ),
      ApplicationStatus.offerAccepted => (
        '内定を承諾しました',
        AppColors.success,
        Icons.check_circle_rounded,
      ),
      ApplicationStatus.offerDeclined => (
        '内定を辞退しました',
        AppColors.textSecondary(context),
        Icons.cancel_outlined,
      ),
      _ => ('', AppColors.textSecondary(context), Icons.info_outline),
    };

    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 22, color: color),
          const SizedBox(width: AppSpacing.md),
          Text(label, style: AppTextStyles.callout.copyWith(color: color)),
        ],
      ),
    );
  }
}

class _OfferResponseCard extends ConsumerWidget {
  const _OfferResponseCard({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.08),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.celebration_rounded,
                size: 22,
                color: AppColors.success,
              ),
              const SizedBox(width: AppSpacing.md),
              Text(
                '内定を獲得しました',
                style: AppTextStyles.callout.copyWith(color: AppColors.success),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text('内定への回答をお願いします。', style: AppTextStyles.body2),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            width: double.infinity,
            child: CommonButton(
              onPressed: () => _confirmAccept(context, ref),
              child: const Text('内定を承諾する'),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: CommonButton.outline(
              onPressed: () => _confirmDecline(context, ref),
              child: const Text('内定を辞退する'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmAccept(BuildContext context, WidgetRef ref) async {
    final confirmed = await CommonDialog.confirm(
      context: context,
      title: '内定承諾',
      message: '内定を承諾しますか？',
      confirmLabel: '承諾する',
    );
    if (!confirmed || !context.mounted) return;

    try {
      await ref
          .read(offerResponseControllerProvider.notifier)
          .accept(applicationId: application.id);
      if (!context.mounted) return;
      CommonSnackBar.show(context, '内定を承諾しました');
    } catch (e) {
      if (!context.mounted) return;
      CommonSnackBar.error(context, '処理に失敗しました');
    }
  }

  Future<void> _confirmDecline(BuildContext context, WidgetRef ref) async {
    final confirmed = await CommonDialog.confirm(
      context: context,
      title: '内定辞退',
      message: '内定を辞退しますか？\nこの操作は取り消せません。',
      confirmLabel: '辞退する',
      isDestructive: true,
    );
    if (!confirmed || !context.mounted) return;

    try {
      await ref
          .read(offerResponseControllerProvider.notifier)
          .decline(applicationId: application.id);
      if (!context.mounted) return;
      CommonSnackBar.show(context, '内定を辞退しました');
    } catch (e) {
      if (!context.mounted) return;
      CommonSnackBar.error(context, '処理に失敗しました');
    }
  }
}

class _NextActionCard extends ConsumerWidget {
  const _NextActionCard({required this.application, required this.step});
  final Application application;
  final ApplicationStep step;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.08),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.notifications_active_rounded,
                size: 18,
                color: AppColors.warning,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                '次のアクション',
                style: AppTextStyles.callout.copyWith(color: AppColors.warning),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(_actionDescription(step), style: AppTextStyles.body2),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: CommonButton(
              onPressed: () =>
                  _handleStepAction(context, ref, application, step),
              child: Text(_actionLabel(step)),
            ),
          ),
        ],
      ),
    );
  }

  String _actionLabel(ApplicationStep step) {
    if (step.stepType == StepType.screening) {
      return step.formId != null ? 'アンケートに回答する' : '書類を提出する';
    }
    return switch (step.stepType) {
      StepType.form => 'アンケートに回答する',
      StepType.interview => '面接日程を選択する',
      _ => step.label,
    };
  }

  String _actionDescription(ApplicationStep step) {
    final screeningLabel = _screeningTypeLabel(step.screeningType);
    if (step.stepType == StepType.screening) {
      return step.formId != null
          ? '「${step.label}」への回答が必要です。'
          : '$screeningLabelの提出が必要です。';
    }
    return switch (step.stepType) {
      StepType.form => '「${step.label}」への回答が必要です。',
      StepType.interview => '面接の日程を選択してください。',
      _ => '「${step.label}」の対応が必要です。',
    };
  }

  static String _screeningTypeLabel(String? type) {
    return switch (type) {
      'resume' => '履歴書',
      'cv' => '職務経歴書',
      'portfolio' => 'ポートフォリオ',
      'entry_sheet' => 'エントリーシート',
      'other' => '書類',
      _ => '書類',
    };
  }

  Future<void> _handleStepAction(
    BuildContext context,
    WidgetRef ref,
    Application application,
    ApplicationStep step,
  ) async {
    // screening + form_id → フォーム画面を開く
    if (step.stepType == StepType.screening && step.formId != null) {
      await _openFormScreen(context, step.formId!, application.id, step.id);
      return;
    }

    // screening + ファイルアップロード
    if (step.stepType == StepType.screening) {
      final docLabel = _screeningTypeLabel(step.screeningType);
      final submitted = await ScreeningSubmitSheet.show(
        context,
        stepId: step.id,
        applicationId: application.id,
        docLabel: docLabel,
      );
      if (submitted != true || !context.mounted) return;
      ref.invalidate(applicationDetailProvider(application.id));
      ref.invalidate(applicationsProvider);
      CommonSnackBar.show(context, '$docLabelを提出しました');
      return;
    }

    // form / interview
    if (step.relatedId == null) return;
    switch (step.stepType) {
      case StepType.form:
        await _openFormScreen(
          context,
          step.relatedId!,
          application.id,
          step.id,
        );
      case StepType.interview:
        Navigator.of(context).push(
          PageRouteBuilder<void>(
            fullscreenDialog: true,
            pageBuilder: (_, __, ___) => InterviewScheduleScreen(
              interviewId: step.relatedId!,
              applicationId: application.id,
              stepId: step.id,
            ),
            transitionsBuilder: (_, animation, __, child) {
              return SlideTransition(
                position:
                    Tween<Offset>(
                      begin: const Offset(0, 1),
                      end: Offset.zero,
                    ).animate(
                      CurvedAnimation(
                        parent: animation,
                        curve: Curves.easeOutCubic,
                      ),
                    ),
                child: child,
              );
            },
          ),
        );
      default:
        break;
    }
  }

  Future<void> _openFormScreen(
    BuildContext context,
    String formId,
    String applicationId,
    String stepId,
  ) {
    return Navigator.of(context).push(
      PageRouteBuilder<void>(
        fullscreenDialog: true,
        pageBuilder: (_, __, ___) => FormFillScreen(
          formId: formId,
          applicationId: applicationId,
          stepId: stepId,
        ),
        transitionsBuilder: (_, animation, __, child) {
          return SlideTransition(
            position: Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
                .animate(
                  CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeOutCubic,
                  ),
                ),
            child: child,
          );
        },
      ),
    );
  }
}

class _UnderReviewCard extends StatelessWidget {
  const _UnderReviewCard({required this.step});
  final ApplicationStep step;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.06),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.hourglass_top_rounded,
                size: 18,
                color: AppColors.brand,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                '確認中',
                style: AppTextStyles.callout.copyWith(color: AppColors.brand),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '提出された内容を確認しています。\n担当者の確認が完了するまでお待ちください。',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
          ),
          Expanded(child: Text(value, style: AppTextStyles.body2)),
        ],
      ),
    );
  }
}

// =============================================================================
// ステップタブ
// =============================================================================

class _StepsTab extends ConsumerWidget {
  const _StepsTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final steps = application.steps;
    if (steps.isEmpty) {
      return Center(
        child: Text(
          '選考ステップがありません',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      itemCount: steps.length,
      itemBuilder: (context, index) {
        final step = steps[index];
        final isLast = index == steps.length - 1;
        return _StepCard(step: step, isLast: isLast);
      },
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({required this.step, required this.isLast});
  final ApplicationStep step;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 32,
            child: Column(
              children: [
                _StepDot(step: step),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: step.status == StepStatus.completed
                          ? AppColors.success
                          : AppColors.divider(context),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: step.status == StepStatus.inProgress
                    ? AppColors.brand.withValues(alpha: 0.05)
                    : AppColors.surface(context),
                borderRadius: AppRadius.radius120,
                border: Border.all(
                  color: step.status == StepStatus.inProgress
                      ? AppColors.brand.withValues(alpha: 0.2)
                      : AppColors.divider(context),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          step.label,
                          style: AppTextStyles.body2.copyWith(
                            fontWeight: step.status == StepStatus.inProgress
                                ? FontWeight.w600
                                : FontWeight.w400,
                            color: step.status == StepStatus.pending
                                ? AppColors.textSecondary(context)
                                : AppColors.textPrimary(context),
                          ),
                        ),
                      ),
                      if (step.isAdHoc)
                        Container(
                          margin: const EdgeInsets.only(left: 6),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.warning.withValues(alpha: 0.15),
                            borderRadius: AppRadius.radius40,
                          ),
                          child: Text(
                            '追加',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      if (step.stepType == StepType.externalTest)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.textSecondary(
                              context,
                            ).withValues(alpha: 0.1),
                            borderRadius: AppRadius.radius40,
                          ),
                          child: Text(
                            '外部',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(context),
                            ),
                          ),
                        ),
                      if (step.isOptional)
                        Container(
                          margin: const EdgeInsets.only(left: 6),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.textSecondary(
                              context,
                            ).withValues(alpha: 0.1),
                            borderRadius: AppRadius.radius40,
                          ),
                          child: Text(
                            '任意',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(context),
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (step.description != null &&
                      step.description!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.textSecondary(
                          context,
                        ).withValues(alpha: 0.06),
                        borderRadius: AppRadius.radius80,
                      ),
                      child: Text(
                        step.description!,
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textPrimary(context),
                        ),
                      ),
                    ),
                  ],
                  if (step.requiresAction) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppColors.warning,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '対応が必要です',
                          style: AppTextStyles.caption2.copyWith(
                            color: AppColors.warning,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (step.isUnderReview) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.hourglass_top_rounded,
                          size: 12,
                          color: AppColors.brand,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '確認中',
                          style: AppTextStyles.caption2.copyWith(
                            color: AppColors.brand,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (step.stepType == StepType.interview &&
                      step.relatedId != null &&
                      step.status != StepStatus.pending)
                    _InterviewDateLabel(
                      interviewId: step.relatedId!,
                      applicationId: step.applicationId,
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  const _StepDot({required this.step});
  final ApplicationStep step;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Widget? icon) = switch (step.status) {
      StepStatus.completed => (
        AppColors.success,
        const Icon(Icons.check_rounded, size: 14, color: Colors.white),
      ),
      StepStatus.inProgress => (
        AppColors.brand,
        Container(
          width: 8,
          height: 8,
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
          ),
        ),
      ),
      StepStatus.skipped => (
        AppColors.divider(context),
        Icon(Icons.remove, size: 14, color: AppColors.textSecondary(context)),
      ),
      StepStatus.pending => (AppColors.divider(context), null),
    };

    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(shape: BoxShape.circle, color: bg),
      child: icon != null ? Center(child: icon) : null,
    );
  }
}

// =============================================================================
// 履歴タブ
// =============================================================================

class _HistoryTab extends StatelessWidget {
  const _HistoryTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final events = _buildHistoryEvents(application, context);

    if (events.isEmpty) {
      return Center(
        child: Text(
          '履歴がありません',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        final isLast = index == events.length - 1;

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: 32,
                child: Column(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      margin: const EdgeInsets.only(top: 6),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: event.color.withValues(alpha: 0.2),
                        border: Border.all(
                          color: event.color,
                          width: AppStroke.strokeWidth20,
                        ),
                      ),
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 1,
                          color: AppColors.lightDivider,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              event.title,
                              style: AppTextStyles.body2.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          Text(
                            DateFormatter.toDateTime(event.dateTime),
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(context),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        event.subtitle,
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(context),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  List<_HistoryEvent> _buildHistoryEvents(
    Application application,
    BuildContext context,
  ) {
    final events = <_HistoryEvent>[];

    events.add(
      _HistoryEvent(
        title: '応募しました',
        subtitle: application.job?.title ?? '求人',
        dateTime: application.appliedAt,
        color: AppColors.brand,
      ),
    );

    for (final step in application.steps) {
      if (step.startedAt != null) {
        events.add(
          _HistoryEvent(
            title: '${step.label} - 開始',
            subtitle: _stepTypeLabel(step.stepType),
            dateTime: step.startedAt!,
            color: AppColors.brand,
          ),
        );
      }

      if (step.status == StepStatus.completed && step.completedAt != null) {
        events.add(
          _HistoryEvent(
            title: '${step.label} - 完了',
            subtitle: _stepTypeLabel(step.stepType),
            dateTime: step.completedAt!,
            color: AppColors.success,
          ),
        );
      }

      if (step.status == StepStatus.skipped) {
        events.add(
          _HistoryEvent(
            title: '${step.label} - スキップ',
            subtitle: _stepTypeLabel(step.stepType),
            dateTime:
                step.completedAt ?? step.startedAt ?? application.appliedAt,
            color: AppColors.textSecondary(context),
          ),
        );
      }
    }

    if (application.status == ApplicationStatus.rejected) {
      events.add(
        _HistoryEvent(
          title: '選考結果のお知らせ',
          subtitle: application.job?.title ?? '求人',
          dateTime: application.updatedAt ?? application.appliedAt,
          color: AppColors.error,
        ),
      );
    }

    if (application.status == ApplicationStatus.withdrawn) {
      events.add(
        _HistoryEvent(
          title: '応募を辞退しました',
          subtitle: application.job?.title ?? '求人',
          dateTime: application.updatedAt ?? application.appliedAt,
          color: AppColors.textSecondary(context),
        ),
      );
    }

    if (application.status == ApplicationStatus.offerAccepted) {
      events.add(
        _HistoryEvent(
          title: '内定を承諾しました',
          subtitle: application.job?.title ?? '求人',
          dateTime: application.updatedAt ?? application.appliedAt,
          color: AppColors.success,
        ),
      );
    }

    if (application.status == ApplicationStatus.offerDeclined) {
      events.add(
        _HistoryEvent(
          title: '内定を辞退しました',
          subtitle: application.job?.title ?? '求人',
          dateTime: application.updatedAt ?? application.appliedAt,
          color: AppColors.textSecondary(context),
        ),
      );
    }

    events.sort((a, b) => b.dateTime.compareTo(a.dateTime));
    return events;
  }

  String _stepTypeLabel(StepType type) {
    return switch (type) {
      StepType.screening => '書類アップロード',
      StepType.form => 'アンケート/フォーム',
      StepType.interview => '面接',
      StepType.externalTest => '外部テスト',
      StepType.offer => '内定',
    };
  }
}

// =============================================================================
// タスクタブ
// =============================================================================

class _TasksTab extends ConsumerWidget {
  const _TasksTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todosAsync = ref.watch(allTodosProvider);

    return todosAsync.when(
      loading: () => const LoadingIndicator(),
      error: (e, _) =>
          ErrorState(onRetry: () => ref.invalidate(allTodosProvider)),
      data: (todos) {
        // この応募に関連するタスクをフィルタ
        final related = todos
            .where(
              (t) =>
                  t.sourceId == application.id ||
                  t.actionUrl?.contains(application.id) == true,
            )
            .toList();

        if (related.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.task_alt,
                  size: 48,
                  color: AppColors.textSecondary(context),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'この応募に関連するタスクはありません',
                  style: AppTextStyles.body2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          itemCount: related.length,
          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
          itemBuilder: (context, index) {
            final todo = related[index];
            return CommonCard(
              margin: EdgeInsets.zero,
              child: Row(
                children: [
                  Icon(
                    todo.isCompleted
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                    size: 22,
                    color: todo.isCompleted
                        ? AppColors.success
                        : AppColors.textSecondary(context),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          todo.title,
                          style: AppTextStyles.body2.copyWith(
                            decoration: todo.isCompleted
                                ? TextDecoration.lineThrough
                                : null,
                            color: todo.isCompleted
                                ? AppColors.textSecondary(context)
                                : null,
                          ),
                        ),
                        if (todo.dueDate != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            '期限: ${DateFormatter.toShortDate(todo.dueDate!)}',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(context),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

// =============================================================================
// Interview Date Label
// =============================================================================

class _InterviewDateLabel extends ConsumerWidget {
  const _InterviewDateLabel({
    required this.interviewId,
    required this.applicationId,
  });
  final String interviewId;
  final String applicationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncInterview = ref.watch(interviewDetailProvider(interviewId));

    return asyncInterview.when(
      data: (interview) {
        if (interview == null) return const SizedBox.shrink();
        // 自分の応募で選択したスロットのみ表示
        final mySlot = interview.slots
            .where((s) => s.applicationId == applicationId && s.isSelected)
            .firstOrNull;
        if (mySlot == null) {
          return Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              '日程調整中',
              style: AppTextStyles.caption2.copyWith(color: AppColors.warning),
            ),
          );
        }
        return Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(
            children: [
              Icon(Icons.event_rounded, size: 14, color: AppColors.success),
              const SizedBox(width: 4),
              Text(
                '${DateFormatter.toDateTimeWithWeekday(mySlot.startAt)} 〜 ${DateFormatter.toTime(mySlot.endAt)}',
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

// =============================================================================
// Header
// =============================================================================

class _Header extends StatelessWidget {
  const _Header({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final job = application.job;
    final color = _applicationColor(application, context);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.lg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (job != null)
                OrgIcon(
                  initial: job.title.isNotEmpty ? job.title[0] : '?',
                  size: 48,
                  borderRadius: 12,
                ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job?.title ?? '求人',
                      style: AppTextStyles.headline,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (job?.department != null)
                      Text(
                        job!.department!,
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(context),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              StatusChip(label: application.currentStepLabel, color: color),
              const SizedBox(width: 12),
              Text(
                '応募日 ${DateFormatter.toShortDate(application.appliedAt)}',
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Shared

// =============================================================================

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  const _TabBarDelegate(this.tabBar);
  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(color: AppColors.surface(context), child: tabBar);
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => false;
}

class _HistoryEvent {
  const _HistoryEvent({
    required this.title,
    required this.subtitle,
    required this.dateTime,
    required this.color,
  });

  final String title;
  final String subtitle;
  final DateTime dateTime;
  final Color color;
}

Color _applicationColor(Application application, BuildContext context) {
  return switch (application.status) {
    ApplicationStatus.offered => AppColors.success,
    ApplicationStatus.offerAccepted => AppColors.success,
    ApplicationStatus.offerDeclined => AppColors.textSecondary(context),
    ApplicationStatus.rejected => AppColors.error,
    ApplicationStatus.withdrawn => AppColors.textSecondary(context),
    ApplicationStatus.active => () {
      if (application.requiresAction) return AppColors.warning;
      return AppColors.brand;
    }(),
  };
}
