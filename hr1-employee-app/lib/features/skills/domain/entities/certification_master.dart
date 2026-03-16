/// 資格マスタエンティティ
class CertificationMaster {
  const CertificationMaster({
    required this.id,
    this.organizationId,
    required this.name,
    this.category,
  });

  final String id;
  final String? organizationId;
  final String name;
  final String? category;

  factory CertificationMaster.fromJson(Map<String, dynamic> json) {
    return CertificationMaster(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String?,
      name: json['name'] as String,
      category: json['category'] as String?,
    );
  }
}
