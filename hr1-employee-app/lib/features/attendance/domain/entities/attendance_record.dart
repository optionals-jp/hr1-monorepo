/// 勤怠レコードモデル
class AttendanceRecord {
  const AttendanceRecord({
    required this.id,
    required this.userId,
    required this.organizationId,
    required this.date,
    this.clockIn,
    this.clockOut,
    this.breakMinutes = 0,
    required this.status,
    this.note,
    this.overtimeMinutes = 0,
    this.lateNightMinutes = 0,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String userId;
  final String organizationId;
  final String date;
  final DateTime? clockIn;
  final DateTime? clockOut;
  final int breakMinutes;
  final String status;
  final String? note;
  final int overtimeMinutes;
  final int lateNightMinutes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  /// 勤務中かどうか
  bool get isWorking => clockIn != null && clockOut == null;

  /// 勤務時間（分）
  int get workMinutes {
    if (clockIn == null || clockOut == null) return 0;
    return clockOut!.difference(clockIn!).inMinutes - breakMinutes;
  }

  /// 勤務時間のフォーマット（例: 8:00）
  String get workDurationFormatted {
    final minutes = workMinutes;
    if (minutes <= 0) return '-';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '$h:${m.toString().padLeft(2, '0')}';
  }

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String,
      date: json['date'] as String,
      clockIn: json['clock_in'] != null
          ? DateTime.parse(json['clock_in'] as String)
          : null,
      clockOut: json['clock_out'] != null
          ? DateTime.parse(json['clock_out'] as String)
          : null,
      breakMinutes: json['break_minutes'] as int? ?? 0,
      status: json['status'] as String,
      note: json['note'] as String?,
      overtimeMinutes: json['overtime_minutes'] as int? ?? 0,
      lateNightMinutes: json['late_night_minutes'] as int? ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'organization_id': organizationId,
      'date': date,
      'clock_in': clockIn?.toIso8601String(),
      'clock_out': clockOut?.toIso8601String(),
      'break_minutes': breakMinutes,
      'status': status,
      'note': note,
      'overtime_minutes': overtimeMinutes,
      'late_night_minutes': lateNightMinutes,
    };
  }
}

/// 打刻レコードモデル
class AttendancePunch {
  const AttendancePunch({
    required this.id,
    required this.userId,
    required this.organizationId,
    this.recordId,
    required this.punchType,
    required this.punchedAt,
    this.note,
  });

  final String id;
  final String userId;
  final String organizationId;
  final String? recordId;
  final String punchType;
  final DateTime punchedAt;
  final String? note;

  factory AttendancePunch.fromJson(Map<String, dynamic> json) {
    return AttendancePunch(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String,
      recordId: json['record_id'] as String?,
      punchType: json['punch_type'] as String,
      punchedAt: DateTime.parse(json['punched_at'] as String),
      note: json['note'] as String?,
    );
  }
}

/// 勤怠設定モデル
class AttendanceSettings {
  const AttendanceSettings({
    this.workStartTime = '09:00',
    this.workEndTime = '18:00',
    this.breakMinutes = 60,
  });

  final String workStartTime;
  final String workEndTime;
  final int breakMinutes;

  factory AttendanceSettings.fromJson(Map<String, dynamic> json) {
    return AttendanceSettings(
      workStartTime: json['work_start_time'] as String? ?? '09:00',
      workEndTime: json['work_end_time'] as String? ?? '18:00',
      breakMinutes: json['break_minutes'] as int? ?? 60,
    );
  }
}

/// 打刻種別
class PunchType {
  PunchType._();

  static const String clockIn = 'clock_in';
  static const String clockOut = 'clock_out';
  static const String breakStart = 'break_start';
  static const String breakEnd = 'break_end';

  static String label(String type) {
    switch (type) {
      case clockIn:
        return '出勤';
      case clockOut:
        return '退勤';
      case breakStart:
        return '休憩開始';
      case breakEnd:
        return '休憩終了';
      default:
        return type;
    }
  }
}

/// 勤怠ステータス
class AttendanceStatus {
  AttendanceStatus._();

  static const String present = 'present';
  static const String absent = 'absent';
  static const String late = 'late';
  static const String earlyLeave = 'early_leave';
  static const String paidLeave = 'paid_leave';
  static const String halfDayAm = 'half_day_am';
  static const String halfDayPm = 'half_day_pm';
  static const String holiday = 'holiday';
  static const String sickLeave = 'sick_leave';
  static const String specialLeave = 'special_leave';

  static String label(String status) {
    switch (status) {
      case present:
        return '出勤';
      case absent:
        return '欠勤';
      case late:
        return '遅刻';
      case earlyLeave:
        return '早退';
      case paidLeave:
        return '有休';
      case halfDayAm:
        return '午前半休';
      case halfDayPm:
        return '午後半休';
      case holiday:
        return '休日';
      case sickLeave:
        return '病欠';
      case specialLeave:
        return '特別休暇';
      default:
        return status;
    }
  }
}
