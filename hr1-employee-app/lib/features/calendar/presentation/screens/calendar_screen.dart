import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/org_icon.dart';
import '../../../../shared/widgets/user_avatar.dart';
import '../../../attendance/presentation/providers/attendance_providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/calendar_event.dart';
import '../../../../shared/widgets/common_dialog.dart';
import '../../../../shared/widgets/common_snackbar.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../controllers/calendar_controller.dart';
import '../providers/calendar_providers.dart';
import '../widgets/day_view.dart';
import '../widgets/event_card.dart';
import '../widgets/mini_calendar.dart';

/// カレンダー画面 — Outlook モバイルスタイル
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  bool _isCalendarExpanded = false;

  // コンテンツエリア用 PageView
  static const _pageCenter = 10000;
  final PageController _dayPageController = PageController(
    initialPage: _pageCenter,
  );
  DateTime? _baseDate; // PageView の基準日
  bool _isSyncing = false; // 外部からのPageView同期中フラグ

  @override
  void dispose() {
    _dayPageController.dispose();
    super.dispose();
  }

  DateTime _dateForPage(int page) {
    _baseDate ??= ref.read(selectedDateProvider);
    return _baseDate!.add(Duration(days: page - _pageCenter));
  }

  void _showMonthPicker(BuildContext context, DateTime current) {
    var selectedYear = current.year;
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final theme = Theme.of(ctx);
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 年選択
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.chevron_left_rounded),
                          onPressed: () => setSheetState(() => selectedYear--),
                        ),
                        Text('$selectedYear年', style: AppTextStyles.headline),
                        IconButton(
                          icon: const Icon(Icons.chevron_right_rounded),
                          onPressed: () => setSheetState(() => selectedYear++),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // 月グリッド
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
                                  ? AppColors.brandPrimary.withValues(
                                      alpha: 0.1,
                                    )
                                  : null,
                              borderRadius: AppRadius.radius80,
                              border: isCurrent
                                  ? Border.all(
                                      color: AppColors.brandPrimary,
                                      width: 1.5,
                                    )
                                  : null,
                            ),
                            child: Text(
                              '$month月',
                              style: AppTextStyles.body2.copyWith(
                                color: isCurrent
                                    ? AppColors.brandPrimary
                                    : theme.colorScheme.onSurface,
                                fontWeight: isCurrent ? FontWeight.w600 : null,
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

  void _navigateToEventForm({CalendarEvent? event}) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _EventFormSheet(event: event),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // ミニカレンダーや「今日」ボタンから日付が変わった時にPageViewを同期
    ref.listen<DateTime>(selectedDateProvider, (prev, next) {
      _baseDate ??= next;
      final targetPage = _pageCenter + next.difference(_baseDate!).inDays;
      if (_dayPageController.hasClients &&
          _dayPageController.page?.round() != targetPage) {
        _isSyncing = true;
        // jumpToPage を使用して中間ページのウィジェット構築（API呼び出し）を防止
        _dayPageController.jumpToPage(targetPage);
        _isSyncing = false;
      }
    });

    final selectedDate = ref.watch(selectedDateProvider);
    final focusedMonth = ref.watch(focusedMonthProvider);
    final viewMode = ref.watch(calendarViewModeProvider);
    final eventDatesAsync = ref.watch(eventDatesProvider(focusedMonth));
    final theme = Theme.of(context);

    final monthLabel = DateFormat('yyyy年M月', 'ja').format(focusedMonth);

    final user = ref.watch(appUserProvider);

    return Scaffold(
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
              onTap: () => _showMonthPicker(context, focusedMonth),
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
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
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
                color: AppColors.brandPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          PopupMenuButton<CalendarViewMode>(
            icon: AppIcons.nemuBoard(
              size: 20,
              color: AppColors.textSecondary(theme.brightness),
            ),
            onSelected: (mode) {
              ref
                  .read(calendarControllerProvider.notifier)
                  .changeViewMode(mode);
            },
            itemBuilder: (_) => [
              _viewMenuItem(
                CalendarViewMode.agenda,
                'アジェンダ',
                AppIcons.rowHorizontal,
                viewMode,
              ),
              _viewMenuItem(
                CalendarViewMode.day,
                '日',
                AppIcons.rowVertical,
                viewMode,
              ),
              _viewMenuItem(
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
          // ミニカレンダー
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
            isExpanded: _isCalendarExpanded,
            onToggleExpand: () {
              setState(() => _isCalendarExpanded = !_isCalendarExpanded);
            },
            eventDates: eventDatesAsync.valueOrNull ?? {},
          ),
          Divider(height: 0.5, color: theme.colorScheme.outlineVariant),
          // コンテンツ（ビューモードに応じて切替）— PageView でスワイプ
          Expanded(
            child: PageView.builder(
              controller: _dayPageController,
              onPageChanged: (page) {
                if (_isSyncing) return;
                final newDate = _dateForPage(page);
                ref
                    .read(calendarControllerProvider.notifier)
                    .selectDate(newDate);
              },
              itemBuilder: (context, page) {
                final pageDate = _dateForPage(page);
                return switch (viewMode) {
                  CalendarViewMode.agenda => _DayEventListView(
                    selectedDate: pageDate,
                    onEventTap: (event) => _navigateToEventForm(event: event),
                  ),
                  CalendarViewMode.day => _DayViewWrapper(
                    selectedDate: pageDate,
                    onEventTap: (event) => _navigateToEventForm(event: event),
                  ),
                  CalendarViewMode.threeDay => _ThreeDayViewWrapper(
                    selectedDate: pageDate,
                    onEventTap: (event) => _navigateToEventForm(event: event),
                  ),
                };
              },
            ),
          ),
        ],
      ),
      // FAB: イベント作成
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navigateToEventForm(),
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: Colors.white,
        elevation: 2,
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  PopupMenuItem<CalendarViewMode> _viewMenuItem(
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
          iconBuilder(
            size: 20,
            color: isSelected ? AppColors.brandPrimary : null,
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: AppTextStyles.caption1.copyWith(
              color: isSelected ? AppColors.brandPrimary : null,
              fontWeight: isSelected ? FontWeight.w600 : null,
            ),
          ),
        ],
      ),
    );
  }
}

