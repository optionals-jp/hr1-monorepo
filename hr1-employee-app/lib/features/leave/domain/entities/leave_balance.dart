/// 有給・休暇残日数モデル
class LeaveBalance {
  const LeaveBalance({
    required this.id,
    required this.organizationId,
    required this.userId,
    required this.fiscalYear,
    required this.grantedDays,
    required this.usedDays,
    required this.carriedOverDays,
    required this.expiredDays,
    required this.grantDate,
    required this.expiryDate,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String organizationId;
  final String userId;
  final int fiscalYear;
  final double grantedDays;
  final double usedDays;
  final double carriedOverDays;
  final double expiredDays;
  final String grantDate;
  final String expiryDate;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  /// 残日数
  double get remainingDays =>
      grantedDays + carriedOverDays - usedDays - expiredDays;

  /// 消化率（%）
  double get usageRate {
    final total = grantedDays + carriedOverDays;
    if (total == 0) return 0;
    return (usedDays / total) * 100;
  }

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    return LeaveBalance(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      userId: json['user_id'] as String,
      fiscalYear: json['fiscal_year'] as int,
      grantedDays: (json['granted_days'] as num).toDouble(),
      usedDays: (json['used_days'] as num).toDouble(),
      carriedOverDays: (json['carried_over_days'] as num).toDouble(),
      expiredDays: (json['expired_days'] as num).toDouble(),
      grantDate: json['grant_date'] as String,
      expiryDate: json['expiry_date'] as String,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }
}
