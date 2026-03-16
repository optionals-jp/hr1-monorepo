import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../domain/entities/calendar_event.dart';
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

  void _goToToday() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    ref.read(selectedDateProvider.notifier).state = today;
    ref.read(focusedMonthProvider.notifier).state =
        DateTime(now.year, now.month);
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
    final selectedDate = ref.watch(selectedDateProvider);
    final focusedMonth = ref.watch(focusedMonthProvider);
    final viewMode = ref.watch(calendarViewModeProvider);
    final eventDatesAsync = ref.watch(eventDatesProvider(focusedMonth));
    final theme = Theme.of(context);

    final monthLabel = DateFormat('yyyy年M月', 'ja').format(focusedMonth);

    return Scaffold(
      body: Column(
        children: [
          // ヘッダー: 月表示 + Today + ビュー切替
          Container(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              AppSpacing.sm,
              AppSpacing.sm,
              0,
            ),
            child: Row(
              children: [
                // 月表示（タップで月ピッカー）
                GestureDetector(
                  onTap: () {
                    // 月の前後を左右矢印で切り替え
                  },
                  child: Row(
                    children: [
                      Text(
                        monthLabel,
                        style: AppTextStyles.subtitle.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 20,
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.5),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                // Today ボタン
                TextButton(
                  onPressed: _goToToday,
                  style: TextButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    '今日',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.brandPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                // ビュー切替
                PopupMenuButton<CalendarViewMode>(
                  icon: Icon(
                    Icons.view_agenda_outlined,
                    size: 20,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  onSelected: (mode) {
                    ref.read(calendarViewModeProvider.notifier).state = mode;
                  },
                  itemBuilder: (_) => [
                    _viewMenuItem(
                      CalendarViewMode.agenda,
                      'アジェンダ',
                      Icons.view_agenda_outlined,
                      viewMode,
                    ),
                    _viewMenuItem(
                      CalendarViewMode.day,
                      '日',
                      Icons.view_day_outlined,
                      viewMode,
                    ),
                    _viewMenuItem(
                      CalendarViewMode.threeDay,
                      '3日',
                      Icons.view_column_outlined,
                      viewMode,
                    ),
                  ],
                ),
              ],
            ),
          ),
          // ミニカレンダー
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal),
            child: MiniCalendar(
              focusedMonth: focusedMonth,
              selectedDate: selectedDate,
              onDateSelected: (date) {
                ref.read(selectedDateProvider.notifier).state = date;
                if (date.month != focusedMonth.month ||
                    date.year != focusedMonth.year) {
                  ref.read(focusedMonthProvider.notifier).state =
                      DateTime(date.year, date.month);
                }
              },
              onMonthChanged: (month) {
                ref.read(focusedMonthProvider.notifier).state = month;
              },
              isExpanded: _isCalendarExpanded,
              onToggleExpand: () {
                setState(() => _isCalendarExpanded = !_isCalendarExpanded);
              },
              eventDates: eventDatesAsync.valueOrNull ?? {},
            ),
          ),
          Divider(
              height: 0.5, color: theme.colorScheme.outlineVariant),
          // コンテンツ（ビューモードに応じて切替）
          Expanded(
            child: switch (viewMode) {
              CalendarViewMode.agenda => _AgendaView(
                  selectedDate: selectedDate,
                  onEventTap: (event) =>
                      _navigateToEventForm(event: event),
                ),
              CalendarViewMode.day => _DayViewWrapper(
                  selectedDate: selectedDate,
                  onEventTap: (event) =>
                      _navigateToEventForm(event: event),
                ),
              CalendarViewMode.threeDay => _ThreeDayViewWrapper(
                  selectedDate: selectedDate,
                  onEventTap: (event) =>
                      _navigateToEventForm(event: event),
                ),
              CalendarViewMode.month => _AgendaView(
                  selectedDate: selectedDate,
                  onEventTap: (event) =>
                      _navigateToEventForm(event: event),
                ),
            },
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
    IconData icon,
    CalendarViewMode current,
  ) {
    return PopupMenuItem(
      value: mode,
      child: Row(
        children: [
          Icon(icon, size: 20,
              color: mode == current ? AppColors.brandPrimary : null),
          const SizedBox(width: 12),
          Text(
            label,
            style: AppTextStyles.bodySmall.copyWith(
              color: mode == current ? AppColors.brandPrimary : null,
              fontWeight: mode == current ? FontWeight.w600 : null,
            ),
          ),
        ],
      ),
    );
  }
}

/// アジェンダビュー — Outlook のデフォルトビュー
class _AgendaView extends ConsumerWidget {
  const _AgendaView({
    required this.selectedDate,
    required this.onEventTap,
  });

  final DateTime selectedDate;
  final ValueChanged<CalendarEvent> onEventTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(agendaEventsProvider);
    final theme = Theme.of(context);

    return eventsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('エラー: $e')),
      data: (events) {
        if (events.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.event_note_outlined,
                  size: 48,
                  color:
                      theme.colorScheme.onSurface.withValues(alpha: 0.25),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  '予定はありません',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: theme.colorScheme.onSurface
                        .withValues(alpha: 0.45),
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
                  EventCard(
                    event: event,
                    onTap: () => onEventTap(event),
                  ),
                const SizedBox(height: AppSpacing.sm),
              ],
            );
          },
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
        style: AppTextStyles.caption.copyWith(
          color: isToday
              ? AppColors.brandPrimary
              : theme.colorScheme.onSurface.withValues(alpha: 0.55),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// デイビューラッパー
class _DayViewWrapper extends ConsumerWidget {
  const _DayViewWrapper({
    required this.selectedDate,
    required this.onEventTap,
  });

  final DateTime selectedDate;
  final ValueChanged<CalendarEvent> onEventTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(selectedDateEventsProvider);

    return eventsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('エラー: $e')),
      data: (events) => DayView(
        date: selectedDate,
        events: events,
        onEventTap: onEventTap,
      ),
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
    // 選択日から3日分のイベントを取得
    final eventsAsync = ref.watch(agendaEventsProvider);

    return eventsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('エラー: $e')),
      data: (allEvents) {
        final dates = List.generate(
            3, (i) => selectedDate.add(Duration(days: i)));

        return Row(
          children: dates.map((date) {
            final dayEvents = allEvents.where((e) {
              final eDate = e.startAt.toLocal();
              return eDate.year == date.year &&
                  eDate.month == date.month &&
                  eDate.day == date.day;
            }).toList();

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
                        style: AppTextStyles.label.copyWith(
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
      },
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
  bool _isSaving = false;

  bool get _isEditing => widget.event != null;

  @override
  void initState() {
    super.initState();
    final event = widget.event;
    _titleController = TextEditingController(text: event?.title ?? '');
    _descriptionController =
        TextEditingController(text: event?.description ?? '');
    _locationController =
        TextEditingController(text: event?.location ?? '');

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
      _startDate = selectedDate;
      _startTime = TimeOfDay(hour: now.hour + 1, minute: 0);
      _endDate = selectedDate;
      _endTime = TimeOfDay(hour: now.hour + 2, minute: 0);
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

    setState(() => _isSaving = true);
    try {
      final repo = ref.read(calendarRepositoryProvider);
      final startAt = _isAllDay
          ? DateTime(_startDate.year, _startDate.month, _startDate.day)
          : DateTime(_startDate.year, _startDate.month, _startDate.day,
              _startTime.hour, _startTime.minute);
      final endAt = _isAllDay
          ? DateTime(
              _endDate.year, _endDate.month, _endDate.day, 23, 59, 59)
          : DateTime(_endDate.year, _endDate.month, _endDate.day,
              _endTime.hour, _endTime.minute);

      if (_isEditing) {
        await repo.updateEvent(widget.event!.copyWith(
          title: title,
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          startAt: startAt,
          endAt: endAt,
          isAllDay: _isAllDay,
          location: _locationController.text.trim().isEmpty
              ? null
              : _locationController.text.trim(),
          categoryColor: _categoryColor,
        ));
      } else {
        await repo.createEvent(CalendarEvent(
          id: '',
          userId: '',
          organizationId: '',
          title: title,
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          startAt: startAt,
          endAt: endAt,
          isAllDay: _isAllDay,
          location: _locationController.text.trim().isEmpty
              ? null
              : _locationController.text.trim(),
          categoryColor: _categoryColor,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ));
      }

      // プロバイダーを更新
      ref.invalidate(agendaEventsProvider);
      ref.invalidate(selectedDateEventsProvider);
      ref.invalidate(eventDatesProvider);
      ref.invalidate(monthEventsProvider);

      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('エラーが発生しました: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _delete() async {
    if (!_isEditing) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('予定の削除'),
        content: const Text('この予定を削除しますか？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('削除',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(calendarRepositoryProvider).deleteEvent(widget.event!.id);
      ref.invalidate(agendaEventsProvider);
      ref.invalidate(selectedDateEventsProvider);
      ref.invalidate(eventDatesProvider);
      ref.invalidate(monthEventsProvider);
      if (mounted) Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
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
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded),
              onPressed: _delete,
            ),
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    '保存',
                    style: AppTextStyles.bodySmall.copyWith(
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
            style: AppTextStyles.heading3,
            decoration: InputDecoration(
              hintText: 'タイトルを追加',
              hintStyle: AppTextStyles.heading3.copyWith(
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
              Icon(Icons.schedule_rounded,
                  size: 20,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
              const SizedBox(width: 14),
              Text('終日', style: AppTextStyles.bodySmall),
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
            time: _isAllDay
                ? null
                : _startTime.format(context),
            onDateTap: () => _pickDate(true),
            onTimeTap: _isAllDay ? null : () => _pickTime(true),
          ),
          // 終了日時
          _DateTimeRow(
            label: '終了',
            date: dateFormat.format(_endDate),
            time: _isAllDay
                ? null
                : _endTime.format(context),
            onDateTap: () => _pickDate(false),
            onTimeTap: _isAllDay ? null : () => _pickTime(false),
          ),
          const Divider(height: 1),
          const SizedBox(height: AppSpacing.md),

          // 場所
          Row(
            children: [
              Icon(Icons.location_on_outlined,
                  size: 20,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: _locationController,
                  style: AppTextStyles.bodySmall,
                  decoration: InputDecoration(
                    hintText: '場所を追加',
                    hintStyle: AppTextStyles.bodySmall.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.35),
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
              Icon(Icons.circle,
                  size: 20,
                  color: _parseColor(_categoryColor)),
              const SizedBox(width: 14),
              Text('カテゴリ', style: AppTextStyles.bodySmall),
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
                child: Icon(Icons.notes_rounded,
                    size: 20,
                    color: theme.colorScheme.onSurface
                        .withValues(alpha: 0.5)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: TextField(
                  controller: _descriptionController,
                  style: AppTextStyles.bodySmall,
                  maxLines: 5,
                  minLines: 2,
                  decoration: InputDecoration(
                    hintText: '説明を追加',
                    hintStyle: AppTextStyles.bodySmall.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.35),
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
              style: AppTextStyles.caption.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
              ),
            ),
          ),
          GestureDetector(
            onTap: onDateTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(date, style: AppTextStyles.bodySmall),
            ),
          ),
          if (time != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onTimeTap,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color:
                      theme.colorScheme.onSurface.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(time!, style: AppTextStyles.bodySmall),
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
            int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
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
                  ? Border.all(color: Colors.white, width: 2)
                  : null,
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: color.withValues(alpha: 0.4),
                        blurRadius: 4,
                      )
                    ]
                  : null,
            ),
          ),
        );
      }).toList(),
    );
  }
}