/// 日別イベントリストビュー — 選択日のイベント一覧を表示
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
    final theme = Theme.of(context);

    if (events.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcons.calendar(
              size: 48,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.25),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              '予定はありません',
              style: AppTextStyles.caption1.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
              ),
            ),
          ],
        ),
      );
    }

    // 日付ごとにグループ化
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
        // 終日イベントを先に
        dayEvents.sort((a, b) {
          if (a.isAllDay && !b.isAllDay) return -1;
          if (!a.isAllDay && b.isAllDay) return 1;
          return a.startAt.compareTo(b.startAt);
        });

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 日付ヘッダー（sticky風）
            _DateHeader(date: date),
            // イベントカード
            for (final event in dayEvents)
              EventCard(event: event, onTap: () => onEventTap(event)),
            const SizedBox(height: AppSpacing.sm),
          ],
        );
      },
    );
  }
}

/// 日付ヘッダー — Outlook スタイル
class _DateHeader extends StatelessWidget {
  const _DateHeader({required this.date});
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
          color: isToday
              ? AppColors.brandPrimary
              : AppColors.textSecondary(theme.brightness),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// デイビューラッパー
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

/// 3日ビューラッパー
class _ThreeDayViewWrapper extends ConsumerWidget {
  const _ThreeDayViewWrapper({
    required this.selectedDate,
    required this.onEventTap,
  });

  final DateTime selectedDate;
  final ValueChanged<CalendarEvent> onEventTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final dates = List.generate(3, (i) => selectedDate.add(Duration(days: i)));

    return Row(
      children: dates.map((date) {
        final dayEvents = ref.watch(dayEventsProvider(date)).valueOrNull ?? [];

        return Expanded(
          child: Column(
            children: [
              // 日付ラベル
              Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: theme.colorScheme.outlineVariant,
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
                          ? AppColors.brandPrimary
                          : theme.colorScheme.onSurface,
                    ),
                  ),
                ),
              ),
              // デイビュー
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

/// イベント作成/編集シート
class _EventFormSheet extends ConsumerStatefulWidget {
  const _EventFormSheet({this.event});
  final CalendarEvent? event;

  @override
  ConsumerState<_EventFormSheet> createState() => _EventFormSheetState();
}

class _EventFormSheetState extends ConsumerState<_EventFormSheet> {
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _locationController;
  late DateTime _startDate;
  late TimeOfDay _startTime;
  late DateTime _endDate;
  late TimeOfDay _endTime;
  late bool _isAllDay;
  late String _categoryColor;

  bool get _isEditing => widget.event != null;

  @override
  void initState() {
    super.initState();
    final event = widget.event;
    _titleController = TextEditingController(text: event?.title ?? '');
    _descriptionController = TextEditingController(
      text: event?.description ?? '',
    );
    _locationController = TextEditingController(text: event?.location ?? '');

    if (event != null) {
      final start = event.startAt.toLocal();
      final end = event.endAt.toLocal();
      _startDate = DateTime(start.year, start.month, start.day);
      _startTime = TimeOfDay(hour: start.hour, minute: start.minute);
      _endDate = DateTime(end.year, end.month, end.day);
      _endTime = TimeOfDay(hour: end.hour, minute: end.minute);
      _isAllDay = event.isAllDay;
      _categoryColor = event.categoryColor;
    } else {
      final selectedDate = ref.read(selectedDateProvider);
      final now = DateTime.now();
      final startHour = (now.hour + 1) % 24;
      final endHour = (now.hour + 2) % 24;
      _startDate = selectedDate;
      _startTime = TimeOfDay(hour: startHour, minute: 0);
      _endDate = selectedDate;
      _endTime = TimeOfDay(hour: endHour, minute: 0);
      _isAllDay = false;
      _categoryColor = '#0F6CBD';
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _endDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_startDate.isAfter(_endDate)) _endDate = _startDate;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startTime = picked;
        } else {
          _endTime = picked;
        }
      });
    }
  }

