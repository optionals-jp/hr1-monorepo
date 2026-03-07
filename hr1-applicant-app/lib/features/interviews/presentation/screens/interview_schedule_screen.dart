import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../domain/entities/interview.dart';
import '../../domain/entities/interview_slot.dart';
import '../providers/interviews_providers.dart';

/// 面接日程調整画面
class InterviewScheduleScreen extends ConsumerWidget {
  const InterviewScheduleScreen({
    super.key,
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
        if (interview == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('面接日程')),
            body: const Center(child: Text('面接情報が見つかりません')),
          );
        }

        final selectedSlotId = ref.watch(selectedSlotProvider(interviewId));

        return Scaffold(
          appBar: AppBar(title: const Text('面接日程の選択')),
          body: Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                  children: [
                    // 面接情報
                    _InterviewInfoCard(interview: interview),
                    const SizedBox(height: AppSpacing.xl),

                    // 候補日時セクション
                    Text('候補日時を選択してください',
                        style: AppTextStyles.subtitle),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      'ご都合の良い日時を1つ選択してください',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // スロット一覧
                    ...interview.slots.map((slot) => Padding(
                          padding:
                              const EdgeInsets.only(bottom: AppSpacing.md),
                          child: _SlotCard(
                            slot: slot,
                            isSelected: selectedSlotId == slot.id,
                            onTap: () {
                              ref
                                  .read(selectedSlotProvider(interviewId)
                                      .notifier)
                                  .state = slot.id;
                            },
                          ),
                        )),
                  ],
                ),
              ),

              // 確定ボタン
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: selectedSlotId != null
                          ? () => _confirm(context, ref, interview,
                              selectedSlotId)
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryLight,
                        foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        disabledBackgroundColor:
                            Theme.of(context).dividerColor,
                        padding: const EdgeInsets.symmetric(
                            vertical: AppSpacing.md),
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(AppSpacing.buttonRadius),
                        ),
                      ),
                      child: const Text('この日程で確定する'),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => const Scaffold(body: Center(child: Text('エラーが発生しました'))),
    );
  }

  void _confirm(BuildContext context, WidgetRef ref,
      Interview interview, String slotId) {
    final slot =
        interview.slots.where((s) => s.id == slotId).firstOrNull;
    if (slot == null) return;

    final dateFormat = DateFormat('M月d日(E) HH:mm', 'ja');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('日程確定'),
        content: Text(
          '${dateFormat.format(slot.startAt)} 〜 ${DateFormat('HH:mm').format(slot.endAt)}\n\nこの日程で確定しますか？',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('キャンセル'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
              ref.invalidate(selectedSlotProvider(interviewId));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('面接日程を確定しました'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryLight,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
            ),
            child: const Text('確定する'),
          ),
        ],
      ),
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
        color: AppColors.primaryLight.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(
          color: AppColors.primaryLight.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.videocam_outlined,
                  size: 20, color: AppColors.primaryLight),
              const SizedBox(width: AppSpacing.sm),
              Text('面接情報', style: AppTextStyles.subtitle),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (interview.location != null) ...[
            Text('場所: ${interview.location!}',
                style: AppTextStyles.body),
            const SizedBox(height: AppSpacing.xs),
          ],
          Text('所要時間: 約${interview.slots.firstOrNull?.durationMinutes ?? 60}分',
              style: AppTextStyles.body),
          if (interview.notes != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(interview.notes!, style: AppTextStyles.bodySmall.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            )),
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
    final theme = Theme.of(context);
    final dateFormat = DateFormat('M月d日(E)', 'ja');
    final timeFormat = DateFormat('HH:mm');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryLight.withValues(alpha: 0.08)
              : theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
          border: Border.all(
            color: isSelected
                ? AppColors.primaryLight
                : theme.dividerColor,
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
                      ? AppColors.primaryLight
                      : theme.dividerColor,
                  width: 2,
                ),
                color: isSelected
                    ? AppColors.primaryLight
                    : Colors.transparent,
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
                    style: AppTextStyles.subtitle,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    '${timeFormat.format(slot.startAt)} 〜 ${timeFormat.format(slot.endAt)}',
                    style: AppTextStyles.body.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
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
