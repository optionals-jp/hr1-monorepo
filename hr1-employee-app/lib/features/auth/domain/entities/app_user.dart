import 'package:hr1_employee_app/features/auth/domain/entities/organization_ref.dart';

/// 社員アプリユーザーモデル
/// 認証ユーザーに紐づくHR1固有のプロフィール情報
class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.organizations,
    required this.activeOrganizationId,
    this.role = 'employee',
    this.displayName,
    this.avatarUrl,
    this.department,
    this.position,
  });

  /// ユーザーID（Supabase Auth UID）
  final String id;

  /// メールアドレス
  final String email;

  /// ユーザーが所属する全組織
  final List<OrganizationRef> organizations;

  /// 現在アクティブな組織ID（organizations に必ず含まれる）
  final String activeOrganizationId;

  /// ロール（admin / employee / applicant）
  final String role;

  /// 表示名（任意）
  final String? displayName;

  /// アバター画像URL（任意）
  final String? avatarUrl;

  /// 部署（任意）
  final String? department;

  /// 役職（任意）
  final String? position;

  /// 現在アクティブな組織の参照
  OrganizationRef get activeOrganization {
    return organizations.firstWhere(
      (o) => o.id == activeOrganizationId,
      orElse: () => throw StateError(
        'activeOrganizationId "$activeOrganizationId" は organizations に存在しません',
      ),
    );
  }

  /// 現在アクティブな組織名
  String get activeOrganizationName => activeOrganization.name;

  /// 新しい activeOrganizationId で置き換えた AppUser を返す
  AppUser copyWithActiveOrganization(String newActiveOrganizationId) {
    return AppUser(
      id: id,
      email: email,
      organizations: organizations,
      activeOrganizationId: newActiveOrganizationId,
      role: role,
      displayName: displayName,
      avatarUrl: avatarUrl,
      department: department,
      position: position,
    );
  }
}