  Future<void> _save() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    try {
      await ref
          .read(eventFormControllerProvider.notifier)
          .saveFromForm(
            existingEvent: widget.event,
            title: title,
            description: _descriptionController.text,
            location: _locationController.text,
            startDate: _startDate,
            startTime: _startTime,
            endDate: _endDate,
            endTime: _endTime,
            isAllDay: _isAllDay,
            categoryColor: _categoryColor,
          );

      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      CommonSnackBar.error(context, 'エラーが発生しました: $e');
    }
  }

  Future<void> _delete() async {
    if (!_isEditing) return;
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
          .deleteEvent(widget.event!.id);
      if (mounted) Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSaving = ref.watch(eventFormControllerProvider);
    final theme = Theme.of(context);
    final dateFormat = DateFormat('yyyy/MM/dd（E）', 'ja');

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? '予定の編集' : '新しい予定'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (_isEditing)
            IconButton(icon: AppIcons.trash(size: 24), onPressed: _delete),
          TextButton(
            onPressed: isSaving ? null : _save,
            child: isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: LoadingIndicator(size: 16),
                  )
                : Text(
                    '保存',
                    style: AppTextStyles.caption1.copyWith(
                      color: AppColors.brandPrimary,
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
          // タイトル
          TextField(
            controller: _titleController,
            style: AppTextStyles.title3,
            decoration: InputDecoration(
              hintText: 'タイトルを追加',
              hintStyle: AppTextStyles.title3.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
              ),
              border: InputBorder.none,
              contentPadding: EdgeInsets.zero,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // 終日スイッチ
          Row(
            children: [
              AppIcons.clock(
                size: 20,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
              const SizedBox(width: 14),
              Text('終日', style: AppTextStyles.caption1),
              const Spacer(),
              Switch.adaptive(
                value: _isAllDay,
                onChanged: (v) => setState(() => _isAllDay = v),
                activeTrackColor: AppColors.brandPrimary,
              ),
            ],
          ),
          const Divider(height: 1),

          // 開始日時
          _DateTimeRow(
            label: '開始',
            date: dateFormat.format(_startDate),
            time: _isAllDay ? null : _startTime.format(context),
            onDateTap: () => _pickDate(true),
            onTimeTap: _isAllDay ? null : () => _pickTime(true),
          ),
          // 終了日時
          _DateTimeRow(
            label: '終了',
            date: dateFormat.format(_endDate),
            time: _isAllDay ? null : _endTime.format(context),
            onDateTap: () => _pickDate(false),
            onTimeTap: _isAllDay ? null : () => _pickTime(false),
          ),
          const Divider(height: 1),
          const SizedBox(height: AppSpacing.md),

          // 場所
          Row(
            children: [
              AppIcons.location(
                size: 20,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: _locationController,
                  style: AppTextStyles.caption1,
                  decoration: InputDecoration(
                    hintText: '場所を追加',
                    hintStyle: AppTextStyles.caption1.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.35,
                      ),
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

          // カテゴリ色
          Row(
            children: [
              Icon(Icons.circle, size: 20, color: _parseColor(_categoryColor)),
              const SizedBox(width: 14),
              Text('カテゴリ', style: AppTextStyles.caption1),
              const Spacer(),
              _ColorPicker(
                selected: _categoryColor,
                onChanged: (c) => setState(() => _categoryColor = c),
              ),
            ],
          ),
          const Divider(height: 1),
          const SizedBox(height: AppSpacing.md),

          // 説明
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: AppIcons.doc(
                  size: 20,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: _descriptionController,
                  style: AppTextStyles.caption1,
                  maxLines: 5,
                  minLines: 2,
                  decoration: InputDecoration(
                    hintText: '説明を追加',
                    hintStyle: AppTextStyles.caption1.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.35,
                      ),
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

  Color _parseColor(String hex) {
    try {
      return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return AppColors.brandPrimary;
    }
  }
}

/// 日時選択行
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
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 34,
            child: Text(
              label,
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textSecondary(theme.brightness),
              ),
            ),
          ),
          GestureDetector(
            onTap: onDateTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.05),
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
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.05),
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

/// カテゴリ色ピッカー
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
                  ? Border.all(color: Colors.white, width: AppStroke.strokeWidth20)
                  : null,
              boxShadow: isSelected ? AppShadows.shadow4 : null,
            ),
          ),
        );
      }).toList(),
    );
  }
}
