/// 申請種別
enum WorkflowRequestType {
  paidLeave,
  overtime,
  businessTrip,
  expense;

  String get dbValue {
    switch (this) {
      case WorkflowRequestType.paidLeave:
        return 'paid_leave';
      case WorkflowRequestType.overtime:
        return 'overtime';
      case WorkflowRequestType.businessTrip:
        return 'business_trip';
      case WorkflowRequestType.expense:
        return 'expense';
    }
  }

  String get label {
    switch (this) {
      case WorkflowRequestType.paidLeave:
        return '有給休暇';
      case WorkflowRequestType.overtime:
        return '残業申請';
      case WorkflowRequestType.businessTrip:
        return '出張申請';
      case WorkflowRequestType.expense:
        return '経費申請';
    }
  }

  static WorkflowRequestType fromString(String value) {
    switch (value) {
      case 'paid_leave':
        return WorkflowRequestType.paidLeave;
      case 'overtime':
        return WorkflowRequestType.overtime;
      case 'business_trip':
        return WorkflowRequestType.businessTrip;
      case 'expense':
        return WorkflowRequestType.expense;
      default:
        return WorkflowRequestType.paidLeave;
    }
  }
}

/// 申請ステータス
enum WorkflowRequestStatus {
  pending,
  approved,
  rejected,
  cancelled;

  String get label {
    switch (this) {
      case WorkflowRequestStatus.pending:
        return '承認待ち';
      case WorkflowRequestStatus.approved:
        return '承認済み';
      case WorkflowRequestStatus.rejected:
        return '却下';
      case WorkflowRequestStatus.cancelled:
        return '取消';
    }
  }

  static WorkflowRequestStatus fromString(String value) {
    switch (value) {
      case 'approved':
        return WorkflowRequestStatus.approved;
      case 'rejected':
        return WorkflowRequestStatus.rejected;
      case 'cancelled':
        return WorkflowRequestStatus.cancelled;
      default:
        return WorkflowRequestStatus.pending;
    }
  }
}

/// 休暇種別
enum LeaveType {
  paidLeave,
  halfDayAm,
  halfDayPm,
  sickLeave,
  specialLeave;

  String get dbValue {
    switch (this) {
      case LeaveType.paidLeave:
        return 'paid_leave';
      case LeaveType.halfDayAm:
        return 'half_day_am';
      case LeaveType.halfDayPm:
        return 'half_day_pm';
      case LeaveType.sickLeave:
        return 'sick_leave';
      case LeaveType.specialLeave:
        return 'special_leave';
    }
  }

  String get label {
    switch (this) {
      case LeaveType.paidLeave:
        return '全日休';
      case LeaveType.halfDayAm:
        return '午前半休';
      case LeaveType.halfDayPm:
        return '午後半休';
      case LeaveType.sickLeave:
        return '病欠';
      case LeaveType.specialLeave:
        return '特別休暇';
    }
  }

  double get days {
    switch (this) {
      case LeaveType.paidLeave:
      case LeaveType.sickLeave:
      case LeaveType.specialLeave:
        return 1.0;
      case LeaveType.halfDayAm:
      case LeaveType.halfDayPm:
        return 0.5;
    }
  }

  static LeaveType fromString(String value) {
    switch (value) {
      case 'half_day_am':
        return LeaveType.halfDayAm;
      case 'half_day_pm':
        return LeaveType.halfDayPm;
      case 'sick_leave':
        return LeaveType.sickLeave;
      case 'special_leave':
        return LeaveType.specialLeave;
      default:
        return LeaveType.paidLeave;
    }
  }
}

/// ワークフロー申請モデル
class WorkflowRequest {
  const WorkflowRequest({
    required this.id,
    required this.organizationId,
    required this.userId,
    required this.requestType,
    required this.status,
    required this.requestData,
    required this.reason,
    this.reviewedBy,
    this.reviewedAt,
    this.reviewComment,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String organizationId;
  final String userId;
  final WorkflowRequestType requestType;
  final WorkflowRequestStatus status;
  final Map<String, dynamic> requestData;
  final String reason;
  final String? reviewedBy;
  final DateTime? reviewedAt;
  final String? reviewComment;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory WorkflowRequest.fromJson(Map<String, dynamic> json) {
    return WorkflowRequest(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      userId: json['user_id'] as String,
      requestType: WorkflowRequestType.fromString(
        json['request_type'] as String,
      ),
      status: WorkflowRequestStatus.fromString(json['status'] as String),
      requestData: (json['request_data'] as Map<String, dynamic>?) ?? {},
      reason: json['reason'] as String,
      reviewedBy: json['reviewed_by'] as String?,
      reviewedAt: json['reviewed_at'] != null
          ? DateTime.parse(json['reviewed_at'] as String)
          : null,
      reviewComment: json['review_comment'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  /// 有給: 開始日
  String? get startDate => requestData['start_date'] as String?;

  /// 有給: 終了日
  String? get endDate => requestData['end_date'] as String?;

  /// 有給: 日数
  double? get leaveDays => (requestData['days'] as num?)?.toDouble();

  /// 有給: 休暇種別
  String? get leaveType => requestData['leave_type'] as String?;

  /// 残業: 日付
  String? get overtimeDate => requestData['date'] as String?;

  /// 残業: 予定時間
  int? get estimatedHours => requestData['estimated_hours'] as int?;

  /// 出張: 行先
  String? get destination => requestData['destination'] as String?;

  /// 出張: 目的
  String? get purpose => requestData['purpose'] as String?;

  /// 経費: カテゴリ
  String? get expenseCategory => requestData['category'] as String?;

  /// 経費: 金額
  int? get expenseAmount => requestData['amount'] as int?;

  /// 申請概要（リスト表示用）
  String get summary {
    switch (requestType) {
      case WorkflowRequestType.paidLeave:
        final lt = leaveType != null
            ? LeaveType.fromString(leaveType!).label
            : '';
        return '$lt ${startDate ?? ''}'
            '${endDate != null && endDate != startDate ? ' 〜 $endDate' : ''}';
      case WorkflowRequestType.overtime:
        return '${overtimeDate ?? ''} ${estimatedHours ?? 0}時間';
      case WorkflowRequestType.businessTrip:
        return '${destination ?? ''} ${startDate ?? ''}'
            '${endDate != null && endDate != startDate ? ' 〜 $endDate' : ''}';
      case WorkflowRequestType.expense:
        final cat = expenseCategory ?? '';
        return '$cat ¥${expenseAmount ?? 0}';
    }
  }
}
