/// 企業（組織）モデル
class Organization {
  const Organization({
    required this.id,
    required this.name,
    this.logoUrl,
    this.industry,
    this.description,
    this.mission,
    this.employeeCount,
    this.foundedYear,
    this.location,
    this.websiteUrl,
    this.benefits = const [],
    this.culture = const [],
  });

  /// 企業ID
  final String id;

  /// 企業名
  final String name;

  /// ロゴ画像URL（任意）
  final String? logoUrl;

  /// 業種（任意）
  final String? industry;

  /// 企業概要
  final String? description;

  /// ミッション・ビジョン
  final String? mission;

  /// 従業員数
  final String? employeeCount;

  /// 設立年
  final int? foundedYear;

  /// 所在地
  final String? location;

  /// Webサイト
  final String? websiteUrl;

  /// 福利厚生
  final List<String> benefits;

  /// カルチャー・特徴
  final List<String> culture;

  /// JSONからの生成
  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String,
      name: json['name'] as String,
      logoUrl: json['logo_url'] as String?,
      industry: json['industry'] as String?,
      description: json['description'] as String?,
      mission: json['mission'] as String?,
      employeeCount: json['employee_count'] as String?,
      foundedYear: json['founded_year'] as int?,
      location: json['location'] as String?,
      websiteUrl: json['website_url'] as String?,
      benefits:
          (json['benefits'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      culture:
          (json['culture'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  /// JSONへの変換
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'logo_url': logoUrl,
      'industry': industry,
      'description': description,
      'mission': mission,
      'employee_count': employeeCount,
      'founded_year': foundedYear,
      'location': location,
      'website_url': websiteUrl,
      'benefits': benefits,
      'culture': culture,
    };
  }
}
