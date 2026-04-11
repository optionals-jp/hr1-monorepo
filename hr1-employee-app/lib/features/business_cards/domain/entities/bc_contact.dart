import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';

/// 名刺連絡先
class BcContact {
  const BcContact({
    required this.id,
    required this.organizationId,
    this.companyId,
    required this.lastName,
    this.firstName,
    this.lastNameKana,
    this.firstNameKana,
    this.department,
    this.position,
    this.email,
    this.phone,
    this.mobilePhone,
    this.notes,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.company,
  });

  final String id;
  final String organizationId;
  final String? companyId;
  final String lastName;
  final String? firstName;
  final String? lastNameKana;
  final String? firstNameKana;
  final String? department;
  final String? position;
  final String? email;
  final String? phone;
  final String? mobilePhone;
  final String? notes;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final BcCompany? company;

  /// フルネーム
  String get fullName {
    if (firstName != null && firstName!.isNotEmpty) {
      return '$lastName $firstName';
    }
    return lastName;
  }

  /// フルネーム（カナ）
  String? get fullNameKana {
    if (lastNameKana == null) return null;
    if (firstNameKana != null && firstNameKana!.isNotEmpty) {
      return '$lastNameKana $firstNameKana';
    }
    return lastNameKana;
  }

  factory BcContact.fromJson(Map<String, dynamic> json) {
    return BcContact(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      companyId: json['company_id'] as String?,
      lastName: json['last_name'] as String,
      firstName: json['first_name'] as String?,
      lastNameKana: json['last_name_kana'] as String?,
      firstNameKana: json['first_name_kana'] as String?,
      department: json['department'] as String?,
      position: json['position'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      mobilePhone: json['mobile_phone'] as String?,
      notes: json['notes'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      company: json['crm_companies'] != null
          ? BcCompany.fromJson(json['crm_companies'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'last_name': lastName,
      'first_name': firstName,
      'last_name_kana': lastNameKana,
      'first_name_kana': firstNameKana,
      'department': department,
      'position': position,
      'email': email,
      'phone': phone,
      'mobile_phone': mobilePhone,
      'notes': notes,
      'company_id': companyId,
    };
  }

  BcContact copyWith({
    String? id,
    String? organizationId,
    String? companyId,
    String? lastName,
    String? firstName,
    String? lastNameKana,
    String? firstNameKana,
    String? department,
    String? position,
    String? email,
    String? phone,
    String? mobilePhone,
    String? notes,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    BcCompany? company,
  }) {
    return BcContact(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      companyId: companyId ?? this.companyId,
      lastName: lastName ?? this.lastName,
      firstName: firstName ?? this.firstName,
      lastNameKana: lastNameKana ?? this.lastNameKana,
      firstNameKana: firstNameKana ?? this.firstNameKana,
      department: department ?? this.department,
      position: position ?? this.position,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      mobilePhone: mobilePhone ?? this.mobilePhone,
      notes: notes ?? this.notes,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      company: company ?? this.company,
    );
  }
}
