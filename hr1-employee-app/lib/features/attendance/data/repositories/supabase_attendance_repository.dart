import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';

/// 打刻 RPC が業務上の状態違反を理由に拒否したことを示す例外。
///
/// [code] は DB 側 `RAISE EXCEPTION ... USING detail = '...'` の detail 文字列。
/// クライアント側のメッセージ分岐に使う (i18n される MESSAGE には依存しない)。
class PunchException implements Exception {
  PunchException(this.code, [this.message]);
  final String code;
  final String? message;

  @override
  String toString() =>
      'PunchException($code)${message != null ? ': $message' : ''}';
}

/// 勤怠データのSupabaseリポジトリ
///
/// 打刻系 (clockIn / clockOut / breakStart / breakEnd) は DB の SECURITY DEFINER
/// RPC (`punch_*`) に委譲する。サーバ側で行ロック + 状態整合性チェック + 並行
/// 実行直列化が行われ、クライアント / ネットワーク事情に依存せず不変条件を
/// 保つ。
class SupabaseAttendanceRepository {
  SupabaseAttendanceRepository(
    this._client, {
    required this.activeOrganizationId,
    this.overrideUserId,
  });

  final SupabaseClient _client;

  /// 現在アクティブな組織ID
  final String activeOrganizationId;

  /// 開発モード等でAuth未使用時にユーザーIDを外部から注入
  final String? overrideUserId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) {
      throw StateError('ユーザーが認証されていません');
    }
    return id;
  }

  /// サーバ側の今日 (Asia/Tokyo) を YYYY-MM-DD で取得。
  /// クライアント TZ や `get_server_now` の応答フォーマット差異を排除するため
  /// DB の `get_server_today_jst()` RPC をそのまま使う (打刻 RPC が使う日付計算
  /// と完全一致)。
  Future<String> _serverToday() async {
    final response = await _client.rpc('get_server_today_jst');
    return response as String;
  }

  /// 今日の勤怠レコードを取得
  Future<AttendanceRecord?> getTodayRecord() async {
    final today = await _serverToday();
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
    // 今日 (JST) の 00:00 〜 翌 00:00 を UTC に変換してクエリ
    final today = await _serverToday();
    final parts = today.split('-').map(int.parse).toList();
    final dayStartJst = DateTime.utc(
      parts[0],
      parts[1],
      parts[2],
    ).subtract(const Duration(hours: 9));
    final dayEndJst = dayStartJst.add(const Duration(days: 1));

    final response = await _client
        .from('attendance_punches')
        .select()
        .eq('user_id', _userId)
        .gte('punched_at', dayStartJst.toIso8601String())
        .lt('punched_at', dayEndJst.toIso8601String())
        .order('punched_at', ascending: true);

    return (response as List)
        .map((json) => AttendancePunch.fromJson(json))
        .toList();
  }

  /// 指定日の打刻履歴を取得
  Future<List<AttendancePunch>> getPunchesByDate(DateTime date) async {
    final dayStart = DateTime(date.year, date.month, date.day);
    final dayEnd = dayStart.add(const Duration(days: 1));

    final response = await _client
        .from('attendance_punches')
        .select()
        .eq('user_id', _userId)
        .gte('punched_at', dayStart.toUtc().toIso8601String())
        .lt('punched_at', dayEnd.toUtc().toIso8601String())
        .order('punched_at', ascending: true);

    return (response as List)
        .map((json) => AttendancePunch.fromJson(json))
        .toList();
  }

  /// 出勤打刻 — DB の `punch_clock_in` RPC に委譲。
  /// 既出勤等の状態違反は [PunchException] を投げる。
  Future<AttendanceRecord> clockIn() {
    return _invokeRecordRpc('punch_clock_in');
  }

  /// 退勤打刻 — DB の `punch_clock_out` RPC に委譲。
  /// 出勤前 / 既退勤 / 休憩中 等は [PunchException] を投げる。
  Future<AttendanceRecord> clockOut() {
    return _invokeRecordRpc('punch_clock_out');
  }

  /// 休憩開始打刻 — DB の `punch_break_start` RPC に委譲。
  Future<void> breakStart() async {
    await _invokeVoidRpc('punch_break_start');
  }

  /// 休憩終了打刻 — DB の `punch_break_end` RPC に委譲。
  Future<AttendanceRecord> breakEnd() {
    return _invokeRecordRpc('punch_break_end');
  }

  Future<AttendanceRecord> _invokeRecordRpc(String fnName) async {
    try {
      final response = await _client.rpc(
        fnName,
        params: {'p_organization_id': activeOrganizationId},
      );
      // RETURNS attendance_records はオブジェクトで返る
      return AttendanceRecord.fromJson(
        Map<String, dynamic>.from(response as Map),
      );
    } on PostgrestException catch (e) {
      throw _toPunchException(e);
    }
  }

  Future<void> _invokeVoidRpc(String fnName) async {
    try {
      await _client.rpc(
        fnName,
        params: {'p_organization_id': activeOrganizationId},
      );
    } on PostgrestException catch (e) {
      throw _toPunchException(e);
    }
  }

  /// 業務エラー (`P0001` / `42501` / `28000`) は [PunchException] に詰め替える。
  /// それ以外 (ネットワーク / 内部エラー) はそのまま再 throw する。
  ///
  /// 依存仕様: PostgREST は plpgsql の `RAISE EXCEPTION ... USING DETAIL = 'x'`
  /// を error JSON の `details` フィールドにマッピングし、supabase_flutter は
  /// それを [PostgrestException.details] として公開する。PostgREST の major
  /// アップデートでマッピングが変わった場合はここを修正する必要がある。
  Exception _toPunchException(PostgrestException e) {
    final code = e.details?.toString();
    if (code != null && code.isNotEmpty) {
      return PunchException(code, e.message);
    }
    return e;
  }

  /// 勤怠設定を取得
  Future<AttendanceSettings> getSettings() async {
    final response = await _client
        .from('attendance_settings')
        .select()
        .eq('organization_id', activeOrganizationId)
        .maybeSingle();

    if (response == null) return const AttendanceSettings();
    return AttendanceSettings.fromJson(response);
  }

  /// 修正依頼を送信
  ///
  /// [punchCorrections] は打刻単位の修正リスト。各要素:
  /// `{ "punch_id": "...", "punch_type": "clock_in",
  ///    "original_punched_at": "...", "requested_punched_at": "..." }`
  Future<void> requestCorrection({
    required String recordId,
    required String? originalClockIn,
    required String? originalClockOut,
    required String? requestedClockIn,
    required String? requestedClockOut,
    List<Map<String, dynamic>>? punchCorrections,
    required String reason,
  }) async {
    final orgId = activeOrganizationId;

    await _client.from('attendance_corrections').insert({
      'organization_id': orgId,
      'record_id': recordId,
      'user_id': _userId,
      'original_clock_in': originalClockIn,
      'original_clock_out': originalClockOut,
      'requested_clock_in': requestedClockIn,
      'requested_clock_out': requestedClockOut,
      'punch_corrections': punchCorrections,
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
