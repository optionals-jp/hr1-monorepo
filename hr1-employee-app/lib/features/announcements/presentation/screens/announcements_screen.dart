import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/announcements/domain/entities/announcement.dart';
import 'package:hr1_employee_app/features/announcements/presentation/providers/announcement_providers.dart';
import 'package:intl/intl.dart';

class AnnouncementsScreen extends ConsumerWidget {
  const AnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcementsAsync = ref.watch(allAnnouncementsProvider);

    return CommonScaffold(
      appBar: AppBar(title: const Text('お知らせ')),
      body: announcementsAsync.when(
        data: (announcements) => _Body(announcements: announcements),
        loading: () => const LoadingIndicator(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(allAnnouncementsProvider)),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.announcements});

  final List<Announcement> announcements;

  @override
  Widget build(BuildContext context) {
    if (announcements.isEmpty) {
      return EmptyState(
        icon: Icon(
          Icons.campaign_outlined,
          size: 48,
          color: AppColors.textTertiary(context),
        ),
        title: 'お知らせはありません',
      );
    }

    final pinned = announcements.where((a) => a.isPinned).toList();
    final others = announcements.where((a) => !a.isPinned).toList();

    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.md,
      ),
      children: [
        if (pinned.isNotEmpty) ...[
          _SectionHeader(label: '固定'),
          ...pinned.map((a) => _AnnouncementTile(announcement: a)),
          const SizedBox(height: AppSpacing.lg),
        ],
        if (others.isNotEmpty) ...[
          _SectionHeader(label: 'すべて'),
          ...others.map((a) => _AnnouncementTile(announcement: a)),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm, bottom: AppSpacing.sm),
      child: Text(
        label,
        style: AppTextStyles.caption2.copyWith(
          color: AppColors.textSecondary(context),
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _AnnouncementTile extends StatefulWidget {
  const _AnnouncementTile({required this.announcement});
  final Announcement announcement;

  @override
  State<_AnnouncementTile> createState() => _AnnouncementTileState();
}

class _AnnouncementTileState extends State<_AnnouncementTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final a = widget.announcement;
    final dateStr = DateFormat('yyyy/MM/dd').format(a.publishedAt.toLocal());

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface(context),
          borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
          border: Border.all(color: AppColors.border(context)),
          boxShadow: AppShadows.of4(context),
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
                    if (a.isPinned)
                      Padding(
                        padding: const EdgeInsets.only(right: AppSpacing.sm),
                        child: Icon(
                          Icons.push_pin,
                          size: 16,
                          color: AppColors.brand,
                        ),
                      ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            a.title,
                            style: AppTextStyles.body2.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: _expanded ? null : 2,
                            overflow: _expanded ? null : TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            dateStr,
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(context),
                            ),
                          ),
                        ],
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
                    AppSpacing.lg,
                    0,
                    AppSpacing.lg,
                    AppSpacing.lg,
                  ),
                  child: MarkdownBody(
                    data: a.body,
                    styleSheet: MarkdownStyleSheet(
                      p: AppTextStyles.body2.copyWith(
                        color: AppColors.textSecondary(context),
                        height: 1.6,
                      ),
                      h1: AppTextStyles.headline,
                      h2: AppTextStyles.body2.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      h3: AppTextStyles.body2.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
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
              ),
            ),
          ],
        ),
      ),
    );
  }
}
