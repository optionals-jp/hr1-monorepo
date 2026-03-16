import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/calendar_event.dart';
import '../../domain/repositories/calendar_repository.dart';

/// Supabase カレンダーリポジトリ実装
class SupabaseCalendarRepository implements CalendarRepository {
  SupabaseCalendarRepository(this._client);

  final SupabaseClient _client;

  String get _userId => _client.auth.currentUser!.id;

  Future<String> _getOrganizationId() async {
    final userOrg = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .limit(1)
        .single();
    return userOrg['organization_id'] as String;
  }

  @override
  Future<List<CalendarEvent>> getEvents({
    required DateTime start,
    required DateTime end,
  }) async {
    final response = await _client
        .from('calendar_events')
        .select()
        .eq('user_id', _userId)
        .gte('start_at', start.toUtc().toIso8601String())
        .lte('start_at', end.toUtc().toIso8601String())
        .order('start_at');

    return response.map((e) => CalendarEvent.fromJson(e)).toList();
  }

  @override
  Future<CalendarEvent?> getEvent(String id) async {
    final response = await _client
        .from('calendar_events')
        .select()
        .eq('id', id)
        .eq('user_id', _userId)
        .maybeSingle();

    if (response == null) return null;
    return CalendarEvent.fromJson(response);
  }

  @override
  Future<CalendarEvent> createEvent(CalendarEvent event) async {
    final orgId = await _getOrganizationId();

    final data = event.toJson();
    data['user_id'] = _userId;
    data['organization_id'] = orgId;

    final response = await _client
        .from('calendar_events')
        .insert(data)
        .select()
        .single();

    return CalendarEvent.fromJson(response);
  }

  @override
  Future<CalendarEvent> updateEvent(CalendarEvent event) async {
    final response = await _client
        .from('calendar_events')
        .update(event.toJson())
        .eq('id', event.id)
        .eq('user_id', _userId)
        .select()
        .single();

    return CalendarEvent.fromJson(response);
  }

  @override
  Future<void> deleteEvent(String id) async {
    await _client
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', _userId);
  }

  @override
  Future<Set<DateTime>> getEventDates({
    required DateTime start,
    required DateTime end,
  }) async {
    final response = await _client
        .from('calendar_events')
        .select('start_at')
        .eq('user_id', _userId)
        .gte('start_at', start.toUtc().toIso8601String())
        .lte('start_at', end.toUtc().toIso8601String());

    final dates = <DateTime>{};
    for (final row in response) {
      final dt = DateTime.parse(row['start_at'] as String).toLocal();
      dates.add(DateTime(dt.year, dt.month, dt.day));
    }
    return dates;
  }
}
