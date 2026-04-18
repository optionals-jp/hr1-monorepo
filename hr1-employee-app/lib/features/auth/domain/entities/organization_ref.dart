/// ユーザーが所属する組織の参照情報
class OrganizationRef {
  const OrganizationRef({required this.id, required this.name});

  final String id;
  final String name;

  factory OrganizationRef.fromJson(Map<String, dynamic> json) {
    return OrganizationRef(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name};
}
