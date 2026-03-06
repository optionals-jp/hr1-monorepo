/// 社員アプリユーザーモデル
/// 認証ユーザーに紐づくHR1固有のプロフィール情報
class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.organizationId,
    required this.organizationName,
    this.displayName,
    this.avatarUrl,
    this.department,
    this.position,
  });

  /// ユーザーID（Supabase Auth UID）
  final String id;

  /// メールアドレス
  final String email;

  /// 所属企業ID
  final String organizationId;

  /// 所属企業名
  final String organizationName;

  /// 表示名（任意）
  final String? displayName;

  /// アバター画像URL（任意）
  final String? avatarUrl;

  /// 部署（任意）
  final String? department;

  /// 役職（任意）
  final String? position;

  /// JSONからの生成
  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String,
      email: json['email'] as String,
      organizationId: json['organization_id'] as String,
      organizationName: json['organization_name'] as String,
      displayName: json['display_name'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      department: json['department'] as String?,
      position: json['position'] as String?,
    );
  }
}
