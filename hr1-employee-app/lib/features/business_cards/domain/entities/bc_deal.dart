import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';

/// 商談ステータス
enum DealStatus {
  open('商談中'),
  won('受注'),
  lost('失注');

  const DealStatus(this.label);
  final String label;

  static DealStatus fromString(String value) {
    return DealStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => DealStatus.open,
    );
  }
}

/// 商談ステージ
enum DealStage {
  initial('初回接触'),
  proposal('提案'),
  negotiation('交渉'),
  closing('クロージング');

  const DealStage(this.label);
  final String label;

  static DealStage fromString(String value) {
    return DealStage.values.firstWhere(
      (e) => e.name == value,
      orElse: () => DealStage.initial,
    );
  }
}

/// 商談
class BcDeal {
  const BcDeal({
    required this.id,
    required this.organizationId,
    this.companyId,
    this.contactId,
    required this.title,
    this.amount,
    this.status = DealStatus.open,
    this.stage = DealStage.initial,
    this.expectedCloseDate,
    this.description,
    this.assignedTo,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.company,
    this.contact,
  });

  final String id;
  final String organizationId;
  final String? companyId;
  final String? contactId;
  final String title;
  final int? amount;
  final DealStatus status;
  final DealStage stage;
  final DateTime? expectedCloseDate;
  final String? description;
  final String? assignedTo;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final BcCompany? company;
  final BcContact? contact;

  factory BcDeal.fromJson(Map<String, dynamic> json) {
    return BcDeal(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      companyId: json['company_id'] as String?,
      contactId: json['contact_id'] as String?,
      title: json['title'] as String,
      amount: json['amount'] as int?,
      status: DealStatus.fromString(json['status'] as String? ?? 'open'),
      stage: DealStage.fromString(json['stage'] as String? ?? 'initial'),
      expectedCloseDate: json['expected_close_date'] != null
          ? DateTime.parse(json['expected_close_date'] as String)
          : null,
      description: json['description'] as String?,
      assignedTo: json['assigned_to'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      company: json['bc_companies'] != null
          ? BcCompany.fromJson(json['bc_companies'] as Map<String, dynamic>)
          : null,
      contact: json['bc_contacts'] != null
          ? BcContact.fromJson(json['bc_contacts'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'amount': amount,
      'status': status.name,
      'stage': stage.name,
      'expected_close_date': expectedCloseDate
          ?.toIso8601String()
          .split('T')
          .first,
      'description': description,
      'company_id': companyId,
      'contact_id': contactId,
      'assigned_to': assignedTo,
    };
  }

  BcDeal copyWith({
    String? id,
    String? organizationId,
    String? companyId,
    String? contactId,
    String? title,
    int? amount,
    DealStatus? status,
    DealStage? stage,
    DateTime? expectedCloseDate,
    String? description,
    String? assignedTo,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    BcCompany? company,
    BcContact? contact,
  }) {
    return BcDeal(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      companyId: companyId ?? this.companyId,
      contactId: contactId ?? this.contactId,
      title: title ?? this.title,
      amount: amount ?? this.amount,
      status: status ?? this.status,
      stage: stage ?? this.stage,
      expectedCloseDate: expectedCloseDate ?? this.expectedCloseDate,
      description: description ?? this.description,
      assignedTo: assignedTo ?? this.assignedTo,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      company: company ?? this.company,
      contact: contact ?? this.contact,
    );
  }
}
