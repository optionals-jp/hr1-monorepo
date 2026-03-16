import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/attendance_record.dart';

/// 勤怠データのSupabaseリポジトリ
class SupabaseAttendanceRepository {
  SupabaseAttendanceRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;

  /// 開発モード等でAuth未使用時にユーザーIDを外部から注入
  final String? overrideUserId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) {
      throw StateError('ユーザーが認証されていません');
    }
    return id;
  }

  /// user_organizations 経由で組織IDを取得
  Future<String> _getOrganizationId() async {
    final userOrg = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .limit(1)
        .single();
    return userOrg['organization_id'] as String;
  }

  /// ローカル日付文字列（yyyy-MM-dd）を取得
  String _localToday() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  /// 今日の勤怠レコードを取得
  Future<AttendanceRecord?> getTodayRecord() async {
    final today = _localToday();
    final response = await _client
        .from('attendance_records')
        .select()
        .eq('user_id', _userId)
        .eq('date', today)
        .maybeSingle();

    if (response == null) return null;
    return AttendanceRecord.fromJson(response);
  }

  /// 指定期間の勤怠レコードを取得
  Future<List<AttendanceRecord>> getRecords({
    required String startDate,
    required String endDate,
  }) async {
    final response = await _client
        .from('attendance_records')
        .select()
        .eq('user_id', _userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', ascending: false);

    return (response as List)
        .map((json) => AttendanceRecord.fromJson(json))
        .toList();
  }

  /// 今日の打刻履歴を取得
  Future<List<AttendancePunch>> getTodayPunches() async {
    // ローカルタイムゾーンの今日の開始・終了をUTCに変換してクエリ
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final tomorrowStart = todayStart.add(const Duration(days: 1));

    final response = await _client
        .from('attendance_punches')
        .select()
        .eq('user_id', _userId)
        .gte('punched_at', todayStart.toUtc().toIso8601String())
        .lt('punched_at', tomorrowStart.toUtc().toIso8601String())
        .order('punched_at', ascending: true);

    return (response as List)
        .map((json) => AttendancePunch.fromJson(json))
        .toList();
  }

  /// 出勤打刻
  Future<AttendanceRecord> clockIn({String? note}) async {
    final now = DateTime.now();
    final today = _localToday();
    final nowUtc = now.toUtc().toIso8601String();
    final orgId = await _getOrganizationId();

    // 勤怠レコードを作成または更新
    final record = await _client
        .from('attendance_records')
        .upsert({
          'user_id': _userId,
          'organization_id': orgId,
          'date': today,
          'clock_in': nowUtc,
          'status': 'present',
          'note': note,
        }, onConflict: 'user_id,date')
        .select()
        .single();

    // 打刻履歴に記録
    await _client.from('attendance_punches').insert({
      'user_id': _userId,
      'organization_id': orgId,
      'record_id': record['id'],
      'punch_type': PunchType.clockIn,
      'punched_at': nowUtc,
      'note': note,
    });

    return AttendanceRecord.fromJson(record);
  }

  /// 退勤打刻
  Future<AttendanceRecord> clockOut({String? note}) async {
    final now = DateTime.now();
    final today = _localToday();
    final nowUtc = now.toUtc().toIso8601String();
    final orgId = await _getOrganizationId();

    // 勤怠設定を取得して残業・深夜時間を計算
    final settings = await getSettings();
    final currentRecord = await _client
        .from('attendance_records')
        .select('clock_in, break_minutes')
        .eq('user_id', _userId)
        .eq('date', today)
        .single();

    final clockInRaw = currentRecord['clock_in'] as String?;
    if (clockInRaw == null) {
      throw StateError('出勤打刻がありません');
    }
    final clockInTime = DateTime.parse(clockInRaw).toLocal();
    final clockOutTime = now;
    final breakMins = currentRecord['break_minutes'] as int? ?? 0;

    final overtime = _calcOvertimeMinutes(
      clockIn: clockInTime,
      clockOut: clockOutTime,
      breakMinutes: breakMins,
      workStartTime: settings.workStartTime,
      workEndTime: settings.workEndTime,
    );
    final lateNight = _calcLateNightMinutes(
      clockIn: clockInTime,
      clockOut: clockOutTime,
    );

    // 今日のレコードを更新
    final record = await _client
        .from('attendance_records')
        .update({
          'clock_out': nowUtc,
          'overtime_minutes': overtime,
          'late_night_minutes': lateNight,
        })
        .eq('user_id', _userId)
        .eq('date', today)
        .select()
        .single();

    // 打刻履歴に記録
    await _client.from('attendance_punches').insert({
      'user_id': _userId,
      'organization_id': orgId,
      'record_id': record['id'],
      'punch_type': PunchType.clockOut,
      'punched_at': nowUtc,
      'note': note,
    });

    return AttendanceRecord.fromJson(record);
  }

  /// 残業時間（分）を計算
  /// 定時後の勤務時間 + 定時前の早出時間 - 休憩時間（実勤務 - 所定勤務が正の場合）
  int _calcOvertimeMinutes({
    required DateTime clockIn,
    required DateTime clockOut,
    required int breakMinutes,
    required String workStartTime,
    required String workEndTime,
  }) {
    final startParts = workStartTime.split(':');
    final endParts = workEndTime.split(':');
    final workStart = DateTime(
      clockIn.year,
      clockIn.month,
      clockIn.day,
      int.parse(startParts[0]),
      int.parse(startParts[1]),
    );
    final workEnd = DateTime(
      clockIn.year,
      clockIn.month,
      clockIn.day,
      int.parse(endParts[0]),
      int.parse(endParts[1]),
    );

    // 所定勤務時間
    final scheduledMinutes = workEnd.difference(workStart).inMinutes;
    // 実勤務時間（休憩除く）
    final actualMinutes =
        clockOut.difference(clockIn).inMinutes - breakMinutes;
    // 残業 = 実勤務 - 所定勤務（負の場合は0）
    final overtime = actualMinutes - scheduledMinutes;
    return overtime > 0 ? overtime : 0;
  }

  /// 深夜時間（分）を計算: 22:00〜翌5:00 の勤務時間
  int _calcLateNightMinutes({
    required DateTime clockIn,
    required DateTime clockOut,
  }) {
    final baseDate = DateTime(clockIn.year, clockIn.month, clockIn.day);
    final nextDate = baseDate.add(const Duration(days: 1));

    // 深夜帯1: 当日 22:00〜翌5:00
    final night1Start = DateTime(baseDate.year, baseDate.month, baseDate.day, 22);
    final night1End = DateTime(nextDate.year, nextDate.month, nextDate.day, 5);

    int total = _overlapMinutes(clockIn, clockOut, night1Start, night1End);

    // 深夜帯2: 出勤が5時前の場合 0:00〜5:00
    if (clockIn.hour < 5) {
      final night2Start = baseDate;
      final night2End = DateTime(baseDate.year, baseDate.month, baseDate.day, 5);
      total += _overlapMinutes(clockIn, clockOut, night2Start, night2End);
    }
    return total;
  }

  /// 2つの時間帯の重複（分）を計算
  int _overlapMinutes(
      DateTime aStart, DateTime aEnd, DateTime bStart, DateTime bEnd) {
    final start = aStart.isAfter(bStart) ? aStart : bStart;
    final end = aEnd.isBefore(bEnd) ? aEnd : bEnd;
    if (start.isBefore(end)) {
      return end.difference(start).inMinutes;
    }
    return 0;
  }

  /// 休憩開始打刻
  Future<void> breakStart() async {
    final now = DateTime.now();
    final today = _localToday();
    final nowUtc = now.toUtc().toIso8601String();
    final orgId = await _getOrganizationId();

    // 今日のレコードIDを取得
    final record = await _client
        .from('attendance_records')
        .select('id')
        .eq('user_id', _userId)
        .eq('date', today)
        .single();

    await _client.from('attendance_punches').insert({
      'user_id': _userId,
      'organization_id': orgId,
      'record_id': record['id'],
      'punch_type': PunchType.breakStart,
      'punched_at': nowUtc,
    });
  }

  /// 休憩終了打刻
  Future<void> breakEnd() async {
    final now = DateTime.now();
    final today = _localToday();
    final nowUtc = now.toUtc().toIso8601String();
    final orgId = await _getOrganizationId();

    final record = await _client
        .from('attendance_records')
        .select('id')
        .eq('user_id', _userId)
        .eq('date', today)
        .single();

    // 休憩開始時刻を取得して休憩時間を計算
    final breakStartPunch = await _client
        .from('attendance_punches')
        .select('punched_at')
        .eq('record_id', record['id'])
        .eq('punch_type', PunchType.breakStart)
        .order('punched_at', ascending: false)
        .limit(1)
        .single();

    final breakStartTime =
        DateTime.parse(breakStartPunch['punched_at'] as String);
    // 両方UTCで統一して差分を計算
    final breakDuration = now.toUtc().difference(breakStartTime.toUtc()).inMinutes;

    // 休憩時間を加算
    final currentRecord = await _client
        .from('attendance_records')
        .select('break_minutes')
        .eq('id', record['id'])
        .single();
    final currentBreak = currentRecord['break_minutes'] as int? ?? 0;

    await _client
        .from('attendance_records')
        .update({'break_minutes': currentBreak + breakDuration})
        .eq('id', record['id'])
        .eq('user_id', _userId)
        .select()
        .single();

    // 打刻履歴に記録
    await _client.from('attendance_punches').insert({
      'user_id': _userId,
      'organization_id': orgId,
      'record_id': record['id'],
      'punch_type': PunchType.breakEnd,
      'punched_at': nowUtc,
    });
  }

  /// 勤怠設定を取得
  Future<AttendanceSettings> getSettings() async {
    final orgId = await _getOrganizationId();

    final response = await _client
        .from('attendance_settings')
        .select()
        .eq('organization_id', orgId)
        .maybeSingle();

    if (response == null) return const AttendanceSettings();
    return AttendanceSettings.fromJson(response);
  }

  /// 修正依頼を送信
  Future<void> requestCorrection({
    required String recordId,
    required String? originalClockIn,
    required String? originalClockOut,
    required String? requestedClockIn,
    required String? requestedClockOut,
    required String reason,
  }) async {
    final orgId = await _getOrganizationId();

    await _client.from('attendance_corrections').insert({
      'organization_id': orgId,
      'record_id': recordId,
      'user_id': _userId,
      'original_clock_in': originalClockIn,
      'original_clock_out': originalClockOut,
      'requested_clock_in': requestedClockIn,
      'requested_clock_out': requestedClockOut,
      'reason': reason,
      'status': 'pending',
    });
  }

  /// 自分の修正依頼一覧を取得
  Future<List<Map<String, dynamic>>> getMyCorrections() async {
    final response = await _client
        .from('attendance_corrections')
        .select('*, attendance_records(date)')
        .eq('user_id', _userId)
        .order('created_at', ascending: false);

    return (response as List).cast<Map<String, dynamic>>();
  }
}
