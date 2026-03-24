import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/calendar/domain/entities/calendar_event.dart';
import 'package:hr1_employee_app/features/calendar/presentation/controllers/calendar_controller.dart';
import 'package:hr1_employee_app/features/calendar/presentation/providers/calendar_providers.dart';
import 'package:hr1_employee_app/features/calendar/presentation/widgets/day_view.dart';
import 'package:hr1_employee_app/features/calendar/presentation/widgets/event_card.dart';
import 'package:hr1_employee_app/features/calendar/presentation/widgets/mini_calendar.dart';

class CalendarScreen extends HookConsumerWidget {
  const CalendarScreen({super.key});

  static const _pageCenter = 10000;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCalendarExpanded = useState(false);
    final dayPageController = useMemoized(
      () => PageController(initialPage: _pageCenter),
    );
    final baseDate = useRef<DateTime?>(null);
    final isSyncing = useRef(false);

    useEffect(() => dayPageController.dispose, [dayPageController]);

    DateTime dateForPage(int page) {
      baseDate.value ??= ref.read(selectedDateProvider);
      return baseDate.value!.add(Duration(days: page - _pageCenter));
    }

    void showMonthPicker(BuildContext context, DateTime current) {
      var selectedYear = current.year;
      showModalBottomSheet<void>(
        context: context,
        useRootNavigator: true,
        builder: (ctx) {
          return StatefulBuilder(
            builder: (ctx, setSheetState) {
              return SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.chevron_left_rounded),
                            onPressed: () =>
                                setSheetState(() => selectedYear--),
                          ),
                          Text('$selectedYear年', style: AppTextStyles.headline),
                          IconButton(
                            icon: const Icon(Icons.chevron_right_rounded),
                            onPressed: () =>
                                setSheetState(() => selectedYear++),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      GridView.count(
                        crossAxisCount: 4,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        childAspectRatio: 2,
                        children: List.generate(12, (i) {
                          final month = i + 1;
                          final isCurrent =
                              selectedYear == current.year &&
                              month == current.month;
                          return GestureDetector(
                            onTap: () {
                              final controller = ref.read(
                                calendarControllerProvider.notifier,
                              );
                              controller.changeFocusedMonth(
                                DateTime(selectedYear, month),
                              );
                              controller.selectDate(
                                DateTime(selectedYear, month, 1),
                              );
                              Navigator.pop(ctx);
                            },
                            child: Container(
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: isCurrent
                                    ? AppColors.brand.withValues(alpha: 0.1)
                                    : null,
                                borderRadius: AppRadius.radius80,
                                border: isCurrent
                                    ? Border.all(
                                        color: AppColors.brand,
                                        width: 1.5,
                                      )
                                    : null,
                              ),
                              child: Text(
                                '$month月',
                                style: AppTextStyles.body2.copyWith(
                                  color: isCurrent
                                      ? AppColors.brand
                                      : AppColors.textPrimary(context),
                                  fontWeight: isCurrent
                                      ? FontWeight.w600
                                      : null,
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      );
    }

    void navigateToEventForm({CalendarEvent? event}) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => _EventFormSheet(event: event),
          fullscreenDialog: true,
        ),
      );
    }

    ref.listen<DateTime>(selectedDateProvider, (prev, next) {
      baseDate.value ??= next;
      final targetPage = _pageCenter + next.difference(baseDate.value!).inDays;
      if (dayPageController.hasClients &&
          dayPageController.page?.round() != targetPage) {
        isSyncing.value = true;
        dayPageController.jumpToPage(targetPage);
        isSyncing.value = false;
      }
    });

    final selectedDate = ref.watch(selectedDateProvider);
    final focusedMonth = ref.watch(focusedMonthProvider);
    final viewMode = ref.watch(calendarViewModeProvider);
    final eventDatesAsync = ref.watch(eventDatesProvider(focusedMonth));
    final monthLabel = DateFormat('yyyy年M月', 'ja').format(focusedMonth);

    final user = ref.watch(appUserProvider);

    PopupMenuItem<CalendarViewMode> viewMenuItem(
      CalendarViewMode mode,
      String label,
      Widget Function({double size, Color? color}) iconBuilder,
      CalendarViewMode current,
    ) {
      final isSelected = mode == current;
      return PopupMenuItem(
        value: mode,
        child: Row(
          children: [
            iconBuilder(size: 20, color: isSelected ? AppColors.brand : null),
            const SizedBox(width: 12),
            Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                color: isSelected ? AppColors.brand : null,
                fontWeight: isSelected ? FontWeight.w600 : null,
              ),
            ),
          ],
        ),
      );
    }

    return CommonScaffold(
      appBar: AppBar(
        titleSpacing: AppSpacing.screenHorizontal,
        title: Row(
          children: [
            OrgIcon(
              initial: (user?.organizationName ?? 'H').substring(0, 1),
              size: 32,
            ),
            const SizedBox(width: 10),
            GestureDetector(
              onTap: () => showMonthPicker(context, focusedMonth),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    monthLabel,
                    style: AppTextStyles.title1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 20,
                    color: AppColors.textSecondary(context),
                  ),
                ],
              ),
            ),
          ],
        ),
        centerTitle: false,
        actions: [
          TextButton(
            onPressed: () =>
                ref.read(calendarControllerProvider.notifier).goToToday(),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              '今日',
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.brand,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          PopupMenuButton<CalendarViewMode>(
            icon: AppIcons.nemuBoard(
              size: 20,
              color: AppColors.textSecondary(context),
            ),
            onSelected: (mode) {
              ref
                  .read(calendarControllerProvider.notifier)
                  .changeViewMode(mode);
            },
            itemBuilder: (_) => [
              viewMenuItem(
                CalendarViewMode.agenda,
                'アジェンダ',
                AppIcons.rowHorizontal,
                viewMode,
              ),
              viewMenuItem(
                CalendarViewMode.day,
                '日',
                AppIcons.rowVertical,
                viewMode,
              ),
              viewMenuItem(
                CalendarViewMode.threeDay,
                '3日',
                AppIcons.sliderVertical,
                viewMode,
              ),
            ],
          ),
          GestureDetector(
            onTap: () => context.push(AppRoutes.profileFullscreen),
            child: Padding(
              padding: const EdgeInsets.only(
                right: AppSpacing.screenHorizontal,
              ),
              child: UserAvatar(
                initial: (user?.displayName ?? user?.email ?? 'U').substring(
                  0,
                  1,
                ),
                size: 32,
                imageUrl: user?.avatarUrl,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          MiniCalendar(
            focusedMonth: focusedMonth,
            selectedDate: selectedDate,
            onDateSelected: (date) {
              ref.read(calendarControllerProvider.notifier).selectDate(date);
            },
            onMonthChanged: (month) {
              ref
                  .read(calendarControllerProvider.notifier)
                  .changeFocusedMonth(month);
            },
            isExpanded: isCalendarExpanded.value,
            onToggleExpand: () {
              isCalendarExpanded.value = !isCalendarExpanded.value;
            },
            eventDates: eventDatesAsync.valueOrNull ?? {},
          ),
          Divider(height: 0.5, color: AppColors.border(context)),
          Expanded(
            child: PageView.builder(
              controller: dayPageController,
              onPageChanged: (page) {
                if (isSyncing.value) return;
                final newDate = dateForPage(page);
                ref
                    .read(calendarControllerProvider.notifier)
                    .selectDate(newDate);
              },
              itemBuilder: (context, page) {
                final pageDate = dateForPage(page);
                return switch (viewMode) {
                  CalendarViewMode.agenda => _DayEventListView(
                    selectedDate: pageDate,
                    onEventTap: (event) => navigateToEventForm(event: event),
                  ),
                  CalendarViewMode.day => _DayViewWrapper(
                    selectedDate: pageDate,
                    onEventTap: (event) => navigateToEventForm(event: event),
                  ),
                  CalendarViewMode.threeDay => _ThreeDayViewWrapper(
                    selectedDate: pageDate,
                    onEventTap: (event) => navigateToEventForm(event: event),
                  ),
                };
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => navigateToEventForm(),
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        elevation: 2,
        child: const Icon(Icons.add_rounded),
      ),
    );
  }
}

class _DayEventListView extends ConsumerWidget {
  const _DayEventListView({
    required this.selectedDate,
    required this.onEventTap,
  });

  final DateTime selectedDate;
  final ValueChanged<CalendarEvent> onEventTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(dayEventsProvider(selectedDate)).valueOrNull ?? [];

    if (events.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcons.calendar(size: 48, color: AppColors.textTertiary(context)),
            const SizedBox(height: AppSpacing.md),
            Text(
              '予定はありません',
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
          ],
        ),
      );
    }

    final grouped = <DateTime, List<CalendarEvent>>{};
    for (final event in events) {
      final date = event.startAt.toLocal();
      final key = DateTime(date.year, date.month, date.day);
      grouped.putIfAbsent(key, () => []).add(event);
    }

    final sortedDates = grouped.keys.toList()..sort();

    return ListView.builder(
      padding: const EdgeInsets.only(top: AppSpacing.sm, bottom: 80),
      itemCount: sortedDates.length,
      itemBuilder: (context, index) {
        final date = sortedDates[index];
        final dayEvents = grouped[date]!;
        dayEvents.sort((a, b) {
          if (a.isAllDay && !b.isAllDay) return -1;
          if (!a.isAllDay && b.isAllDay) return 1;
          return a.startAt.compareTo(b.startAt);
        });

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _DateHeader(date: date),
            for (final event in dayEvents)
              EventCard(event: event, onTap: () => onEventTap(event)),
            const SizedBox(height: AppSpacing.sm),
          ],
        );
      },
    );
  }
}

class _DateHeader extends StatelessWidget {
  const _DateHeader({required this.date});
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final isToday = date == today;
    final isTomorrow = date == today.add(const Duration(days: 1));

    String label;
    if (isToday) {
      label = '今日 — ${DateFormat('M月d日（E）', 'ja').format(date)}';
    } else if (isTomorrow) {
      label = '明日 — ${DateFormat('M月d日（E）', 'ja').format(date)}';
    } else {
      label = DateFormat('M月d日（E）', 'ja').format(date);
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.md,
        AppSpacing.screenHorizontal,
        AppSpacing.xs,
      ),
      child: Text(
        label,
        style: AppTextStyles.caption2.copyWith(
          color: isToday ? AppColors.brand : AppColors.textSecondary(context),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _DayViewWrapper extends ConsumerWidget {
  const _DayViewWrapper({required this.selectedDate, required this.onEventTap});

  final DateTime selectedDate;
  final ValueChanged<CalendarEvent> onEventTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(dayEventsProvider(selectedDate));
    final punchesAsync = ref.watch(punchesByDateProvider(selectedDate));

    return DayView(
      date: selectedDate,
      events: eventsAsync.valueOrNull ?? [],
      punches: punchesAsync.valueOrNull ?? [],
      onEventTap: onEventTap,
    );
  }
}

class _ThreeDayViewWrapper extends ConsumerWidget {
  const _ThreeDayViewWrapper({
    required this.selectedDate,
    required this.onEventTap,
  });

  final DateTime selectedDate;
  final ValueChanged<CalendarEvent> onEventTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dates = List.generate(3, (i) => selectedDate.add(Duration(days: i)));

    return Row(
      children: dates.map((date) {
        final dayEvents = ref.watch(dayEventsProvider(date)).valueOrNull ?? [];

        return Expanded(
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: AppColors.border(context),
                      width: 0.5,
                    ),
                  ),
                ),
                child: Center(
                  child: Text(
                    DateFormat('d日（E）', 'ja').format(date),
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                      color: _isToday(date)
                          ? AppColors.brand
                          : AppColors.textPrimary(context),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: DayView(
                  date: date,
                  events: dayEvents,
                  onEventTap: onEventTap,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }
}

class _EventFormSheet extends HookConsumerWidget {
  const _EventFormSheet({this.event});
  final CalendarEvent? event;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isEditing = event != null;

    final titleController = useTextEditingController(text: event?.title ?? '');
    final descriptionController = useTextEditingController(
      text: event?.description ?? '',
    );
    final locationController = useTextEditingController(
      text: event?.location ?? '',
    );

    final startDateState = useState<DateTime>(() {
      if (event != null) {
        final start = event!.startAt.toLocal();
        return DateTime(start.year, start.month, start.day);
      }
      return ref.read(selectedDateProvider);
    }());
    final startTimeState = useState<TimeOfDay>(() {
      if (event != null) {
        final start = event!.startAt.toLocal();
        return TimeOfDay(hour: start.hour, minute: start.minute);
      }
      final now = DateTime.now();
      return TimeOfDay(hour: (now.hour + 1) % 24, minute: 0);
    }());
    final endDateState = useState<DateTime>(() {
      if (event != null) {
        final end = event!.endAt.toLocal();
        return DateTime(end.year, end.month, end.day);
      }
      return ref.read(selectedDateProvider);
    }());
    final endTimeState = useState<TimeOfDay>(() {
      if (event != null) {
        final end = event!.endAt.toLocal();
        return TimeOfDay(hour: end.hour, minute: end.minute);
      }
      final now = DateTime.now();
      return TimeOfDay(hour: (now.hour + 2) % 24, minute: 0);
    }());
    final isAllDay = useState(event?.isAllDay ?? false);
    final categoryColor = useState(event?.categoryColor ?? '#0F6CBD');

    final isSaving = ref.watch(eventFormControllerProvider);
    final dateFormat = DateFormat('yyyy/MM/dd（E）', 'ja');

    Future<void> pickDate(bool isStart) async {
      final picked = await showDatePicker(
        context: context,
        initialDate: isStart ? startDateState.value : endDateState.value,
        firstDate: DateTime(2020),
        lastDate: DateTime(2030),
      );
      if (picked != null) {
        if (isStart) {
          startDateState.value = picked;
          if (startDateState.value.isAfter(endDateState.value)) {
            endDateState.value = startDateState.value;
          }
        } else {
          endDateState.value = picked;
        }
      }
    }

    Future<void> pickTime(bool isStart) async {
      final picked = await showTimePicker(
        context: context,
        initialTime: isStart ? startTimeState.value : endTimeState.value,
      );
      if (picked != null) {
        if (isStart) {
          startTimeState.value = picked;
        } else {
          endTimeState.value = picked;
        }
      }
    }

    Future<void> save() async {
      final title = titleController.text.trim();
      if (title.isEmpty) return;

      try {
        await ref
            .read(eventFormControllerProvider.notifier)
            .saveFromForm(
              existingEvent: event,
              title: title,
              description: descriptionController.text,
              location: locationController.text,
              startDate: startDateState.value,
              startTime: startTimeState.value,
              endDate: endDateState.value,
              endTime: endTimeState.value,
              isAllDay: isAllDay.value,
              categoryColor: categoryColor.value,
            );

        if (context.mounted) Navigator.of(context).pop();
      } catch (e) {
        if (context.mounted) CommonSnackBar.error(context, 'エラーが発生しました: $e');
      }
    }

    Future<void> delete() async {
      if (!isEditing) return;
      final confirmed = await CommonDialog.confirm(
        context: context,
        title: '予定の削除',
        message: 'この予定を削除しますか？',
        confirmLabel: '削除',
        isDestructive: true,
      );

      if (confirmed) {
        await ref
            .read(eventFormControllerProvider.notifier)
            .deleteEvent(event!.id);
        if (context.mounted) Navigator.of(context).pop();
      }
    }

    Color parseColor(String hex) {
      try {
        return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
      } catch (_) {
        return AppColors.brand;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? '予定の編集' : '新しい予定'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (isEditing)
            IconButton(icon: AppIcons.trash(size: 24), onPressed: delete),
          TextButton(
            onPressed: isSaving ? null : save,
            child: isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: LoadingIndicator(size: 16),
                  )
                : Text(
                    '保存',
                    style: AppTextStyles.caption1.copyWith(
                      color: AppColors.brand,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        children: [
          TextField(
            controller: titleController,
            style: AppTextStyles.title3,
            decoration: InputDecoration(
              hintText: 'タイトルを追加',
              hintStyle: AppTextStyles.title3.copyWith(
                color: AppColors.textTertiary(context),
              ),
              border: InputBorder.none,
              contentPadding: EdgeInsets.zero,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          Row(
            children: [
              AppIcons.clock(size: 20, color: AppColors.textSecondary(context)),
              const SizedBox(width: 14),
              Text('終日', style: AppTextStyles.caption1),
              const Spacer(),
              Switch.adaptive(
                value: isAllDay.value,
                onChanged: (v) => isAllDay.value = v,
                activeTrackColor: AppColors.brand,
              ),
            ],
          ),
          const Divider(height: 1),

          _DateTimeRow(
            label: '開始',
            date: dateFormat.format(startDateState.value),
            time: isAllDay.value ? null : startTimeState.value.format(context),
            onDateTap: () => pickDate(true),
            onTimeTap: isAllDay.value ? null : () => pickTime(true),
          ),
          _DateTimeRow(
            label: '終了',
            date: dateFormat.format(endDateState.value),
            time: isAllDay.value ? null : endTimeState.value.format(context),
            onDateTap: () => pickDate(false),
            onTimeTap: isAllDay.value ? null : () => pickTime(false),
          ),
          const Divider(height: 1),
          const SizedBox(height: AppSpacing.md),

          Row(
            children: [
              AppIcons.location(
                size: 20,
                color: AppColors.textSecondary(context),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: locationController,
                  style: AppTextStyles.caption1,
                  decoration: InputDecoration(
                    hintText: '場所を追加',
                    hintStyle: AppTextStyles.caption1.copyWith(
                      color: AppColors.textTertiary(context),
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
          const Divider(height: 1),
          const SizedBox(height: AppSpacing.md),

          Row(
            children: [
              Icon(
                Icons.circle,
                size: 20,
                color: parseColor(categoryColor.value),
              ),
              const SizedBox(width: 14),
              Text('カテゴリ', style: AppTextStyles.caption1),
              const Spacer(),
              _ColorPicker(
                selected: categoryColor.value,
                onChanged: (c) => categoryColor.value = c,
              ),
            ],
          ),
          const Divider(height: 1),
          const SizedBox(height: AppSpacing.md),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: AppIcons.doc(
                  size: 20,
                  color: AppColors.textSecondary(context),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: descriptionController,
                  style: AppTextStyles.caption1,
                  maxLines: 5,
                  minLines: 2,
                  decoration: InputDecoration(
                    hintText: '説明を追加',
                    hintStyle: AppTextStyles.caption1.copyWith(
                      color: AppColors.textTertiary(context),
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DateTimeRow extends StatelessWidget {
  const _DateTimeRow({
    required this.label,
    required this.date,
    this.time,
    required this.onDateTap,
    this.onTimeTap,
  });

  final String label;
  final String date;
  final String? time;
  final VoidCallback onDateTap;
  final VoidCallback? onTimeTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 34,
            child: Text(
              label,
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
          ),
          GestureDetector(
            onTap: onDateTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.divider(context),
                borderRadius: AppRadius.radius80,
              ),
              child: Text(date, style: AppTextStyles.caption1),
            ),
          ),
          if (time != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onTimeTap,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppColors.divider(context),
                  borderRadius: AppRadius.radius80,
                ),
                child: Text(time!, style: AppTextStyles.caption1),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ColorPicker extends StatelessWidget {
  const _ColorPicker({required this.selected, required this.onChanged});
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: CalendarColors.presets.map((hex) {
        final color = Color(
          int.parse('FF${hex.replaceFirst('#', '')}', radix: 16),
        );
        final isSelected = hex == selected;
        return GestureDetector(
          onTap: () => onChanged(hex),
          child: Container(
            width: 24,
            height: 24,
            margin: const EdgeInsets.only(left: 4),
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              border: isSelected
                  ? Border.all(
                      color: Colors.white,
                      width: AppStroke.strokeWidth20,
                    )
                  : null,
              boxShadow: isSelected ? AppShadows.of4(context) : null,
            ),
          ),
        );
      }).toList(),
    );
  }
}
