import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/interviews/domain/entities/interview.dart';
import 'package:hr1_applicant_app/features/interviews/domain/entities/interview_slot.dart';
import 'package:hr1_applicant_app/features/interviews/presentation/controllers/interview_controller.dart';
import 'package:hr1_applicant_app/features/interviews/presentation/providers/interviews_providers.dart';

/// 面接日程調整画面
class InterviewScheduleScreen extends ConsumerWidget {
  const InterviewScheduleScreen({
    super.key,
    required this.interviewId,
    required this.applicationId,
    this.stepId,
  });

  final String interviewId;
  final String applicationId;
  final String? stepId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncInterview = ref.watch(interviewDetailProvider(interviewId));
    final controllerState = ref.watch(interviewControllerProvider(interviewId));

    // 確定成功時の処理
    ref.listen(interviewControllerProvider(interviewId), (prev, next) {
      if (next.confirmed && prev?.confirmed != true) {
        Navigator.pop(context);
        CommonSnackBar.show(context, '面接日程を確定しました');
      }
      if (next.error != null && prev?.error == null) {
        CommonSnackBar.show(context, next.error!);
      }
    });

    return CommonScaffold(
      appBar: AppBar(title: const Text('面接日程の選択')),
      body: asyncInterview.when(
        data: (interview) {
          if (interview == null) {
            return const ErrorState(message: '面接情報が見つかりません');
          }

          final selectedSlotId = ref.watch(selectedSlotProvider(interviewId));

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                  children: [
                    // 面接情報
                    _InterviewInfoCard(interview: interview),
                    const SizedBox(height: AppSpacing.xl),

                    // 候補日時セクション
                    Text('候補日時を選択してください', style: AppTextStyles.callout),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'ご都合の良い日時を1つ選択してください',
                      style: AppTextStyles.caption1.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // スロット一覧（未予約のスロットのみ表示）
                    ...interview.slots
                        .where((slot) => !slot.isBooked)
                        .map(
                          (slot) => Padding(
                            padding: const EdgeInsets.only(
                              bottom: AppSpacing.md,
                            ),
                            child: _SlotCard(
                              slot: slot,
                              isSelected: selectedSlotId == slot.id,
                              onTap: () {
                                ref
                                        .read(
                                          selectedSlotProvider(
                                            interviewId,
                                          ).notifier,
                                        )
                                        .state =
                                    slot.id;
                              },
                            ),
                          ),
                        ),
                  ],
                ),
              ),

              // 確定ボタン
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                  child: CommonButton(
                    onPressed: selectedSlotId != null
                        ? () =>
                              _confirm(context, ref, interview, selectedSlotId)
                        : null,
                    loading: controllerState.isSubmitting,
                    enabled: !controllerState.isSubmitting,
                    child: const Text('この日程で確定する'),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(interviewDetailProvider(interviewId)),
        ),
      ),
    );
  }

  Future<void> _confirm(
    BuildContext screenContext,
    WidgetRef ref,
    Interview interview,
    String slotId,
  ) async {
    final slot = interview.slots.where((s) => s.id == slotId).firstOrNull;
    if (slot == null) return;

    final dateFormat = DateFormat('M月d日(E) HH:mm', 'ja');

    final confirmed = await CommonDialog.confirm(
      context: screenContext,
      title: '日程確定',
      message:
          '${dateFormat.format(slot.startAt)} 〜 ${DateFormat('HH:mm').format(slot.endAt)}\n\nこの日程で確定しますか？',
      confirmLabel: '確定する',
    );
    if (!confirmed) return;

    ref
        .read(interviewControllerProvider(interviewId).notifier)
        .confirmSlot(
          slotId: slotId,
          applicationId: applicationId,
          stepId: stepId,
        );
  }
}

class _InterviewInfoCard extends StatelessWidget {
  const _InterviewInfoCard({required this.interview});
  final Interview interview;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.05),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.videocam_outlined, size: 20, color: AppColors.brand),
              const SizedBox(width: AppSpacing.sm),
              Text('面接情報', style: AppTextStyles.callout),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (interview.location != null) ...[
            Text('場所: ${interview.location!}', style: AppTextStyles.body2),
            const SizedBox(height: AppSpacing.xs),
          ],
          Text(
            '所要時間: 約${interview.slots.firstOrNull?.durationMinutes ?? 60}分',
            style: AppTextStyles.body2,
          ),
          if (interview.notes != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              interview.notes!,
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SlotCard extends StatelessWidget {
  const _SlotCard({
    required this.slot,
    required this.isSelected,
    required this.onTap,
  });

  final InterviewSlot slot;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('M月d日(E)', 'ja');
    final timeFormat = DateFormat('HH:mm');

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.radius120,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.brand.withValues(alpha: 0.08)
              : AppColors.surface(context),
          borderRadius: AppRadius.radius120,
          border: Border.all(
            color: isSelected ? AppColors.brand : AppColors.divider(context),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected
                      ? AppColors.brand
                      : AppColors.divider(context),
                  width: 2,
                ),
                color: isSelected ? AppColors.brand : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dateFormat.format(slot.startAt),
                    style: AppTextStyles.callout,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    '${timeFormat.format(slot.startAt)} 〜 ${timeFormat.format(slot.endAt)}',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
