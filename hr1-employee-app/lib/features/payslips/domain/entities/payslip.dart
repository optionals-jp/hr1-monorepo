/// 給与明細の項目
class PayslipItem {
  const PayslipItem({required this.label, required this.amount});

  final String label;
  final int amount;

  factory PayslipItem.fromJson(Map<String, dynamic> json) {
    return PayslipItem(
      label: json['label'] as String,
      amount: json['amount'] as int,
    );
  }
}

/// 給与明細モデル
class Payslip {
  const Payslip({
    required this.id,
    required this.organizationId,
    required this.userId,
    required this.year,
    required this.month,
    required this.baseSalary,
    required this.allowances,
    required this.deductions,
    required this.grossPay,
    required this.netPay,
    this.note,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String organizationId;
  final String userId;
  final int year;
  final int month;
  final int baseSalary;
  final List<PayslipItem> allowances;
  final List<PayslipItem> deductions;
  final int grossPay;
  final int netPay;
  final String? note;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  int get totalAllowances =>
      allowances.fold(0, (sum, item) => sum + item.amount);

  int get totalDeductions =>
      deductions.fold(0, (sum, item) => sum + item.amount);

  /// 月表示用 (例: "2026年4月")
  String get monthLabel => '$year年$month月';

  factory Payslip.fromJson(Map<String, dynamic> json) {
    return Payslip(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      userId: json['user_id'] as String,
      year: json['year'] as int,
      month: json['month'] as int,
      baseSalary: json['base_salary'] as int? ?? 0,
      allowances:
          (json['allowances'] as List<dynamic>?)
              ?.map((e) => PayslipItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      deductions:
          (json['deductions'] as List<dynamic>?)
              ?.map((e) => PayslipItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      grossPay: json['gross_pay'] as int? ?? 0,
      netPay: json['net_pay'] as int? ?? 0,
      note: json['note'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }
}
