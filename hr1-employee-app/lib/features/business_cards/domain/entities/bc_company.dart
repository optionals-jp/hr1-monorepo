/// 取引先企業
class BcCompany {
  const BcCompany({
    required this.id,
    required this.organizationId,
    required this.name,
    this.nameKana,
    this.corporateNumber,
    this.postalCode,
    this.address,
    this.phone,
    this.website,
    this.industry,
    this.notes,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String organizationId;
  final String name;
  final String? nameKana;
  final String? corporateNumber;
  final String? postalCode;
  final String? address;
  final String? phone;
  final String? website;
  final String? industry;
  final String? notes;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory BcCompany.fromJson(Map<String, dynamic> json) {
    return BcCompany(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      name: json['name'] as String,
      nameKana: json['name_kana'] as String?,
      corporateNumber: json['corporate_number'] as String?,
      postalCode: json['postal_code'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      website: json['website'] as String?,
      industry: json['industry'] as String?,
      notes: json['notes'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'name_kana': nameKana,
      'corporate_number': corporateNumber,
      'postal_code': postalCode,
      'address': address,
      'phone': phone,
      'website': website,
      'industry': industry,
      'notes': notes,
    };
  }

  BcCompany copyWith({
    String? id,
    String? organizationId,
    String? name,
    String? nameKana,
    String? corporateNumber,
    String? postalCode,
    String? address,
    String? phone,
    String? website,
    String? industry,
    String? notes,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BcCompany(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      name: name ?? this.name,
      nameKana: nameKana ?? this.nameKana,
      corporateNumber: corporateNumber ?? this.corporateNumber,
      postalCode: postalCode ?? this.postalCode,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      website: website ?? this.website,
      industry: industry ?? this.industry,
      notes: notes ?? this.notes,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
