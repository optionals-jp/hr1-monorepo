/// 企業（組織）モデル
class Organization {
  const Organization({
    required this.id,
    required this.name,
    this.logoUrl,
    this.industry,
  });

  /// 企業ID
  final String id;

  /// 企業名
  final String name;

  /// ロゴ画像URL（任意）
  final String? logoUrl;

  /// 業種（任意）
  final String? industry;

  /// JSONからの生成
  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String,
      name: json['name'] as String,
      logoUrl: json['logo_url'] as String?,
      industry: json['industry'] as String?,
    );
  }

  /// JSONへの変換
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'logo_url': logoUrl,
      'industry': industry,
    };
  }
}
