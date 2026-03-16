import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../domain/entities/calendar_event.dart';

/// Outlook スタイルのイベントカード（左カラーバー付き）
class EventCard extends StatelessWidget {
  const EventCard({
    super.key,
    required this.event,
    this.onTap,
  });

  final CalendarEvent event;
  final VoidCallback? onTap;

  Color get _categoryColor {
    try {
      final hex = event.categoryColor.replaceFirst('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return const Color(0xFF0F6CBD);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final timeFormat = DateFormat('HH:mm');

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: 3,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(8),
              border: isDark
                  ? Border.all(
                      color: theme.colorScheme.outline.withValues(alpha: 0.15),
                      width: 0.5,
                    )
                  : null,
              boxShadow: isDark
                  ? null
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 2,
                        offset: const Offset(0, 1),
                      ),
                    ],
            ),
            child: Row(
              children: [
                // 左カラーバー
                Container(
                  width: 4,
                  height: event.isAllDay ? 44 : 64,
                  decoration: BoxDecoration(
                    color: _categoryColor,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(8),
                      bottomLeft: Radius.circular(8),
                    ),
                  ),
                ),
                // コンテンツ
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 時間
                        if (!event.isAllDay)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Text(
                              '${timeFormat.format(event.startAt.toLocal())} - ${timeFormat.format(event.endAt.toLocal())}',
                              style: AppTextStyles.caption.copyWith(
                                color: theme.colorScheme.onSurface
                                    .withValues(alpha: 0.55),
                              ),
                            ),
                          )
                        else
                          Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Text(
                              '終日',
                              style: AppTextStyles.caption.copyWith(
                                color: _categoryColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        // タイトル
                        Text(
                          event.title,
                          style: AppTextStyles.bodySmall.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        // 場所
                        if (event.location != null &&
                            event.location!.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.location_on_outlined,
                                  size: 13,
                                  color: theme.colorScheme.onSurface
                                      .withValues(alpha: 0.45),
                                ),
                                const SizedBox(width: 3),
                                Expanded(
                                  child: Text(
                                    event.location!,
                                    style: AppTextStyles.label.copyWith(
                                      color: theme.colorScheme.onSurface
                                          .withValues(alpha: 0.45),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
