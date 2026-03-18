import 'organization.dart';
import 'user_role.dart';

/// アプリユーザーモデル
/// 認証ユーザーに紐づくHR1固有のプロフィール情報
class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.role,
    required this.organizations,
    this.displayName,
    this.avatarUrl,
  });

  /// ユーザーID（Supabase Auth UID）
  final String id;

  /// メールアドレス
  final String email;

  /// ロール（応募者 or 社員）
  final UserRole role;

  /// 所属・応募先の企業リスト
  /// - 応募者: エントリー中の複数企業
  /// - 社員: 所属する1社
  final List<Organization> organizations;

  /// 表示名（任意）
  final String? displayName;

  /// アバター画像URL（任意）
  final String? avatarUrl;

  /// 応募者かどうか
  bool get isApplicant => role == UserRole.applicant;

  /// 社員かどうか
  bool get isEmployee => role == UserRole.employee;

  /// 複数企業に関連しているか（応募者で2社以上の場合）
  bool get hasMultipleOrganizations => organizations.length > 1;

  /// JSONからの生成
  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String,
      email: json['email'] as String,
      role: UserRole.values.byName(json['role'] as String),
      organizations:
          (json['organizations'] as List<dynamic>?)
              ?.map((e) => Organization.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      displayName: json['display_name'] as String?,
      avatarUrl: json['avatar_url'] as String?,
    );
  }
}
